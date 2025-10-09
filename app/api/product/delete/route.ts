import { NextRequest, NextResponse } from "next/server";

import offlinePrisma from "@/lib/oflinePrisma";



export async function POST(req:NextRequest){
    const {productId} = await req.json()
    try {
        const product = await offlinePrisma.product.findUnique({
            where:{
                id:productId,isDeleted:false
            }
        })

        if(!product) return NextResponse.json("product dose not exist",{status:402})

        const deleteProduct = await offlinePrisma.product.update({
            where:{
                id:productId
            },
            data:{
                isDeleted:true,
                sync:false
            }
        })

        return NextResponse.json(deleteProduct,{status:200})
    } catch (error) {
        return NextResponse.json(error,{status:500})
        
    }finally{
        await offlinePrisma.$disconnect()
    }
}