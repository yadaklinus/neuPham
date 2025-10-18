import { NextRequest, NextResponse } from "next/server";
import offlinePrisma from "@/lib/oflinePrisma";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ purchaseId: string }> }
) {
    try {
        const { purchaseId } = await context.params;
        
        if (!purchaseId) {
            return NextResponse.json({ error: "Purchase ID is required" }, { status: 400 });
        }
        
        const purchase = await offlinePrisma.purchase.findUnique({
            where: { 
                referenceNo: purchaseId, 
                isDeleted: false 
            },
            include: {
                purchaseItem: {
                    where: { isDeleted: false },
                    include: {
                        product: {
                            select: {
                                name: true,
                                barcode: true,
                                unit: true
                            }
                        }
                    }
                },
                Supplier: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        address: true,
                        companyName: true
                    }
                },
                warehouses: {
                    select: {
                        id: true,
                        name: true,
                        warehouseCode: true
                    }
                }
            }
        });

        if (!purchase) {
            return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: purchase
        }, { status: 200 });
        
    } catch (error) {
        console.error("Purchase fetch error:", error);
        return NextResponse.json({ 
            error: "Failed to fetch purchase",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    } finally {
        await offlinePrisma.$disconnect();
    }
}

export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ purchaseId: string }> }
) {
    try {
        const {
            notes,
            paidAmount,
            balance,
            status
        } = await req.json();

        const { purchaseId } = await context.params;

        const existingPurchase = await offlinePrisma.purchase.findUnique({
            where: { referenceNo: purchaseId, isDeleted: false }
        });

        if (!existingPurchase) {
            return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
        }

        const updatedPurchase = await offlinePrisma.purchase.update({
            where: { referenceNo: purchaseId },
            data: {
                notes,
                paidAmount: paidAmount !== undefined ? paidAmount : existingPurchase.paidAmount,
                balance: balance !== undefined ? balance : existingPurchase.balance,
                sync: false,
                updatedAt: new Date()
            }
        });

        return NextResponse.json({
            success: true,
            message: "Purchase updated successfully",
            data: updatedPurchase
        }, { status: 200 });
    } catch (error) {
        console.error("Purchase update error:", error);
        return NextResponse.json({ 
            error: "Failed to update purchase",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    } finally {
        await offlinePrisma.$disconnect();
    }
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ purchaseId: string }> }
) {
    const { purchaseId } = await context.params;

    try {
        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: "User ID is required to perform deletion." }, { status: 400 });
        }

        // Use a transaction for deletion and stock restoration
        await offlinePrisma.$transaction(async (tx) => {
            const purchase = await tx.purchase.findUnique({
                where: { referenceNo: purchaseId, isDeleted: false },
                include: { purchaseItem: true }
            });

            if (!purchase) {
                throw new Error("Purchase not found or already deleted");
            }

            // 1. Restore product quantities (decrease stock since we're removing a purchase)
            for (const item of purchase.purchaseItem) {
                if (item.productId) {
                    const product = await tx.product.findUnique({ 
                        where: { id: item.productId }
                    });
                    
                    if (product) {
                        const currentStock = product.quantity;

                        await tx.product.update({
                            where: { id: item.productId },
                            data: {
                                quantity: {
                                    decrement: item.quantity
                                },
                                sync: false,
                                updatedAt: new Date()
                            }
                        });

                        // 2. Create a stock tracking record for the reversal
                        await tx.stockTracking.create({
                            data: {
                                productId: item.productId,
                                action: 'adjusted',
                                quantity: -item.quantity,
                                previousStock: currentStock,
                                newStock: currentStock - item.quantity,
                                staffId: userId,
                                reason: `Purchase reversal for cancelled purchase ${purchaseId}`,
                                warehouseId: purchase.warehousesId || "",
                            }
                        });
                    }
                }
            }

            // 3. Soft delete the purchase
            await tx.purchase.update({
                where: { referenceNo: purchaseId },
                data: { 
                    isDeleted: true,
                    sync: false,
                    updatedAt: new Date()
                }
            });

            // 4. Soft delete purchase items
            await tx.purchaseItem.updateMany({
                where: { purchaseId: purchaseId },
                data: {
                    isDeleted: true,
                    sync: false,
                    updatedAt: new Date()
                }
            });
        });

        return NextResponse.json({
            success: true,
            message: "Purchase cancelled successfully and stock quantities adjusted"
        }, { status: 200 });
    } catch (error: any) {
        console.error("Purchase deletion error:", error);
        return NextResponse.json({ 
            error: error.message || "Failed to cancel purchase" 
        }, { status: 500 });
    } finally {
        await offlinePrisma.$disconnect();
    }
}