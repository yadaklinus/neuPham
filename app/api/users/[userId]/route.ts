import { NextRequest, NextResponse } from "next/server";
import offlinePrisma from "@/lib/oflinePrisma";
import bcrypt from "bcryptjs";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await context.params;
        
        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }
        
        const user = await offlinePrisma.users.findUnique({
            where: { 
                id: userId, 
                isDeleted: false 
            },
            select: {
                id: true,
                userName: true,
                email: true,
                phoneNumber: true,
                role: true,
                warehousesId: true,
                lastLogin: true,
                createdAt: true,
                updatedAt: true,
                warehouses: {
                    select: {
                        id: true,
                        name: true,
                        warehouseCode: true
                    }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: user
        }, { status: 200 });
        
    } catch (error) {
        console.error("User fetch error:", error);
        return NextResponse.json({ 
            error: "Failed to fetch user",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    } finally {
        await offlinePrisma.$disconnect();
    }
}

export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ userId: string }> }
) {
    try {
        const {
            userName,
            email,
            phoneNumber,
            role,
            warehousesId
        } = await req.json();

        const { userId } = await context.params;

        const existingUser = await offlinePrisma.users.findUnique({
            where: { id: userId, isDeleted: false }
        });

        if (!existingUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Check if username or email already exists (excluding current user)
        if (userName && userName !== existingUser.userName) {
            const existingUserName = await offlinePrisma.users.findFirst({
                where: { 
                    userName: userName, 
                    isDeleted: false,
                    id: { not: userId }
                }
            });
            if (existingUserName) {
                return NextResponse.json({ error: "Username already exists" }, { status: 400 });
            }
        }

        if (email && email !== existingUser.email) {
            const existingEmail = await offlinePrisma.users.findFirst({
                where: { 
                    email: email, 
                    isDeleted: false,
                    id: { not: userId }
                }
            });
            if (existingEmail) {
                return NextResponse.json({ error: "Email already exists" }, { status: 400 });
            }
        }

        const updatedUser = await offlinePrisma.users.update({
            where: { id: userId },
            data: {
                userName: userName || existingUser.userName,
                email: email || existingUser.email,
                phoneNumber: phoneNumber || existingUser.phoneNumber,
                role: role || existingUser.role,
                warehousesId: warehousesId || existingUser.warehousesId,
                sync: false,
                updatedAt: new Date()
            },
            select: {
                id: true,
                userName: true,
                email: true,
                phoneNumber: true,
                role: true,
                warehousesId: true,
                lastLogin: true,
                createdAt: true,
                updatedAt: true
            }
        });

        return NextResponse.json({
            success: true,
            message: "User updated successfully",
            data: updatedUser
        }, { status: 200 });
    } catch (error) {
        console.error("User update error:", error);
        return NextResponse.json({ 
            error: "Failed to update user",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    } finally {
        await offlinePrisma.$disconnect();
    }
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ userId: string }> }
) {
    const { userId } = await context.params;

    try {
        const { deletedBy } = await req.json();

        if (!deletedBy) {
            return NextResponse.json({ error: "Deleter user ID is required." }, { status: 400 });
        }

        const user = await offlinePrisma.users.findUnique({
            where: { id: userId, isDeleted: false }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Soft delete the user
        await offlinePrisma.users.update({
            where: { id: userId },
            data: { 
                isDeleted: true,
                sync: false,
                updatedAt: new Date()
            }
        });

        return NextResponse.json({
            success: true,
            message: "User deleted successfully"
        }, { status: 200 });
    } catch (error: any) {
        console.error("User deletion error:", error);
        return NextResponse.json({ 
            error: error.message || "Failed to delete user" 
        }, { status: 500 });
    } finally {
        await offlinePrisma.$disconnect();
    }
}