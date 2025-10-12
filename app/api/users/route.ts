import { PrismaClient as Online } from "@/prisma/generated/online";
import { PrismaClient as Offline } from "@/prisma/generated/offline";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

const prisma = new Online()

const prismaOfline = new Offline()

export async function POST(req:NextRequest){
    const data = await req.json()
    const {username:userName,email,password,role,phone:phoneNumber,warehouse,specialization,licenseNumber,department} = data.formData
    try {
        const existUser = await prisma.users_online.findUnique({where:{userName,isDeleted:false}})

        if(existUser) return NextResponse.json("userNameExist",{status:401})

        const hash = await bcrypt.hash(password,10)
        const staff = await prisma.users_online.create({
            data:{
                userName,
                email,
                password:hash,
                role, // doctor, nurse, pharmacist, admin
                phoneNumber,
                //specialization: specialization || null,
                //licenseNumber: licenseNumber || null,
                //department: department || null,
                warehouses_onlineId:warehouse
            }
        }) 
     return NextResponse.json(staff,{status:201})
    } catch (error) {
     return NextResponse.json(error,{status:500})
    }finally{
     await prisma.$disconnect()
    }
}

export async function GET(){
    try {
        const staff = await prismaOfline.users.findMany({
            where:{isDeleted:false},
            select: {
                id: true,
                userName: true,
                email: true,
                role: true,
                phoneNumber: true,
                // specialization: true,
                // licenseNumber: true,
                // department: true,
                createdAt: true,
                lastLogin: true,
                //isActive: true
            }
        })
        return NextResponse.json(staff,{status:200})
    } catch (error) {
        return NextResponse.json(error,{status:500})
    }finally{
        await prismaOfline.$disconnect()
    }
}