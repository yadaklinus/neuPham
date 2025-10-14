import { NextResponse } from "next/server"

import offlinePrisma from "@/lib/oflinePrisma";


export async function GET(){
    try {
        const users = await offlinePrisma.users.findMany({where:{isDeleted:false}})
        return NextResponse.json(users,{status:200})
    } catch (error) {
        return NextResponse.json(error,{status:500})
    }finally{
        await offlinePrisma.$disconnect()
    }
}