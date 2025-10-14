import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/oflinePrisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get('warehouseId');
    const action = searchParams.get('action') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    if (!warehouseId) {
      return NextResponse.json(
        { error: 'Warehouse ID is required' },
        { status: 400 }
      );
    }

    // Verify warehouse exists
    const warehouse = await prisma.warehouses.findUnique({
      where: { warehouseCode: warehouseId, isDeleted: false }
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: 'Warehouse/Clinic not found' },
        { status: 404 }
      );
    }

    // Build where clause for stock tracking
    const whereClause: any = {
      warehouseId: warehouse.id
    };

    if (action !== 'all') {
      whereClause.action = action;
    }

    // Get stock tracking records with pagination
    const [trackingRecords, totalCount] = await Promise.all([
      prisma.stockTracking.findMany({
        where: whereClause,
        include: {
          product: {
            select: {
              name: true,
              barcode: true,
              unit: true
            }
          },
          staff: {
            select: {
              userName: true,
              role: true,
              email: true
            }
          },
          patient: {
            select: {
              name: true,
              matricNumber: true
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit
      }),
      prisma.stockTracking.count({
        where: whereClause
      })
    ]);

    // Get summary statistics
    const summaryStats = await prisma.stockTracking.groupBy({
      by: ['action'],
      where: {
        warehouseId: warehouse.id,
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      _count: {
        action: true
      },
      _sum: {
        quantity: true
      }
    });

    // Get most active products
    const mostActiveProducts = await prisma.stockTracking.groupBy({
      by: ['productId'],
      where: {
        warehouseId: warehouse.id,
        timestamp: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      _count: {
        productId: true
      },
      orderBy: {
        _count: {
          productId: 'desc'
        }
      },
      take: 10
    });

    // Get product details for most active products
    const productIds = mostActiveProducts.map(p => p.productId);
    const productDetails = await prisma.product.findMany({
      where: {
        id: {
          in: productIds
        }
      },
      select: {
        id: true,
        name: true,
        barcode: true,
        quantity: true
      }
    });

    return NextResponse.json({
      success: true,
      trackingRecords: trackingRecords.map(record => ({
        id: record.id,
        productName: record.product?.name || 'Unknown Product',
        productBarcode: record.product?.barcode || 'N/A',
        action: record.action,
        quantity: record.quantity,
        previousStock: record.previousStock,
        newStock: record.newStock,
        staffName: record.staff?.userName || 'Unknown Staff',
        staffRole: record.staff?.role || 'N/A',
        patientName: record.patient?.name || null,
        patientMatricNumber: record.patient?.matricNumber || null,
        reason: record.reason,
        timestamp: record.timestamp.toISOString(),
        ipAddress: record.ipAddress,
        userAgent: record.userAgent
      })),
      summaryStats: summaryStats.map(stat => ({
        action: stat.action,
        count: stat._count.action,
        totalQuantity: stat._sum.quantity || 0
      })),
      mostActiveProducts: mostActiveProducts.map(product => {
        const details = productDetails.find(p => p.id === product.productId);
        return {
          productId: product.productId,
          productName: details?.name || 'Unknown',
          productBarcode: details?.barcode || 'N/A',
          currentStock: details?.quantity || 0,
          activityCount: product._count.productId
        };
      }),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Drug tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drug tracking data' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { 
      warehouseId, 
      productId, 
      action, 
      quantity, 
      previousStock, 
      newStock, 
      staffId, 
      patientId, 
      reason,
      ipAddress,
      userAgent
    } = await req.json();

    // Verify warehouse exists
    const warehouse = await prisma.warehouses.findUnique({
      where: { warehouseCode: warehouseId, isDeleted: false }
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: 'Warehouse/Clinic not found' },
        { status: 404 }
      );
    }

    // Create stock tracking record
    const trackingRecord = await prisma.stockTracking.create({
      data: {
        productId,
        action,
        quantity,
        previousStock,
        newStock,
        staffId,
        patientId,
        reason,
        warehouseId: warehouse.id,
        ipAddress,
        userAgent,
        timestamp: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      trackingRecord,
      message: 'Stock tracking record created successfully'
    });

  } catch (error) {
    console.error('Failed to create stock tracking record:', error);
    return NextResponse.json(
      { error: 'Failed to create stock tracking record' },
      { status: 500 }
    );
  }
}