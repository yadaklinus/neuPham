import { NextRequest, NextResponse } from "next/server";
import offlinePrisma from "@/lib/oflinePrisma";

export async function POST(req: NextRequest) {
    const {
        medicines,
        consultationNo,
        subtotal,
        totalDiscount,
        taxRate,
        taxAmount,
        grandTotal,
        paymentMethods,
        amountPaid,
        balance,
        notes,
        diagnosis,
        symptoms,
        treatment,
        vitalSigns,
        followUpDate,
        doctor,
        warehouseId,
        student
    } = await req.json()

    try {
        const clinic = await offlinePrisma.warehouses.findUnique({
            where: { warehouseCode: warehouseId, isDeleted: false }
        })

        if (!clinic) return NextResponse.json("clinic does not exist", { status: 401 })

        const consultation = await offlinePrisma.sale.create({
            data: {
                invoiceNo: consultationNo,
                subTotal: subtotal,
                taxRate,
                notes,
                diagnosis: diagnosis || 'General Consultation',
                symptoms: symptoms || '',
                treatment: treatment || '',
                vitalSigns: vitalSigns ? JSON.stringify(vitalSigns) : null,
                followUpDate: followUpDate ? new Date(followUpDate) : null,
                amountPaid,
                grandTotal,
                paidAmount: grandTotal - balance,
                balance,
                warehousesId: warehouseId,
                selectedCustomerId: student.id,
                consultationType: 'regular' // regular, emergency, follow-up
            }
        })

        // Validate medicine quantities before dispensing
        for (let j = 0; j < medicines.length; j++) {
            if (medicines[j].quantity < 0) {
                return NextResponse.json("Invalid medicine quantity", { status: 500 })
            }
            
            const medicine = await offlinePrisma.product.findUnique({
                where: { id: medicines[j].productId, isDeleted: false }
            })
            
            if (!medicine) {
                return NextResponse.json(`Medicine ${medicines[j].productName} not found`, { status: 404 })
            }
            
            if (medicine.quantity < medicines[j].quantity) {
                return NextResponse.json(`Insufficient stock for ${medicines[j].productName}. Available: ${medicine.quantity}`, { status: 400 })
            }
        }

        // Dispense medicines and create prescription records
        for (let i = 0; i < medicines.length; i++) {
            const prescription = await offlinePrisma.saleItem.create({
                data: {
                    saleId: consultation.invoiceNo,
                    productName: medicines[i].productName,
                    productId: medicines[i].productId,
                    cost: medicines[i].costPrice,
                    selectedPrice: medicines[i].salePrice,
                    priceType: medicines[i].priceType,
                    quantity: medicines[i].quantity,
                    discount: medicines[i].discount,
                    total: medicines[i].total,
                    warehousesId: warehouseId,
                    profit: medicines[i].salePrice - medicines[i].costPrice,
                    dosage: medicines[i].dosage || 'As prescribed',
                    frequency: medicines[i].frequency || 'As needed',
                    duration: medicines[i].duration || 'Complete course',
                    instructions: medicines[i].instructions || 'Take as directed'
                }
            })

            // Update medicine stock with anti-theft tracking
            const currentMedicine = await offlinePrisma.product.findUnique({
                where: { id: medicines[i].productId }
            })

            await offlinePrisma.product.update({
                where: { id: medicines[i].productId, isDeleted: false },
                data: {
                    quantity: {
                        decrement: medicines[i].quantity
                    },
                    lastDispensed: new Date(),
                    totalDispensed: {
                        increment: medicines[i].quantity
                    },
                    sync: false
                }
            })

            // Create comprehensive stock tracking record for anti-theft monitoring
            await offlinePrisma.stockTracking.create({
                data: {
                    productId: medicines[i].productId,
                    action: 'dispensed',
                    quantity: medicines[i].quantity,
                    previousStock: currentMedicine?.quantity || 0,
                    newStock: (currentMedicine?.quantity || 0) - medicines[i].quantity,
                    staffId: doctor?.id || null,
                    reason: `Dispensed for consultation ${consultation.invoiceNo} - ${diagnosis}`,
                    patientId: student.id,
                    consultationId: consultation.id,
                    warehousesId: warehouseId,
                    dosage: medicines[i].dosage,
                    frequency: medicines[i].frequency,
                    duration: medicines[i].duration,
                    timestamp: new Date()
                }
            })

            // Check for suspicious dispensing patterns (anti-theft)
            const recentDispensing = await offlinePrisma.stockTracking.findMany({
                where: {
                    productId: medicines[i].productId,
                    staffId: doctor?.id,
                    action: 'dispensed',
                    timestamp: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                    }
                }
            })

            const totalDispensedToday = recentDispensing.reduce((sum, record) => sum + record.quantity, 0)

            // Flag suspicious activity if excessive dispensing
            if (totalDispensedToday > 50) {
                await offlinePrisma.suspiciousActivity.create({
                    data: {
                        staffId: doctor?.id || null,
                        productId: medicines[i].productId,
                        activityType: 'excessive_dispensing',
                        description: `Doctor dispensed ${totalDispensedToday} units of ${medicines[i].productName} in 24 hours`,
                        severity: 'high',
                        warehousesId: warehouseId,
                        consultationId: consultation.id
                    }
                })
            }
        }

        // Record payment methods
        for (let j = 0; j < paymentMethods.length; j++) {
            await offlinePrisma.paymentMethod.create({
                data: {
                    method: paymentMethods[j].method,
                    amount: paymentMethods[j].amount,
                    warehousesId: warehouseId,
                    saleId: consultation.invoiceNo,
                    transactionRef: paymentMethods[j].transactionRef || null
                }
            })
        }

        // Create consultation summary for medical records
        await offlinePrisma.consultationSummary.create({
            data: {
                consultationId: consultation.id,
                studentId: student.id,
                doctorId: doctor?.id || null,
                diagnosis,
                symptoms,
                treatment,
                vitalSigns: vitalSigns ? JSON.stringify(vitalSigns) : null,
                prescriptionCount: medicines.length,
                followUpRequired: followUpDate ? true : false,
                followUpDate: followUpDate ? new Date(followUpDate) : null,
                consultationDate: new Date(),
                warehousesId: warehouseId
            }
        })

        return NextResponse.json({
            success: true,
            consultation,
            message: "Consultation completed successfully"
        })
    } catch (error) {
        console.log("Consultation error:", error)
        return NextResponse.json({ error: "Failed to process consultation" }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const warehouseId = searchParams.get('warehouseId')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const studentId = searchParams.get('studentId')
        const doctorId = searchParams.get('doctorId')
        const skip = (page - 1) * limit

        const whereClause: any = {
            isDeleted: false
        }

        if (warehouseId) {
            whereClause.warehousesId = warehouseId
        }

        if (studentId) {
            whereClause.selectedCustomerId = studentId
        }

        const [consultations, totalCount] = await Promise.all([
            offlinePrisma.sale.findMany({
                where: whereClause,
                include: {
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            matricNumber: true,
                            department: true,
                            phone: true
                        }
                    },
                    saleItems: {
                        include: {
                            product: {
                                select: {
                                    name: true,
                                    unit: true
                                }
                            }
                        }
                    },
                    paymentMethod: true
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            offlinePrisma.sale.count({
                where: whereClause
            })
        ])

        return NextResponse.json({
            consultations: consultations.map(consultation => ({
                id: consultation.id,
                consultationNo: consultation.invoiceNo,
                date: consultation.createdAt,
                student: consultation.customer,
                diagnosis: consultation.diagnosis,
                symptoms: consultation.symptoms,
                treatment: consultation.treatment,
                medicines: consultation.saleItems,
                totalAmount: consultation.grandTotal,
                amountPaid: consultation.paidAmount,
                balance: consultation.balance,
                paymentStatus: consultation.balance === 0 ? 'paid' : consultation.balance === consultation.grandTotal ? 'unpaid' : 'partial',
                followUpDate: consultation.followUpDate
            })),
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        })
    } catch (error) {
        console.error("Failed to fetch consultations:", error)
        return NextResponse.json({ error: "Failed to fetch consultations" }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    const { consultationId } = await req.json()
    try {
        const consultation = await offlinePrisma.sale.findUnique({
            where: { invoiceNo: consultationId, isDeleted: false },
            include: {
                saleItems: true
            }
        })
        
        if (!consultation) {
            return NextResponse.json("Consultation not found", { status: 404 })
        }

        // Restore medicine quantities before deleting consultation
        for (const item of consultation.saleItems) {
            await offlinePrisma.product.update({
                where: { id: item.productId },
                data: {
                    quantity: {
                        increment: item.quantity
                    },
                    sync: false
                }
            })

            // Create stock tracking record for reversal
            await offlinePrisma.stockTracking.create({
                data: {
                    productId: item.productId,
                    action: 'returned',
                    quantity: item.quantity,
                    staffId: null,
                    reason: `Consultation ${consultationId} cancelled - stock restored`,
                    warehousesId: consultation.warehousesId,
                    timestamp: new Date()
                }
            })
        }

        await offlinePrisma.sale.update({
            where: { invoiceNo: consultationId },
            data: { isDeleted: true, sync: false }
        })

        return NextResponse.json({ message: "Consultation cancelled successfully" }, { status: 200 })

    } catch (error) {
        console.error("Failed to cancel consultation:", error)
        return NextResponse.json({ error: "Failed to cancel consultation" }, { status: 500 })
    }
}