import { NextRequest, NextResponse } from "next/server";
import offlinePrisma from "@/lib/oflinePrisma";
import bcrypt from "bcryptjs";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ userId: string }> }
) {
    try {
        const { newPassword, resetBy } = await req.json();
        const { userId } = await context.params;

        if (!newPassword || !resetBy) {
            return NextResponse.json({ 
                error: "New password and reset by user ID are required" 
            }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ 
                error: "Password must be at least 6 characters long" 
            }, { status: 400 });
        }

        const user = await offlinePrisma.users.findUnique({
            where: { id: userId, isDeleted: false }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update user password
        await offlinePrisma.users.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                sync: false,
                updatedAt: new Date()
            }
        });

        return NextResponse.json({
            success: true,
            message: "Password reset successfully"
        }, { status: 200 });

    } catch (error) {
        console.error("Password reset error:", error);
        return NextResponse.json({ 
            error: "Failed to reset password",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    } finally {
        await offlinePrisma.$disconnect();
    }
}