import { NextRequest, NextResponse } from "next/server";

import offlinePrisma from "@/lib/oflinePrisma";

export async function POST(req: NextRequest) {
    const { warehouseId } = await req.json()

    try {
        const purchases = await offlinePrisma.purchase.findMany({
            where: {
                warehousesId: warehouseId,isDeleted:false
            },
            include: {
                purchaseItem: true,
                Supplier: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json(purchases)
    } catch (error) {
        console.log(error)
        return NextResponse.json(error, { status: 500 })
    }
}