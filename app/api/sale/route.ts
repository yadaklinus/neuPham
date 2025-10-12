import { NextRequest, NextResponse } from "next/server";

import offlinePrisma from "@/lib/oflinePrisma";

export async function POST(req:NextRequest){
    const {
        items,
        invoiceNo,
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
        cashier,
        warehouseId,
        customer: student
    } = await req.json()

   try {
    const clinic = await offlinePrisma.warehouses.findUnique({where:{warehouseCode:warehouseId,isDeleted:false}})
            
    if(!clinic) return NextResponse.json("clinic does not exist",{status:401})

    const consultation = await offlinePrisma.sale.create({
        data:{
            invoiceNo,
            subTotal:subtotal,
            taxRate,
            notes,
            diagnosis: diagnosis || 'General Consultation',
            symptoms: symptoms || '',
            treatment: treatment || '',
            amountPaid,
            grandTotal,
            paidAmount:grandTotal - balance,
            balance,
            warehousesId:warehouseId,
            selectedCustomerId:student.id
        }
    })

    for(let j = 0; j < items.length; j++){
        if(items[j].quantity < 0){
            return NextResponse.json("Ivalid",{status:500})
        }
        
    }

    
    for (let i = 0; i < items.length; i++) {
        const prescribedMedicine = await offlinePrisma.saleItem.create({
            data:{
                saleId:consultation.invoiceNo,
                productName:items[i].productName,
                productId:items[i].productId,
                cost:items[i].costPrice,
                selectedPrice:items[i].salePrice,
                priceType:items[i].priceType,
                quantity:items[i].quantity,
                discount:items[i].discount,
                total:items[i].total,
                warehousesId:warehouseId,
                profit:items[i].salePrice - items[i].costPrice,
                dosage: items[i].dosage || 'As prescribed',
                frequency: items[i].frequency || 'As needed'
            }
        })
        // Track drug dispensing for anti-theft monitoring
        await offlinePrisma.product.update({
            where:{id:items[i].productId,isDeleted:false},
            data:{
                quantity:{
                    decrement:items[i].quantity
                },
                lastDispensed: new Date(),
                sync:false
            }
        })
        
        // Create stock tracking record for anti-theft
        await offlinePrisma.stockTracking.create({
            data: {
                productId: items[i].productId,
                action: 'dispensed',
                quantity: items[i].quantity,
                previousStock: items[i].currentStock || 0,
                newStock: (items[i].currentStock || 0) - items[i].quantity,
                staffId: cashier?.id || null,
                reason: `Dispensed for consultation ${consultation.invoiceNo}`,
                patientId: student.id,
                warehousesId: warehouseId
            }
        })
    }

    for (let j = 0; j < paymentMethods.length; j++) {
        await offlinePrisma.paymentMethod.create({
            data:{
                method:paymentMethods[j].method,
                amount:paymentMethods[j].amount,
                // notes:paymentMethods[j].notes,
                warehousesId:warehouseId,
                saleId:consultation.invoiceNo
            }
        })
         
    }

    
    
    
    
    return NextResponse.json("data")
   } catch (error) {
    console.log(error)
    NextResponse.json(error,{status:500})
   }
}


export async function DELETE(req:NextRequest){
    const {saleId} = await req.json()
    try {
        const findSale = await offlinePrisma.sale.findMany({
            where:{invoiceNo:saleId,isDeleted:false}
        })
        if(!findSale){
            return NextResponse.json("Error",{status:500})
        }

        await offlinePrisma.sale.update({
            where:{invoiceNo:saleId},
            data:{isDeleted:true,sync:false}
        })
        return NextResponse.json("Done",{status:200})

    } catch (error) {
        return NextResponse.json(error,{status:500})
        
    }
}