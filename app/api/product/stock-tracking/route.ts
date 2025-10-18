import { NextRequest, NextResponse } from "next/server";

import offlinePrisma from "@/lib/oflinePrisma";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const productId = searchParams.get('productId')
        const warehouseId = searchParams.get('warehouseId')

        if (!productId) {
            return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
        }

        // Get product details
        const product = await offlinePrisma.product.findUnique({
            where: { id: productId,isDeleted:false },
            include: {
                warehouses: true
            }
        })

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 })
        }

        // Get stock tracking records with staff information
        const stockTrackingRecords = await offlinePrisma.stockTracking.findMany({
            where: { 
                productId,
                ...(warehouseId && { warehouseId: warehouseId })
            },
            include: {
                staff: {
                    select: {
                        id: true,
                        userName: true,
                        email: true,
                        role: true
                    }
                },
                patient: {
                    select: {
                        id: true,
                        name: true,
                        matricNumber: true
                    }
                }
            },
            orderBy: {
                timestamp: 'desc'
            }
        })

        // Get all sales for this product
        const consultationItems = await offlinePrisma.consultationItem.findMany({
            where: { 
                productId,
                isDeleted:false,
                ...(warehouseId && { warehousesId: warehouseId })
            },
            include: {
                consultation: {
                    include: {
                        selectedStudent: true
                    }
                }
            },
            orderBy: {
                consultation: {
                    createdAt: 'desc'
                }
            }
        })

        // Get all purchases for this product
        const purchaseItems = await offlinePrisma.purchaseItem.findMany({
            where: { 
                productId,
                isDeleted:false,
                ...(warehouseId && { warehousesId: warehouseId })
            },
            include: {
                Purchase: {
                    include: {
                        Supplier: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        // Combine and format stock movements
        const stockMovements = []

        // Add stock tracking records (most comprehensive data)
        for (const trackingRecord of stockTrackingRecords) {
            const actionType = trackingRecord.action === 'dispensed' ? 'DISPENSED' : 
                              trackingRecord.action === 'received' ? 'RECEIVED' : 
                              trackingRecord.action === 'returned' ? 'RETURNED' : 
                              'ADJUSTED'
            
            stockMovements.push({
                id: trackingRecord.id,
                type: actionType,
                date: trackingRecord.timestamp,
                quantity: trackingRecord.action === 'dispensed' || trackingRecord.action === 'returned' ? 
                         -Math.abs(trackingRecord.quantity) : trackingRecord.quantity,
                reference: `${actionType}-${trackingRecord.id.slice(-6)}`,
                customer: trackingRecord.patient?.name || null,
                supplier: null,
                unitPrice: 0,
                total: 0,
                notes: trackingRecord.reason,
                staff: trackingRecord.staff,
                patient: trackingRecord.patient,
                previousStock: trackingRecord.previousStock,
                newStock: trackingRecord.newStock
            })
        }

        // Add sales (stock decrements) - only if not already tracked in stockTracking
        for (const consultationItem of consultationItems) {
            // Check if this consultation is already tracked in stockTracking
            const alreadyTracked = stockTrackingRecords.some(record => 
                record.reason.includes(consultationItem.consultation?.invoiceNo || '')
            )
            
            if (!alreadyTracked) {
                stockMovements.push({
                    id: consultationItem.id,
                    type: 'SALE',
                    date: consultationItem.consultation?.createdAt || new Date(),
                    quantity: -consultationItem.quantity, // Negative for sales
                    reference: consultationItem.consultation?.invoiceNo || 'N/A',
                    customer: consultationItem.consultation?.selectedStudent?.name || 'N/A',
                    supplier: null,
                    unitPrice: consultationItem.selectedPrice,
                    total: consultationItem.total,
                    notes: `Sale to ${consultationItem.consultation?.selectedStudent?.name || 'Customer'}`,
                    staff: null,
                    patient: consultationItem.consultation?.selectedStudent
                })
            }
        }

        // Add purchases (stock increments)
        for (const purchaseItem of purchaseItems) {
            // Check if this purchase is already tracked in stockTracking
            const alreadyTracked = stockTrackingRecords.some(record => 
                record.reason.includes(purchaseItem.Purchase?.referenceNo || '')
            )
            
            if (!alreadyTracked) {
                stockMovements.push({
                    id: purchaseItem.id,
                    type: 'PURCHASE',
                    date: purchaseItem.Purchase?.createdAt || new Date(),
                    quantity: purchaseItem.quantity, // Positive for purchases
                    reference: purchaseItem.Purchase?.referenceNo || 'N/A',
                    customer: null,
                    supplier: purchaseItem.Purchase?.Supplier?.name || 'N/A',
                    unitPrice: purchaseItem.cost,
                    total: purchaseItem.total,
                    notes: `Purchase from ${purchaseItem.Purchase?.Supplier?.name || 'Supplier'}`,
                    staff: null
                })
            }
        }

        // Sort by date (newest first)
        stockMovements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        // Calculate running stock balance
        let runningBalance = product.quantity
        const movementsWithBalance = stockMovements.map((movement, i) => {
            const movementWithBalance = { ...movement, balanceAfter: runningBalance }
            runningBalance -= movement.quantity
            return movementWithBalance
        })

        return NextResponse.json({
            product: {
                id: product.id,
                name: product.name,
                barcode: product.barcode,
                currentStock: product.quantity,
                unit: product.unit,
                warehouse: product.warehouses?.name || 'N/A'
            },
            movements: movementsWithBalance,
            summary: {
                totalSales: consultationItems.reduce((sum, item) => sum + item.quantity, 0),
                totalPurchases: purchaseItems.reduce((sum, item) => sum + item.quantity, 0),
                totalMovements: stockMovements.length
            }
        })

    } catch (error) {
        console.error("Error fetching stock tracking data:", error)
        return NextResponse.json({ error: "Failed to fetch stock tracking data" }, { status: 500 })
    }
}