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
        const consultation = await offlinePrisma.consultation.findUnique({
            where: { invoiceNo: consultationId }
        });

        if (!consultation) {
            return NextResponse.json("Consultation not found", { status: 404 });
        }

        // Soft delete the consultation
        await offlinePrisma.consultation.update({
            where: { invoiceNo: consultationId },
            data: {
                isDeleted: true,
                sync: false,
                updatedAt: new Date()
            }
        });

        return NextResponse.json({
            message: "Consultation deleted successfully"
        }, { status: 200 });
    } catch (error) {
        console.error("Consultation deletion error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    } finally {
        await offlinePrisma.$disconnect();
    }
}