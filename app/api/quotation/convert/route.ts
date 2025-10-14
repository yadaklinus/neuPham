// Updated app/api/quotation/convert/route.ts
import { NextRequest, NextResponse } from "next/server";
import offlinePrisma from "@/lib/oflinePrisma";

export async function POST(req: NextRequest) {
    const {
        quotationNo,
        paymentMethods,
        amountPaid,
        balance,
        invoiceNo,
        useCustomerBalance = true // New parameter to indicate if we should use customer balance
    } = await req.json()

    try {
        // Get the quotation with items
        const quotation = await offlinePrisma.quotation.findUnique({
            where: { quotationNo, isDeleted: false },
            include: {
                quotationItems: {
                    where: { isDeleted: false },
                    include: { product: true }
                },
                selectedStudent: true
            }
        })

        if (!quotation) {
            return NextResponse.json("Quotation not found", { status: 404 })
        }

        if (quotation.status === "converted") {
            return NextResponse.json("Quotation already converted to sale", { status: 400 })
        }

        // Generate invoice number if not provided
        const finalInvoiceNo = invoiceNo || `INV-${Date.now()}`

        // Get customer balance if we should use it
        let customerBalance = 0
        let balanceUsed = 0
        let finalBalance = balance || 0
        let finalAmountPaid = amountPaid || 0

        if (useCustomerBalance && quotation.selectedStudent) {
            const customer = await offlinePrisma.student.findUnique({
                where: { id: quotation.selectedStudentId!, isDeleted: false },
                select: { accountBalance: true }
            })
            
            customerBalance = customer?.accountBalance || 0
            
            // Calculate how much balance to use
            const remainingAmount = quotation.grandTotal - (finalAmountPaid || 0)
            balanceUsed = Math.min(customerBalance, remainingAmount)
            
            // Update final amounts
            if (balanceUsed > 0) {
                finalAmountPaid += balanceUsed
                finalBalance = quotation.grandTotal - finalAmountPaid
            }
        }

        // Use transaction to ensure data consistency
        const result = await offlinePrisma.$transaction(async (tx) => {
            // Create sale from quotation
            const sale = await tx.consultation.create({
                data: {
                    invoiceNo: finalInvoiceNo,
                    subTotal: quotation.subTotal,
                    taxRate: quotation.taxRate,
                    notes: quotation.notes,
                    amountPaid: finalAmountPaid,
                    grandTotal: quotation.grandTotal,
                    paidAmount: quotation.grandTotal - finalBalance,
                    balance: finalBalance,
                    warehousesId: quotation.warehousesId,
                    selectedStudentId: quotation.selectedStudentId
                }
            })

            // Create sale items from quotation items
            const saleItems = quotation.quotationItems.map(item => ({
                saleId: sale.invoiceNo,
                productId: item.productId,
                productName: item.productName,
                cost: item.cost,
                selectedPrice: item.selectedPrice,
                priceType: item.priceType,
                quantity: item.quantity,
                discount: item.discount,
                total: item.total,
                profit: (item.selectedPrice - item.cost) * item.quantity,
                warehousesId: item.warehousesId,
                customerId: quotation.selectedStudentId
            }))

            await tx.consultationItem.createMany({
                data: saleItems
            })

            // Update product quantities
            for (const item of quotation.quotationItems) {
                if (item.product) {
                    await tx.product.update({
                        where: { id: item.productId! },
                        data: {
                            quantity: {
                                decrement: item.quantity
                            }
                        }
                    })
                }
            }

            // Create payment methods if provided
            if (paymentMethods && paymentMethods.length > 0) {
                const paymentData = paymentMethods.map((method: any) => ({
                    saleId: sale.id,
                    method: method.method,
                    amount: method.amount,
                    warehousesId: quotation.warehousesId
                }))

                await tx.paymentMethod.createMany({
                    data: paymentData
                })
            }

            // Deduct customer balance if used
            if (balanceUsed > 0 && quotation.selectedStudent) {
                // Update customer balance
                await tx.student.update({
                    where: { id: quotation.selectedStudentId! },
                    data: {
                        accountBalance: {
                            decrement: balanceUsed
                        }
                    }
                })

                // Create balance transaction record
                await tx.balanceTransaction.create({
                    data: {
                        studentId: quotation.selectedStudentId!,
                        amount: balanceUsed,
                        type: "DEBIT",
                        description: `Quotation conversion - Invoice ${finalInvoiceNo}`,
                        reference: `QUOTE-${quotationNo}`,
                        warehouseId: quotation.warehousesId,
                        balanceAfter: customerBalance - balanceUsed,
                        saleId: finalInvoiceNo,
                    }
                })
            }

            // Update quotation status
            await tx.quotation.update({
                where: { quotationNo },
                data: {
                    status: "converted",
                    convertedToConsultationId: sale.invoiceNo
                }
            })

            return { sale, balanceUsed }
        })

        return NextResponse.json({
            message: "Quotation converted to sale successfully",
            sale: result.sale,
            invoiceNo: finalInvoiceNo,
            balanceUsed,
            remainingBalance: finalBalance
        }, { status: 201 })

    } catch (error) {
        console.error("Error converting quotation to sale:", error)
        return NextResponse.json("Error converting quotation to sale", { status: 500 })
    }
}