import { NextRequest, NextResponse } from "next/server";

import offlinePrisma from "@/lib/oflinePrisma";

export async function DELETE(req: NextRequest) {
    try {
        const { invoiceNo } = await req.json()

        if (!invoiceNo) {
            return NextResponse.json({ error: "Invoice number is required" }, { status: 400 })
        }

        // First, get the sale and its items
        const sale = await offlinePrisma.sale.findUnique({
            where: { invoiceNo,isDeleted:false },
            include: {
                saleItems: true,
                paymentMethod: true
            }
        })

        if (!sale) {
            return NextResponse.json({ error: "Sale not found" }, { status: 404 })
        }

        // Return products back to stock
        for (const item of sale.saleItems) {
            if (item.productId) {
                await offlinePrisma.product.update({
                    where: { id: item.productId,isDeleted:false },
                    data: {
                        quantity: {
                            increment: item.quantity
                        },
                        sync:false
                    }
                })
            }
        }

        // Delete payment methods
        await offlinePrisma.paymentMethod.updateMany({
            where: { saleId: invoiceNo },
            data:{isDeleted:true,sync:false}
        })

        // Delete sale items
        await offlinePrisma.saleItem.updateMany({
            where: { saleId: invoiceNo },
            data:{isDeleted:true,sync:false}
        })

        // Delete the sale
        await offlinePrisma.sale.update({
            where: { invoiceNo },
            data:{isDeleted:true,sync:false}
        })

        return NextResponse.json({ 
            message: "Sale deleted successfully and products returned to stock" 
        })

    } catch (error) {
        console.error("Error deleting sale:", error)
        return NextResponse.json({ error: "Failed to delete sale" }, { status: 500 })
    }
}
