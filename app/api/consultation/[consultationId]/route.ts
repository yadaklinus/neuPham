import { NextRequest, NextResponse } from "next/server";
import offlinePrisma from "@/lib/oflinePrisma";

// Define a consistent type for your route context
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ consultationId: string }> }
) {
    try {
        const { consultationId } = await context.params;
        
        if (!consultationId) {
            return NextResponse.json({ error: "Consultation ID is required" }, { status: 400 });
        }
        
        const consultation = await offlinePrisma.consultation.findUnique({
            where: { 
                invoiceNo: consultationId, 
                isDeleted: false 
            },
            include: {
                selectedStudent: {
                    select: {
                        id: true,
                        name: true,
                        matricNumber: true,
                        phone: true,
                        email: true,
                        bloodGroup: true,
                        genotype: true,
                        allergies: true
                    }
                },
                consultationItems: {
                    include: {
                        product: {
                            select: {
                                name: true,
                                barcode: true
                            }
                        }
                    }
                },
                paymentMethod: true
            }
        });

        if (!consultation) {
            return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: consultation
        }, { status: 200 });
        
    } catch (error) {
        console.error("Consultation fetch error:", error);
        return NextResponse.json({ 
            error: "Failed to fetch consultation",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    } finally {
        await offlinePrisma.$disconnect();
    }
}

// PUT and DELETE handlers already use the correct, non-Promise type for params.

export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ consultationId: string }> }
) {
    try {
        const {
            diagnosis,
            symptoms,
            consultantNotes,
            notes
        } = await req.json();

        const {consultationId} = await context.params

        const existingConsultation = await offlinePrisma.consultation.findUnique({
            where: { invoiceNo: consultationId, isDeleted: false }
        });

        if (!existingConsultation) {
            return NextResponse.json("Consultation not found", { status: 404 });
        }

        const updatedConsultation = await offlinePrisma.consultation.update({
            where: { invoiceNo: consultationId },
            data: {
                diagnosis,
                symptoms,
                consultantNotes,
                notes,
                sync: false,
                updatedAt: new Date()
            }
        });

        return NextResponse.json({
            message: "Consultation updated successfully",
            consultation: updatedConsultation
        }, { status: 200 });
    } catch (error) {
        console.error("Consultation update error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    } finally {
        await offlinePrisma.$disconnect();
    }
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ consultationId: string }> }
   
) {
    const {consultationId} = await context.params

    try {
        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: "User ID is required to perform deletion." }, { status: 400 });
        }

        // Use a transaction for deletion and stock restoration
        await offlinePrisma.$transaction(async (tx) => {
            const consultation = await tx.consultation.findUnique({
                where: { invoiceNo: consultationId, isDeleted: false },
                include: { consultationItems: true }
            });

            if (!consultation) {
                throw new Error("Consultation not found or already deleted");
            }

            // 1. Restore medicine quantities
            for (const item of consultation.consultationItems) {
                if (item.productId) {
                    const product = await tx.product.findUnique({ 
                        where: { id: item.productId }
                    });
                    
                    if (product) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: {
                                quantity: {
                                    increment: item.quantity
                                }
                            }
                        });

                        // 2. Create a stock tracking record for the reversal
                        
                    }
                }
            }

            // 3. Soft delete the consultation
            await tx.consultation.update({
                where: { invoiceNo: consultationId },
                data: { 
                    isDeleted: true,
                    sync: false,
                    updatedAt: new Date()
                }
            });
            await tx.consultationItem.updateMany({
                where: { consultationId: consultationId },
                data: { 
                    isDeleted: true,
                    sync: false,
                    
                }
            });
        });

        return NextResponse.json({
            message: "Consultation cancelled successfully and products returned to stock"
        }, { status: 200 });
    } catch (error: any) {
        console.error("Consultation deletion error:", error);
        return NextResponse.json({ 
            error: error.message || "Failed to cancel consultation" 
        }, { status: 500 });
    } finally {
        await offlinePrisma.$disconnect();
    }
}