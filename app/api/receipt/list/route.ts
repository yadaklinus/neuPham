import { NextRequest, NextResponse } from "next/server";

import offlinePrisma from "@/lib/oflinePrisma";
export async function POST(req:NextRequest){

    const {
        warehousesId
    } = await req.json()

    try {

        const data = await offlinePrisma.receiptSettings.findMany({
            where:{warehousesId,isDeleted:false}
        })
        
        return NextResponse.json(warehousesId,{status:200})
        
    } catch (error) {
        return NextResponse.json(error,{status:500})
    }
}