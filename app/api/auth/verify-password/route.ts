import { NextRequest, NextResponse } from "next/server";
import offlinePrisma from "@/lib/oflinePrisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
    try {
        const { userId, password } = await req.json();

        if (!userId || !password) {
            return NextResponse.json({ 
                error: "User ID and password are required" 
            }, { status: 400 });
        }

        // Find the user
        const user = await offlinePrisma.superAdmin.findUnique({
            where: { 
                id: userId, 
                isDeleted: false 
            },
            select: {
                id: true,
                password: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Verify the password
        //const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!(user.password === password)) {
            return NextResponse.json({ error: "Invalid password" }, { status: 401 });
        }

        return NextResponse.json({
            success: true,
            message: "Password verified successfully"
        }, { status: 200 });

    } catch (error) {
        console.error("Password verification error:", error);
        return NextResponse.json({ 
            error: "Failed to verify password",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    } finally {
        await offlinePrisma.$disconnect();
    }
}