import { NextRequest, NextResponse } from "next/server";
// FIX: Use the correct singular model names from the corrected schema
import prisma from "@/lib/oflinePrisma";

export async function POST(req: NextRequest) {
    const {
        medicines,
        consultationNo,
        subtotal,
        taxRate,
        grandTotal,
        paymentMethods,
        balance,
        notes,
        diagnosis,
        symptoms,
        warehouseId, // This is the warehouseCode
        student,
        doctor // FIX: Added doctor/staff for tracking
    } = await req.json();

    // Basic validation
    if (!doctor || !doctor.id) {
        return NextResponse.json({ error: "Doctor/staff information is required for tracking." }, { status: 400 });
    }

    try {
        // ⭐ BEST PRACTICE: Use a transaction for multi-step database operations
        // This ensures that if any step fails, all previous steps are rolled back.
        const consultation = await prisma.$transaction(async (tx) => {
            // 1. Create the main consultation record
            const newConsultation = await tx.consultation.create({
                data: {
                    invoiceNo: consultationNo,
                    subTotal: subtotal,
                    taxRate,
                    notes,
                    diagnosis: diagnosis || 'General Consultation',
                    symptoms: symptoms || '',
                    amountPaid: grandTotal - balance,
                    grandTotal,
                    paidAmount: grandTotal - balance,
                    balance,
                    warehousesId: warehouseId, // Foreign key to Warehouses
                    selectedStudentId: student.id,
                }
            });

            // 2. Process each medicine item
            for (const medicine of medicines) {
                // Get the product and its current stock IN THE TRANSACTION
                const product = await tx.product.findUnique({
                    where: { id: medicine.productId }
                });

                if (!product) {
                    // Throwing an error inside a transaction automatically triggers a rollback
                    throw new Error(`Medicine ${medicine.productName} not found`);
                }

                if (product.quantity < medicine.quantity) {
                    throw new Error(`Insufficient stock for ${medicine.productName}. Available: ${product.quantity}`);
                }

                // Create the consultation item (prescription)
                await tx.consultationItem.create({
                    data: {
                        consultationId: newConsultation.invoiceNo,
                        productName: medicine.productName,
                        productId: medicine.productId,
                        cost: medicine.costPrice,
                        selectedPrice: medicine.salePrice,
                        priceType: medicine.priceType,
                        quantity: medicine.quantity,
                        discount: medicine.discount,
                        total: medicine.total,
                        warehousesId: warehouseId,
                        profit: medicine.salePrice - medicine.costPrice,
                        dosage: medicine.dosage || 'As prescribed',
                        frequency: medicine.frequency || 'As needed',
                        duration: medicine.duration || 'Complete course',
                        instructions: medicine.instructions || 'Take as directed'
                    }
                });

                // Update the product stock
                await tx.product.update({
                    where: { id: medicine.productId },
                    data: {
                        quantity: {
                            decrement: medicine.quantity
                        }
                    }
                });

                // Create the stock tracking record for auditing
                await tx.stockTracking.create({
                    data: {
                        productId: medicine.productId,
                        action: 'dispensed',
                        quantity: medicine.quantity,
                        previousStock: product.quantity,
                        newStock: product.quantity - medicine.quantity,
                        staffId: doctor.id, // FIX: Use the provided doctor ID
                        reason: `Dispensed for consultation ${newConsultation.invoiceNo}`,
                        patientId: student.id,
                        warehouseId: warehouseId, // FIX: Use 'warehousesId' to match schema
                    }
                });
            }

            // 3. Record payment methods
            if (paymentMethods && paymentMethods.length > 0) {
                await tx.paymentMethod.createMany({
                    data: paymentMethods.map((p: { method: string, amount: number }) => ({
                        method: p.method,
                        amount: p.amount,
                        warehousesId: warehouseId,
                        consultationId: newConsultation.invoiceNo,
                    }))
                });
            }

            return newConsultation;
        });

        return NextResponse.json({
            success: true,
            consultation,
            message: "Consultation completed successfully"
        }, { status: 201 });

    } catch (error: any) {
        console.log("Consultation error:", error);
        return NextResponse.json({ error: error.message || "Failed to process consultation" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const warehouseId = searchParams.get('warehouseId');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const studentId = searchParams.get('studentId');
        const skip = (page - 1) * limit;

        const whereClause: any = {
            isDeleted: false
        };

        if (warehouseId) {
            whereClause.warehousesId = warehouseId;
        }

        if (studentId) {
            // FIX: Corrected field name from selectedCustomerId to selectedStudentId
            whereClause.selectedStudentId = studentId;
        }
        
        const [consultations, totalCount] = await prisma.$transaction([
            prisma.consultation.findMany({
                where: whereClause,
                include: {
                    selectedStudent: {
                        select: {
                            id: true,
                            name: true,
                            matricNumber: true,
                        }
                    },
                    consultationItems: true,
                    // FIX: Renamed 'paymentMethod' to 'paymentMethods' to match schema (one-to-many)
                    paymentMethod: true
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.consultation.count({
                where: whereClause
            })
        ]);

        return NextResponse.json({
            data: consultations,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error("Failed to fetch consultations:", error);
        return NextResponse.json({ error: "Failed to fetch consultations" }, { status: 500 });
    }
}


export async function DELETE(req: NextRequest) {
    const { consultationId, userId } = await req.json(); // FIX: Added userId for tracking

    if (!userId) {
        return NextResponse.json({ error: "User ID is required to perform deletion." }, { status: 400 });
    }

    try {
        // ⭐ BEST PRACTICE: Use a transaction for deletion and stock restoration
        await prisma.$transaction(async (tx) => {
            const consultation = await tx.consultation.findUnique({
                where: { invoiceNo: consultationId, isDeleted: false },
                include: { consultationItems: true }
            });

            if (!consultation) {
                throw new Error("Consultation not found");
            }

            // 1. Restore medicine quantities
            for (const item of consultation.consultationItems) {
                if(item.productId){
                    const product = await tx.product.findUnique({ where: { id: item.productId }});
                    const currentStock = product?.quantity ?? 0;

                    await tx.product.update({
                        where: { id: item.productId },
                        data: {
                            quantity: {
                                increment: item.quantity
                            }
                        }
                    });

                    // 2. Create a stock tracking record for the reversal
                    await tx.stockTracking.create({
                        data: {
                            productId: item.productId,
                            action: 'returned',
                            quantity: item.quantity,
                            previousStock: currentStock, // FIX: Added missing field
                            newStock: currentStock + item.quantity, // FIX: Added missing field
                            staffId: userId, // FIX: Use a valid user ID, not an empty string
                            reason: `Reversal for cancelled consultation ${consultationId}`,
                            warehouseId: consultation.warehousesId || "", // FIX: Use 'warehousesId'
                        }
                    });
                }
            }

            // 3. Soft delete the consultation
            await tx.consultation.update({
                where: { invoiceNo: consultationId },
                data: { isDeleted: true }
            });
        });

        return NextResponse.json({ message: "Consultation cancelled successfully" }, { status: 200 });

    } catch (error: any) {
        console.error("Failed to cancel consultation:", error);
        return NextResponse.json({ error: error.message || "Failed to cancel consultation" }, { status: 500 });
    }
}