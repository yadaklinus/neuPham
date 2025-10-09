import { NextRequest, NextResponse } from "next/server";

import offlinePrisma from "@/lib/oflinePrisma";
export async function DELETE(req: NextRequest) {
    try {
        const { referenceNo } = await req.json()

        if (!referenceNo) {
            return NextResponse.json({ error: "Reference number is required" }, { status: 400 })
        }

        // First, get the purchase and its items
        const purchase = await offlinePrisma.purchase.findUnique({
            where: { referenceNo,isDeleted:false },
            include: {
                purchaseItem: true
            }
        })

        if (!purchase) {
            return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
        }

        // Remove products from stock (reverse the purchase)
        for (const item of purchase.purchaseItem) {
            if (item.productId) {
                const product = await offlinePrisma.product.findUnique({
                    where: { id: item.productId,isDeleted:false }
                })

                if (product) {
                    // Check if we have enough stock to remove
                    if (product.quantity >= item.quantity) {
                        await offlinePrisma.product.update({
                            where: { id: item.productId,isDeleted:false },
                            data: {
                                quantity: {
                                    decrement: item.quantity
                                },
                                sync:false
                            }
                        })
                    } else {
                        return NextResponse.json({ 
                            error: `Cannot delete purchase: Insufficient stock for product ${item.productName}. Current stock: ${product.quantity}, trying to remove: ${item.quantity}` 
                        }, { status: 400 })
                    }
                }
            }
        }

        // Delete purchase items
        await offlinePrisma.purchaseItem.updateMany({
            where: { purchaseId: referenceNo },
            data:{isDeleted:true,sync:false}
        })

        // Delete the purchase
        await offlinePrisma.purchase.update({
            where: { referenceNo },
            data:{isDeleted:true,sync:false}
        })

        return NextResponse.json({ 
            message: "Purchase deleted successfully and products removed from stock" 
        })

    } catch (error) {
        console.error("Error deleting purchase:", error)
        return NextResponse.json({ error: "Failed to delete purchase" }, { status: 500 })
    }
}