import { NextRequest, NextResponse } from "next/server";


import offlinePrisma from "@/lib/oflinePrisma";


export async function GET(){
   try {
    const warehouses = await offlinePrisma.warehouses.findMany({where:{isDeleted:false}})

    return NextResponse.json(warehouses,{status:200})
   } catch (error) {
    return NextResponse.json(error,{status:500})
   }finally{
    await offlinePrisma.$disconnect()
   }
}

export async function POST(req:NextRequest){
    const data = await req.json()
    const {code,name,phone,email,description,address} = data.formData
    try {
     const warehouses = await offlinePrisma.warehouses.create({
        data:{
            name,
            warehouseCode:code,
            phoneNumber:phone,
            email,
            description,
            address
        }
     })

     await offlinePrisma.receiptSettings.create({
        data:{
            warehousesId:warehouses.warehouseCode,
            phone:"",
            email:"",
            state:"",
            country:"",
            city:"",
            companyName:"Change",
            businessName:warehouses.warehouseCode,
            website:`${warehouses.warehouseCode}.com`,
            address:"",
        }
     })

     return NextResponse.json(warehouses,{status:201})
    } catch (error) {
     return NextResponse.json(error,{status:500})
    }finally{
     await offlinePrisma.$disconnect()
    }
}

export async function PUT(req:NextRequest){
    const data = await req.json()

    //console.log(data)

    // return

    const {warehouseCode,name,phoneNumber,email,description,address} = data
    try {
     const warehouses = await offlinePrisma.warehouses.update({
        where:{
            warehouseCode,isDeleted:false
        },
        data:{
            name,
            warehouseCode,
            phoneNumber,
            email,
            description,
            address
        }
     })
     //console.log(warehouses)
     return NextResponse.json(warehouses,{status:201})
    } catch (error) {
     return NextResponse.json(error,{status:500})
    }finally{
     await offlinePrisma.$disconnect()
    }
}