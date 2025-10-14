import { NextRequest, NextResponse } from "next/server";
import offlinePrisma from "@/lib/oflinePrisma";

export async function POST(req: NextRequest) {
    try {
        const { warehouseId } = await req.json();
        
        if (!warehouseId) {
            return NextResponse.json({ error: "Warehouse ID is required" }, { status: 400 });
        }
        
        const consultations = await offlinePrisma.consultation.findMany({
            where: {
                warehousesId: warehouseId,
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
            },
            orderBy: { createdAt: 'desc' }
        });
        
        return NextResponse.json({
            success: true,
            data: consultations,
            count: consultations.length
        }, { status: 200 });
        
    } catch (error) {
        console.error("Consultation list fetch error:", error);
        return NextResponse.json({ 
            error: "Failed to fetch consultations",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    } finally {
        await offlinePrisma.$disconnect();
    }
}