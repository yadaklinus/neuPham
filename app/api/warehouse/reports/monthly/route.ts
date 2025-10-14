import { NextRequest, NextResponse } from "next/server";

import offlinePrisma from "@/lib/oflinePrisma";
// Assuming this correctly initializes your Prisma client

export async function POST(req: NextRequest) {
  try {
    const { warehouseId, month, year, reportType = "all" } = await req.json();

    if (!warehouseId || !month || !year) {
      return NextResponse.json(
        { error: "Warehouse ID, month, and year are required" },
        { status: 400 }
      );
    }

    // Find warehouse by its unique code or ID
    const warehouse = await offlinePrisma.warehouses.findFirst({
      where: {
        OR: [
          { warehouseCode: warehouseId, isDeleted: false },
          { id: warehouseId, isDeleted: false },
        ],
      },
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    const reportData: any = {
      warehouse: {
        id: warehouse.id,
        warehouseCode: warehouse.warehouseCode,
        name: warehouse.name,
      },
      period: {
        month: parseInt(month),
        year: parseInt(year),
        startDate,
        endDate,
      },
    };

    // --- Get inventory data ---
    if (reportType === "all" || reportType === "inventory") {
      // FIX: Correct model name from 'products' to 'Product'
      // FIX: Correct field name from 'warehousesId' to 'warehousesId'
      const products = await offlinePrisma.product.findMany({
        where: {
          warehousesId: warehouse.warehouseCode,
          isDeleted: false,
        },
        orderBy: {
          name: "asc",
        },
      });

      const inventorySummary = {
        totalProducts: products.length,
        totalStockValue: products.reduce(
          (sum:any, p:any) => sum + p.quantity * p.cost,
          0
        ),
        lowStockItems: products.filter((p:any) => p.quantity <= 10).length,
        outOfStockItems: products.filter((p:any) => p.quantity === 0).length,
        products: products.map((p:any) => ({
          id: p.id,
          name: p.name,
          barcode: p.barcode,
          quantity: p.quantity,
          unit: p.unit,
          cost: p.cost,
          wholesalePrice: p.wholeSalePrice,
          retailPrice: p.retailPrice,
          stockValue: p.quantity * p.cost,
          status:
            p.quantity === 0
              ? "Out of Stock"
              : p.quantity <= 10
              ? "Low Stock"
              : "In Stock",
        })),
      };

      reportData.inventory = inventorySummary;
    }

    // --- Get sales data ---
    if (reportType === "all" || reportType === "sales") {
      // FIX: Correct model name from 'sale' to 'Sale'
      // FIX: Correct field name from 'warehousesId' to 'warehousesId'
      // FIX: Correct relation names from 'product' to 'Product' and 'selectedCustomer' to 'Customer'
      const sales = await offlinePrisma.consultation.findMany({
        where: {
          warehousesId: warehouse.warehouseCode,
          isDeleted: false,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          consultationItems: {
            include: {
              product: true, // Corrected relation name
            },
          },
          selectedStudent: true, // Corrected relation name
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const salesSummary = {
        totalSales: sales.length,
        totalRevenue: sales.reduce((sum:any, s) => sum + (s.grandTotal || 0), 0),
        totalItemsSold: sales.reduce(
          (sum, s) =>
            sum +
            s.consultationItems.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0),
          0
        ),
        averageOrderValue:
          sales.length > 0
            ? sales.reduce((sum, s) => sum + (s.grandTotal || 0), 0) / sales.length
            : 0,
        completedPayments: sales.filter((s) => s.balance === 0).length,
        pendingPayments: sales.filter((s) => s.balance > 0).length,
        sales: sales.map((s) => ({
          id: s.id,
          invoiceNo: s.invoiceNo,
          date: s.createdAt,
          // FIX: Use corrected relation name 'Customer'
          customer: s.selectedStudent?.name || "Walk-in Customer",
          items: s.consultationItems.length,
          total: s.grandTotal,
          balance: s.balance,
          status:
            s.balance === 0
              ? "Paid"
              : s.balance === s.grandTotal
              ? "Unpaid"
              : "Partial",
        })),
      };

      reportData.sales = salesSummary;

      // --- Get daily sales breakdown (LOGIC IMPROVEMENT) ---
      // Re-uses the 'sales' data already fetched to avoid another database call.
      const dailySalesMap = new Map<string, { revenue: number; orders: number }>();
      sales.forEach((sale) => {
        const date = sale.createdAt.toISOString().split("T")[0]; // Group by day
        const dayData = dailySalesMap.get(date) || { revenue: 0, orders: 0 };
        dayData.revenue += sale.grandTotal;
        dayData.orders += 1;
        dailySalesMap.set(date, dayData);
      });

      reportData.dailySales = Array.from(dailySalesMap.entries()).map(([date, data]) => ({
        date,
        ...data,
      }));


      // --- Get top selling products ---
      // FIX: Correct model name from 'saleItems' to 'SaleItem'
      // FIX: Correct relation name from 'sale' to 'Sale'
      // FIX: Correct field name from 'productId' to 'productId'
      // FIX: Correct field name in where clause to 'warehousesId'
      // FIX: Sum 'total' for revenue instead of 'price'
      const topProducts = await offlinePrisma.consultationItem.groupBy({
        by: ["productId"],
        where: {
          consultation: {
            warehousesId: warehouse.warehouseCode,
            isDeleted: false,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          productId: {
            not: null // Ensure we don't group null product IDs
          }
        },
        _sum: {
          quantity: true,
          total: true, // Correctly sum the total from each sale item
        },
        orderBy: {
          _sum: {
            quantity: "desc",
          },
        },
        take: 10,
      });

      const topProductsWithDetails = await Promise.all(
        topProducts.map(async (item:any) => {
          // FIX: Use correct model name 'Product'
          const product = await offlinePrisma.product.findUnique({
            where: { id: item.productId! }, // item.productId is what we grouped by
          });
          return {
            productId: item.productId,
            productName: product?.name || "Unknown Product",
            quantity: item._sum.quantity || 0,
            revenue: item._sum.total || 0, // LOGIC FIX: Revenue is the sum of totals
          };
        })
      );

      reportData.topProducts = topProductsWithDetails;
    }

    return NextResponse.json(reportData, { status: 200 });
  } catch (error) {
    console.error("Error generating monthly report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    // It's generally not recommended to manually disconnect in serverless environments
    // like Next.js API routes, as it can affect connection pooling.
    // await offlinePrisma.$disconnect();
  }
}