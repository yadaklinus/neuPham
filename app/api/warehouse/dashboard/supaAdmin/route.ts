import { PrismaClient } from "@/prisma/generated/online";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient()

export async function POST(req:NextRequest) {
  try {
    const { warehouseId } = await req.json()

    //console.log(warehouseId)

    // Get warehouse info first
    const warehouse = await prisma.warehouses_online.findUnique({
      where: { warehouseCode: warehouseId,isDeleted:false }
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: 'Warehouse not found' },
        { status: 404 }
      );
    }

    // Fetch warehouse-specific statistics
    const [
      totalUsers,
      totalProducts,
      totalSales,
      totalCustomers,
      totalSuppliers,
      recentSales,
      lowStockProducts,
      topProducts,
      salesByMonth
    ] = [
      // Total users in this warehouse
      await prisma.users_online.count({
        where: { warehouses_onlineId: warehouseId,isDeleted:false }
      }),
      
      // Total products in this warehouse
      await prisma.product_online.count({
        where: { warehouses_onlineId: warehouseId,isDeleted:false }
      }),
      
      // Total consultations for this clinic
      await prisma.sale_online.count({
        where: { warehouses_onlineId: warehouseId,isDeleted:false }
      }),
      
      // Total students for this clinic
      await prisma.customer_online.count({
        where: { warehouses_onlineId: warehouseId,isDeleted:false }
      }),
      
      // Total suppliers for this warehouse
      await prisma.supplier_online.count({
        where: { warehouses_onlineId: warehouseId,isDeleted:false }
      }),
      
      // Recent consultations for this clinic
      await prisma.sale_online.findMany({
        where: { warehouses_onlineId: warehouseId,isDeleted:false },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          Customer_online: true,
          paymentMethod: true,
          saleItems: {
            include: {
              Product_online: true
            }
          }
        }
      }),
      
      // Low stock medicines (quantity <= 5) - Anti-theft tracking
      await prisma.product_online.findMany({
        where: { 
          warehouses_onlineId: warehouseId,
          isDeleted:false,
          quantity: { lte: 5 }
        },
        take: 10,
        orderBy: { quantity: 'asc' }
      }),
      
      // Most prescribed medicines by quantity
      await prisma.saleItem_online.groupBy({
        by: ['product_onlineId', 'productName'],
        where: { warehouses_onlineId: warehouseId,isDeleted:false },
        _sum: {
          quantity: true,
          total: true
        },
        orderBy: {
          _sum: {
            total: 'desc'
          }
        },
        take: 5
      }),
      
      // Consultations by month for the last 6 months
      await prisma.$queryRaw`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon') as month,
          COUNT(*)::int as consultations,
          SUM("grandTotal")::float as revenue
        FROM "Sale_online" 
        WHERE "warehouses_onlineId" = ${warehouseId} AND "isDeleted" = ${false}
          AND "createdAt" >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY DATE_TRUNC('month', "createdAt")
      `
    // await prisma.$queryRawUnsafe(`
    //     SELECT 
    //       strftime('%Y-%m', "createdAt") AS month,
    //       COUNT(*) AS sales,
    //       SUM("grandTotal") AS revenue
    //     FROM "Sale"
    //     WHERE "warehouses_onlineId" = ?
    //       AND "createdAt" >= datetime('now', '-6 months')
    //     GROUP BY strftime('%Y-%m', "createdAt")
    //     ORDER BY strftime('%Y-%m', "createdAt")
    //   `, warehouseId)


    ];

    // Calculate total revenue for this clinic
    const totalRevenue = await prisma.sale_online.aggregate({
      where: { warehouses_onlineId: warehouseId,isDeleted:false },
      _sum: {
        grandTotal: true
      }
    });

    // Get staff roles distribution for this clinic
    const userRoles = await prisma.users_online.groupBy({
      by: ['role'],
      where: { warehouses_onlineId: warehouseId,isDeleted:false },
      _count: {
        role: true
      }
    });

    // Get student types distribution for this clinic
    const customerTypes = await prisma.customer_online.groupBy({
      by: ['type'],
      where: { warehouses_onlineId: warehouseId,isDeleted:false },
      _count: {
        type: true
      }
    });

    // Calculate average consultation value
    const avgConsultationValue = totalSales > 0 ? (totalRevenue._sum.grandTotal || 0) / totalSales : 0;

    return NextResponse.json({
      warehouse: {
        id: warehouse.id,
        name: warehouse.name,
        code: warehouse.warehouseCode,
        address: warehouse.address,
        email: warehouse.email,
        phone: warehouse.phoneNumber
      },
      metrics: {
        totalUsers,
        totalProducts,
        totalConsultations: totalSales,
        totalStudents: totalCustomers,
        totalSuppliers,
        totalRevenue: totalRevenue._sum.grandTotal || 0,
        avgConsultationValue
      },
      recentConsultations: recentSales.map((sale: any) => ({
        id: sale.id,
        invoiceNo: sale.invoiceNo,
        studentName: sale.Customer_online?.name || 'Walk-in Patient',
        studentMatric: sale.Customer_online?.matricNumber || 'N/A',
        diagnosis: sale.diagnosis || 'General Consultation',
        grandTotal: sale.grandTotal,
        createdAt: sale.createdAt,
        paymentMethod: sale.paymentMethod?.[0]?.method || 'cash',
        itemsCount: sale.saleItems.length
      })),
      lowStockProducts: lowStockProducts.map((product: any) => ({
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        quantity: product.quantity,
        unit: product.unit,
        stockAlert: product.quantity <= 5 ? 'critical' : 'low'
      })),
      topMedicines: topProducts.map((product: any) => ({
        productId: product.product_onlineId,
        name: product.productName,
        prescriptions: product._sum.quantity,
        revenue: product._sum.total
      })),
      consultationsByMonth: (salesByMonth || []).map((item: any) => ({
        month: item.month,
        consultations: item.consultations || item.sales,
        revenue: item.revenue
      })),
      userRoles: userRoles.map((role: any) => ({
        name: role.role,
        value: role._count.role,
        color: role.role === 'admin' ? '#10b981' : role.role === 'doctor' ? '#3b82f6' : role.role === 'nurse' ? '#f59e0b' : '#8b5cf6'
      })),
      studentDepartments: customerTypes.map((type: any) => ({
        name: type.type || 'General',
        value: type._count.type,
        color: type.type === 'undergraduate' ? '#3b82f6' : type.type === 'postgraduate' ? '#10b981' : '#f59e0b'
      }))
    });
  } catch (error) {
    console.error('Failed to fetch warehouse dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch warehouse dashboard statistics' },
      { status: 500 }
    );
  }
}