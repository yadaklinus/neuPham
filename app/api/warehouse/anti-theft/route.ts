import { PrismaClient } from "@/prisma/generated/online";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get('warehouseId');
    const severity = searchParams.get('severity'); // 'low', 'medium', 'high'
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
    const warehouse = await prisma.warehouses_online.findUnique({
      where: { warehouseCode: warehouseId, isDeleted: false }
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: 'Clinic not found' },
        { status: 404 }
      );
    }

    // Build where clause for suspicious activities
    const whereClause: any = {
      warehouseId: warehouse.id
    };

    if (severity) {
      whereClause.severity = severity;
    }

    // Get suspicious activities with pagination
    const [suspiciousActivities, totalCount] = await Promise.all([
      prisma.suspiciousActivity_online.findMany({
        where: whereClause,
        include: {
          staff: {
            select: {
              userName: true,
              role: true,
              email: true
            }
          },
          product: {
            select: {
              name: true,
              barcode: true,
              unit: true
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit
      }),
      prisma.suspiciousActivity_online.count({
        where: whereClause
      })
    ]);

    // Get stock discrepancies (products with unexplained quantity changes)
    const stockDiscrepancies = await prisma.$queryRaw`
      SELECT 
        p.id,
        p.name,
        p.barcode,
        p.quantity as current_stock,
        COALESCE(SUM(CASE WHEN st.action = 'received' THEN st.quantity ELSE 0 END), 0) as total_received,
        COALESCE(SUM(CASE WHEN st.action = 'dispensed' THEN st.quantity ELSE 0 END), 0) as total_dispensed,
        COALESCE(SUM(CASE WHEN st.action = 'adjusted' THEN st.quantity ELSE 0 END), 0) as total_adjusted
      FROM "Product_online" p
      LEFT JOIN "StockTracking_online" st ON p.id = st."productId"
      WHERE p."warehouses_onlineId" = ${warehouse.id} AND p."isDeleted" = false
      GROUP BY p.id, p.name, p.barcode, p.quantity
      HAVING p.quantity != (
        COALESCE(SUM(CASE WHEN st.action = 'received' THEN st.quantity ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN st.action = 'dispensed' THEN st.quantity ELSE 0 END), 0) +
        COALESCE(SUM(CASE WHEN st.action = 'adjusted' THEN st.quantity ELSE 0 END), 0)
      )
      ORDER BY ABS(p.quantity - (
        COALESCE(SUM(CASE WHEN st.action = 'received' THEN st.quantity ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN st.action = 'dispensed' THEN st.quantity ELSE 0 END), 0) +
        COALESCE(SUM(CASE WHEN st.action = 'adjusted' THEN st.quantity ELSE 0 END), 0)
      )) DESC
      LIMIT 10
    `;

    // Get high-risk staff (staff with multiple suspicious activities)
    const highRiskStaff = await prisma.suspiciousActivity_online.groupBy({
      by: ['staffId'],
      where: {
        warehouseId: warehouse.id,
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      _count: {
        staffId: true
      },
      having: {
        staffId: {
          _count: {
            gt: 2 // More than 2 suspicious activities
          }
        }
      },
      orderBy: {
        _count: {
          staffId: 'desc'
        }
      }
    });

    // Get staff details for high-risk staff
    const staffDetails = await prisma.users_online.findMany({
      where: {
        id: {
          in: highRiskStaff.map(staff => staff.staffId).filter(Boolean)
        }
      },
      select: {
        id: true,
        userName: true,
        role: true,
        email: true
      }
    });

    // Calculate security metrics
    const securityMetrics = {
      totalSuspiciousActivities: totalCount,
      highSeverityCount: await prisma.suspiciousActivity_online.count({
        where: { ...whereClause, severity: 'high' }
      }),
      mediumSeverityCount: await prisma.suspiciousActivity_online.count({
        where: { ...whereClause, severity: 'medium' }
      }),
      lowSeverityCount: await prisma.suspiciousActivity_online.count({
        where: { ...whereClause, severity: 'low' }
      }),
      stockDiscrepanciesCount: Array.isArray(stockDiscrepancies) ? stockDiscrepancies.length : 0,
      highRiskStaffCount: highRiskStaff.length
    };

    return NextResponse.json({
      suspiciousActivities,
      stockDiscrepancies,
      highRiskStaff: highRiskStaff.map(staff => ({
        ...staffDetails.find(s => s.id === staff.staffId),
        suspiciousActivityCount: staff._count.staffId
      })),
      securityMetrics,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Anti-theft monitoring error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch anti-theft data' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { 
      warehouseId, 
      staffId, 
      productId, 
      activityType, 
      description, 
      severity = 'medium' 
    } = await req.json();

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

    // Create suspicious activity record
    const suspiciousActivity = await prisma.suspiciousActivity_online.create({
      data: {
        staffId,
        productId,
        warehouseId: warehouse.id,
        activityType,
        description,
        severity,
        timestamp: new Date(),
        //ipAddress: req.ip || 'unknown',
        //userAgent: req.headers.get('user-agent') || 'unknown'
      }
    });

    // If high severity, create an alert notification
    if (severity === 'high') {
      // Here you could integrate with notification services
      // For now, we'll just log it
      console.log(`HIGH SECURITY ALERT: ${description} at clinic ${warehouseId}`);
    }

    return NextResponse.json({
      success: true,
      suspiciousActivity,
      message: 'Suspicious activity recorded successfully'
    });

  } catch (error) {
    console.error('Failed to record suspicious activity:', error);
    return NextResponse.json(
      { error: 'Failed to record suspicious activity' },
      { status: 500 }
    );
  }
}

// Mark suspicious activity as resolved
export async function PUT(req: NextRequest) {
  try {
    const { activityId, resolution, resolvedBy } = await req.json();

    const updatedActivity = await prisma.suspiciousActivity_online.update({
      where: { id: activityId },
      data: {
        resolved: true,
        resolution,
        resolvedBy,
        resolvedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      updatedActivity,
      message: 'Suspicious activity marked as resolved'
    });

  } catch (error) {
    console.error('Failed to resolve suspicious activity:', error);
    return NextResponse.json(
      { error: 'Failed to resolve suspicious activity' },
      { status: 500 }
    );
  }
}