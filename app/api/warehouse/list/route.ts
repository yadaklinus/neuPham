import { NextRequest, NextResponse } from "next/server";

import offlinePrisma from "@/lib/oflinePrisma";

export async function POST(
  req:NextRequest
) {
  try {
    const { id } = await req.json()

    // Try to find warehouse by warehouseCode first (as used in navigation)
    // If not found, try by id
    let warehouse = await offlinePrisma.warehouses.findUnique({
      where: {
        warehouseCode: id,isDeleted:false
      },
      include: {
        users: true,
        products: true,
        student:true,
        consultation: {
          include: {
            consultationItems: true
          }
        }
      }
    });

    // If not found by code, try by id
    if (!warehouse) {
      warehouse = await offlinePrisma.warehouses.findUnique({
        where: {
          id: id,isDeleted:false
        },
        include: {
          users: true,
          products: true,
          student:true,
          consultation: {
            include: {
              consultationItems: true,
              
            }
          }
        }
      });
    }

    if (!warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }

    // Calculate additional statistics
    const totalProducts = warehouse.products.length;
    const totalStudents = warehouse.student.length;
    const totalSales = warehouse.consultation.reduce((sum, sale) => sum + (sale.grandTotal || 0), 0);
    const totalOrders = warehouse.consultation.length;
    const assignedUsers = warehouse.users.length;

    const response = {
      ...warehouse,
      stats: {
        totalProducts,
        totalSales,
        totalOrders,
        totalStudents,
        assignedUsers
      }
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error fetching warehouse:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await offlinePrisma.$disconnect();
  }
}