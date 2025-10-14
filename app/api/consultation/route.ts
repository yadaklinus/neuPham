import { NextRequest, NextResponse } from "next/server";
// FIX: Use the correct singular model names from the corrected schema
import prisma from "@/lib/oflinePrisma";

export async function POST(req: NextRequest) {
    try {
        const {
            items,
            invoiceNo,
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
            doctor // Doctor/staff for tracking
        } = await req.json();

        // Basic validation
        if (!student || !student.id) {
            return NextResponse.json({ error: "Student information is required." }, { status: 400 });
        }

        if (!items || items.length === 0) {
            return NextResponse.json({ error: "At least one medicine item is required." }, { status: 400 });
        }

        if (!warehouseId) {
            return NextResponse.json({ error: "Warehouse ID is required." }, { status: 400 });
        }

        // ⭐ BEST PRACTICE: Use a transaction for multi-step database operations
        // This ensures that if any step fails, all previous steps are rolled back.
        const consultation = await prisma.$transaction(async (tx) => {
            // 1. Create the main consultation record
            const newConsultation = await tx.consultation.create({
                data: {
                    invoiceNo: invoiceNo,
                    subTotal: subtotal,
                    taxRate,
                    notes,
                    diagnosis: diagnosis || 'General Consultation',
                    symptoms: symptoms || '',
                    amountPaid: grandTotal - (balance || 0),
                    grandTotal,
                    paidAmount: grandTotal - (balance || 0),
                    balance: balance || 0,
                    warehousesId: warehouseId, // Foreign key to Warehouses
                    selectedStudentId: student.id,
                }
            });

            // 2. Process each medicine item
            for (const item of items) {
                // Get the product and its current stock IN THE TRANSACTION
                const product = await tx.product.findUnique({
                    where: { id: item.productId }
                });

                if (!product) {
                    // Throwing an error inside a transaction automatically triggers a rollback
                    throw new Error(`Medicine ${item.productName} not found`);
                }

                if (product.quantity < item.quantity) {
                    throw new Error(`Insufficient stock for ${item.productName}. Available: ${product.quantity}`);
                }

                // Create the consultation item (prescription)
                await tx.consultationItem.create({
                    data: {
                        consultationId: newConsultation.invoiceNo,
                        productName: item.productName,
                        productId: item.productId,
                        cost: item.costPrice,
                        selectedPrice: item.salePrice,
                        priceType: item.priceType,
                        quantity: item.quantity,
                        discount: item.discount || 0,
                        total: item.total,
                        warehousesId: warehouseId,
                        profit: (item.salePrice - item.costPrice) * item.quantity,
                        dosage: item.dosage || 'As prescribed',
                        frequency: item.frequency || 'As needed',
                        duration: item.duration || 'Complete course',
                        instructions: item.instructions || 'Take as directed'
                    }
                });

                // Update the product stock
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        quantity: {
                            decrement: item.quantity
                        }
                    }
                });

                // Create the stock tracking record for auditing (only if we have a doctor/staff ID)
                if (doctor && doctor.id) {
                    await tx.stockTracking.create({
                        data: {
                            productId: item.productId,
                            action: 'dispensed',
                            quantity: item.quantity,
                            previousStock: product.quantity,
                            newStock: product.quantity - item.quantity,
                            staffId: doctor.id,
                            reason: `Dispensed for consultation ${newConsultation.invoiceNo}`,
                            patientId: student.id,
                            warehouseId: warehouseId,
                        }
                    });

                    // Anti-theft: Check for suspicious activity patterns
                    const suspiciousThreshold = 10; // Threshold for large quantities
                    const highValueThreshold = 1000; // Threshold for high-value items

                    let suspiciousActivity = null;
                    let severity = 'low';
                    let description = '';

                    // Check for excessive quantity dispensing
                    if (item.quantity > suspiciousThreshold) {
                        severity = 'high';
                        description = `Large quantity dispensed: ${item.quantity} units of ${item.productName}`;
                        suspiciousActivity = {
                            staffId: doctor.id,
                            productId: item.productId,
                            warehouseId: warehouseId,
                            activityType: 'excessive_dispensing',
                            description,
                            severity
                        };
                    }

                    // Check for high-value item dispensing
                    if (item.total > highValueThreshold) {
                        severity = item.total > highValueThreshold * 2 ? 'high' : 'medium';
                        description = `High-value item dispensed: ${item.productName} worth ${item.total}`;
                        suspiciousActivity = {
                            staffId: doctor.id,
                            productId: item.productId,
                            warehouseId: warehouseId,
                            activityType: 'high_value_dispensing',
                            description,
                            severity
                        };
                    }

                    // Check for after-hours activity (if timestamp is outside normal hours)
                    const currentHour = new Date().getHours();
                    if (currentHour < 6 || currentHour > 22) {
                        severity = 'medium';
                        description = `After-hours dispensing: ${item.productName} at ${new Date().toLocaleTimeString()}`;
                        suspiciousActivity = {
                            staffId: doctor.id,
                            productId: item.productId,
                            warehouseId: warehouseId,
                            activityType: 'after_hours_activity',
                            description,
                            severity
                        };
                    }

                    // Create suspicious activity record if detected
                    if (suspiciousActivity) {
                        await tx.suspiciousActivity.create({
                            data: suspiciousActivity
                        });
                    }
                }
            }

            // 3. Record payment methods
            if (paymentMethods && paymentMethods.length > 0) {
                await tx.paymentMethod.createMany({
                    data: paymentMethods.map((p: { method: string, amount: number }) => ({
                        method: p.method,
                        amount: Math.round(p.amount), // Convert to integer as per schema
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
        }, { status: 200 });

    } catch (error: any) {
        console.error("Consultation error:", error);
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
    try {
        const { consultationId, userId } = await req.json();

        if (!consultationId) {
            return NextResponse.json({ error: "Consultation ID is required." }, { status: 400 });
        }

        if (!userId) {
            return NextResponse.json({ error: "User ID is required to perform deletion." }, { status: 400 });
        }

        // ⭐ BEST PRACTICE: Use a transaction for deletion and stock restoration
        await prisma.$transaction(async (tx) => {
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
                        const currentStock = product.quantity;

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
                                previousStock: currentStock,
                                newStock: currentStock + item.quantity,
                                staffId: userId,
                                reason: `Reversal for cancelled consultation ${consultationId}`,
                                warehouseId: consultation.warehousesId || "",
                            }
                        });
                    }
                }
            }

            // 3. Soft delete the consultation
            await tx.consultation.update({
                where: { invoiceNo: consultationId },
                data: { 
                    isDeleted: true,
                    updatedAt: new Date()
                }
            });
        });

        return NextResponse.json({ 
            success: true,
            message: "Consultation cancelled successfully and products returned to stock" 
        }, { status: 200 });

    } catch (error: any) {
        console.error("Failed to cancel consultation:", error);
        return NextResponse.json({ 
            error: error.message || "Failed to cancel consultation" 
        }, { status: 500 });
    }
}