import { PrismaClient } from "@/prisma/generated/online";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  try {
    const { warehouseId, productId, action, quantity, staffId, reason, patientId } = await req.json()

    // Verify warehouse exists
    const warehouse = await prisma.warehouses_online.findUnique({
      where: { warehouseCode: warehouseId, isDeleted: false }
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: 'Clinic not found' },
        { status: 404 }
      );
    }

    // Verify product exists
    const product = await prisma.product_online.findUnique({
      where: { id: productId, isDeleted: false }
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Medicine not found' },
        { status: 404 }
      );
    }

    // Create drug tracking record for anti-theft monitoring
    const trackingRecord = await prisma.stockTracking_online.create({
      data: {
        productId,
        warehouseId: warehouse.id,
        action, // 'dispensed', 'received', 'adjusted', 'transferred'
        quantity,
        previousStock: product.quantity,
        newStock: action === 'dispensed' ? product.quantity - quantity : product.quantity + quantity,
        staffId,
        reason: reason || `Medicine ${action}`,
        patientId: patientId || null,
        timestamp: new Date(),
        ipAddress:'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown'
      }
    });

    // Update product quantity if action affects stock
    if (action === 'dispensed') {
      if (product.quantity < quantity) {
        return NextResponse.json(
          { error: 'Insufficient stock available' },
          { status: 400 }
        );
      }
      
      await prisma.product_online.update({
        where: { id: productId },
        data: { 
          quantity: { decrement: quantity },
          //lastDispensed: new Date(),
          sync: false
        }
      });
    } else if (action === 'received') {
      await prisma.product_online.update({
        where: { id: productId },
        data: { 
          quantity: { increment: quantity },
          //lastReceived: new Date(),
          sync: false
        }
      });
    }

    // Check for suspicious activity (anti-theft feature)
    const recentActivity = await prisma.stockTracking_online.findMany({
      where: {
        productId,
        staffId,
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    const totalDispensedToday = recentActivity
      .filter(record => record.action === 'dispensed')
      .reduce((sum, record) => sum + record.quantity, 0);

    // Flag suspicious activity if more than 50 units dispensed by same staff in 24h
    if (action === 'dispensed' && totalDispensedToday > 50) {
      await prisma.suspiciousActivity_online.create({
        data: {
          staffId,
          productId,
          warehouseId: warehouse.id,
          activityType: 'excessive_dispensing',
          description: `Staff member dispensed ${totalDispensedToday} units of ${product.name} in 24 hours`,
          severity: 'high',
          timestamp: new Date()
        }
      });
    }

    return NextResponse.json({
      success: true,
      trackingRecord,
      currentStock: action === 'dispensed' ? product.quantity - quantity : product.quantity + quantity,
      message: `Medicine ${action} successfully tracked`
    });

  } catch (error) {
    console.error('Drug tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track drug movement' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get('warehouseId');
    const productId = searchParams.get('productId');
    const staffId = searchParams.get('staffId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    if (!warehouseId) {
      return NextResponse.json(
        { error: 'Warehouse ID is required' },
        { status: 400 }
      );
    }

    // Build where clause
    const whereClause: any = {
      warehouse: {
        warehouseCode: warehouseId,
        isDeleted: false
      }
    };

    if (productId) {
      whereClause.productId = productId;
    }

    if (staffId) {
      whereClause.staffId = staffId;
    }

    // Get tracking records with pagination
    const [trackingRecords, totalCount] = await Promise.all([
      prisma.stockTracking_online.findMany({
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
              role: true
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
      prisma.stockTracking_online.count({
        where: whereClause
      })
    ]);

    return NextResponse.json({
      trackingRecords,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Failed to fetch drug tracking records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tracking records' },
      { status: 500 }
    );
  }
}