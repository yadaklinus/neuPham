import { PrismaClient } from "@/prisma/generated/offline";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

// Define interfaces for better type safety
interface RecentConsultation {
  id: string;
  invoiceNo: string;
  selectedStudent: { name: string; matricNumber: string } | null;
  diagnosis: string | null;
  grandTotal: number;
  createdAt: Date;
  paymentMethod: { method: string }[] | null;
  consultationItems: any[];
}

interface LowStockProduct {
    id: string;
    name: string;
    barcode: string;
    quantity: number;
    unit: string;
}

interface TopProduct {
    productId: string;
    productName: string;
    _sum: {
        quantity: number | null;
        total: number | null;
    };
}

interface MonthlyConsultation {
    month: string;
    consultations: number;
    revenue: number;
}

interface UserRole {
    role: string;
    _count: {
        role: number;
    };
}

interface StudentType {
    address: string;
    _count: {
        address: number;
    };
}


export async function POST(req: NextRequest) {
  try {
    const { warehouseId } = await req.json();

    if (!warehouseId) {
        return NextResponse.json({ error: 'Warehouse ID is required' }, { status: 400 });
    }

    // Get warehouse info first
    const warehouse = await prisma.warehouses.findUnique({
      where: { warehouseCode: warehouseId, isDeleted: false },
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }

    // Fetch all warehouse-specific statistics in parallel for better performance
    const [
      totalUsers,
      totalProducts,
      totalConsultations,
      totalStudents,
      totalSuppliers,
      recentConsultations,
      lowStockProducts,
      topProducts,
      consultationsByMonth,
      totalRevenue,
      userRoles,
      studentTypes,
    ] = await Promise.all([
      // Total users in this warehouse
      prisma.users.count({
        where: { warehousesId: warehouseId, isDeleted: false },
      }),
      // Total products in this warehouse
      prisma.product.count({
        where: { warehousesId: warehouseId, isDeleted: false },
      }),
      // Total consultations for this warehouse
      prisma.consultation.count({
        where: { warehousesId: warehouseId, isDeleted: false },
      }),
      // Total students for this warehouse
      prisma.student.count({
        where: { warehousesId: warehouseId, isDeleted: false },
      }),
      // Total suppliers for this warehouse
      prisma.supplier.count({
        where: { warehousesId: warehouseId, isDeleted: false },
      }),
      // Recent consultations for this warehouse
      prisma.consultation.findMany({
        where: { warehousesId: warehouseId, isDeleted: false },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          selectedStudent: true,
          paymentMethod: true,
          consultationItems: {
            include: {
              product: true,
            },
          },
        },
      }),
      // Low stock products (quantity <= 5)
      prisma.product.findMany({
        where: {
          warehousesId: warehouseId,
          isDeleted: false,
          quantity: { lte: 5 },
        },
        take: 10,
        orderBy: { quantity: "asc" },
      }),
      // Top selling products by revenue
      prisma.consultationItem.groupBy({
        by: ["productId", "productName"],
        where: { warehousesId: warehouseId, isDeleted: false },
        _sum: {
          quantity: true,
          total: true,
        },
        orderBy: {
          _sum: {
            total: "desc",
          },
        },
        take: 5,
      }),
      // Consultations by month for the last 6 months using a raw query
      prisma.$queryRaw<MonthlyConsultation[]>`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon') as month,
          COUNT(*)::int as consultations,
          SUM("grandTotal")::float as revenue
        FROM "Consultation" 
        WHERE "warehousesId" = ${warehouseId} AND "isDeleted" = ${false}
          AND "createdAt" >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY DATE_TRUNC('month', "createdAt")
      `,
      // Calculate total revenue for this warehouse
      prisma.consultation.aggregate({
        where: { warehousesId: warehouseId, isDeleted: false },
        _sum: {
          grandTotal: true,
        },
      }),
      // Get user roles distribution for this warehouse
      prisma.users.groupBy({
        by: ["role"],
        where: { warehousesId: warehouseId, isDeleted: false },
        _count: {
          role: true,
        },
      }),
      // Get student types distribution for this warehouse
      prisma.student.groupBy({
        by: ["address"], // Assuming you want to group by address
        where: { warehousesId: warehouseId, isDeleted: false },
        _count: {
          address: true,
        },
      }),
    ]);

    // Calculate average consultation value
    const avgConsultationValue =
      totalConsultations > 0
        ? (totalRevenue._sum.grandTotal || 0) / totalConsultations
        : 0;

    return NextResponse.json({
      warehouse: {
        id: warehouse.id,
        name: warehouse.name,
        code: warehouse.warehouseCode,
        address: warehouse.address,
        email: warehouse.email,
        phone: warehouse.phoneNumber,
      },
      metrics: {
        totalUsers,
        totalProducts,
        totalConsultations,
        totalStudents,
        totalSuppliers,
        totalRevenue: totalRevenue._sum.grandTotal || 0,
        avgConsultationValue,
      },
      recentConsultations: (recentConsultations as RecentConsultation[]).map((consultation) => ({
        id: consultation.id,
        invoiceNo: consultation.invoiceNo,
        studentName: consultation.selectedStudent?.name || "Walk-in Patient",
        studentMatric: consultation.selectedStudent?.matricNumber || "N/A",
        diagnosis: consultation.diagnosis || "General Consultation",
        grandTotal: consultation.grandTotal,
        createdAt: consultation.createdAt,
        paymentMethod: consultation.paymentMethod?.[0]?.method || "cash",
        itemsCount: consultation.consultationItems.length,
      })),
      lowStockProducts: (lowStockProducts as LowStockProduct[]).map((product) => ({
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        quantity: product.quantity,
        unit: product.unit,
        stockAlert: product.quantity <= 5 ? "critical" : "low",
      })),
      topMedicines: (topProducts as TopProduct[]).map((product) => ({
        productId: product.productId,
        name: product.productName,
        totalQuantity: product._sum.quantity || 0,
        revenue: product._sum.total || 0,
      })),
      consultationsByMonth: consultationsByMonth.map((item) => ({
        month: item.month,
        consultations: item.consultations,
        revenue: item.revenue,
      })),
      userRoles: (userRoles as UserRole[]).map((role) => ({
        name: role.role,
        value: role._count.role,
        color:
          role.role === "admin"
            ? "#10b981"
            : role.role === "doctor"
            ? "#3b82f6"
            : role.role === "nurse"
            ? "#f59e0b"
            : "#8b5cf6",
      })),
      studentLocations: (studentTypes as StudentType[]).map((type) => ({
        name: type.address || "Unknown",
        value: type._count.address,
        // Example colors, adjust as needed
        color:
          type.address.length % 3 === 0
            ? "#3b82f6"
            : type.address.length % 3 === 1
            ? "#10b981"
            : "#f59e0b",
      })),
    });
  } catch (error) {
    console.error("Failed to fetch warehouse dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch warehouse dashboard statistics" },
      { status: 500 }
    );
  }
}
