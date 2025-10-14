import { NextResponse } from "next/server";

import offlinePrisma from "@/lib/oflinePrisma";

export async function GET() {
  try {
    // Fetch dashboard statistics from the database
    const [
      totalUsers,
      totalWarehouses,
      totalProducts,
      totalSales,
      totalCustomers,
      recentSales
    ] = await Promise.all([
      offlinePrisma.users.count({where:{isDeleted:false}}),
      offlinePrisma.warehouses.count({where:{isDeleted:false}}),
      offlinePrisma.product.count({where:{isDeleted:false}}),
      offlinePrisma.consultation.count({where:{isDeleted:false}}),
      offlinePrisma.student.count({where:{isDeleted:false}}),
      offlinePrisma.consultation.findMany({
        where:{isDeleted:false},
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          selectedStudent:true,
          consultationItems: {
            include: {
              product: true
            }
          }
        }
      })
    ])

    // Calculate total sales amount
    const totalSalesAmount = await offlinePrisma.consultation.aggregate({
      where:{isDeleted:false},
      _sum: {
        grandTotal: true
      }
    })

    // Calculate total revenue and profit
    const totalRevenue = totalSalesAmount._sum.grandTotal || 0

    return NextResponse.json({
      totalUsers,
      totalWarehouses,
      totalProducts,
      totalSales,
      totalCustomers,
      totalRevenue,
      recentSales: recentSales.map((sale:any) => ({
        id: sale.invoiceNo,
        customer: sale?.Customer,
        amount: sale?.grandTotal,
        date: sale.createdAt.toISOString(),
        items: sale?.saleItems?.length,
        products: sale?.saleItems?.map((item:any) => item.productName).join(', ')
      }))
    })
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    )
  }
}