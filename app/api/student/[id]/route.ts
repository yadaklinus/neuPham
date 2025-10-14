import { NextRequest, NextResponse } from "next/server";
import offlinePrisma from "@/lib/oflinePrisma";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const {id} = await context.params
        const student = await offlinePrisma.student.findUnique({
            where: { id: id, isDeleted: false },
            include: {
                Consultation: {
                    where: { isDeleted: false },
                    orderBy: { createdAt: 'desc' },
                    include: {
                        consultationItems: {
                            include: {
                                product: {
                                    select: {
                                        name: true,
                                        barcode: true
                                    }
                                }
                            }
                        },
                        paymentMethod: true
                    }
                },
                balanceTransaction: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!student) {
            return NextResponse.json("Student not found", { status: 404 });
        }

        return NextResponse.json(student, { status: 200 });
    } catch (error) {
        console.error("Student fetch error:", error);
        return NextResponse.json(error, { status: 500 });
    } finally {
        await offlinePrisma.$disconnect();
    }
}

export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const {id} = await context.params
    try {
        const {
            name,
            matricNumber,
            email,
            phone,
            address,
            bloodGroup,
            genotype,
            allergies,
            emergencyContact,
            emergencyPhone,
            department,
            level
        } = await req.json();

        const existingStudent = await offlinePrisma.student.findUnique({
            where: { id: id, isDeleted: false }
        });

        if (!existingStudent) {
            return NextResponse.json("Student does not exist", { status: 404 });
        }

        const updatedStudent = await offlinePrisma.student.update({
            where: { id: id },
            data: {
                name,
                matricNumber,
                email,
                phone,
                address,
                bloodGroup,
                genotype,
                allergies,
                emergencyContact,
                emergencyPhone,
                department,
                level,
                sync: false,
                syncedAt: null,
                updatedAt: new Date()
            }
        });

        return NextResponse.json({
            message: "Student updated successfully",
            student: updatedStudent
        }, { status: 200 });
    } catch (error) {
        console.error("Student update error:", error);
        return NextResponse.json(error, { status: 500 });
    } finally {
        await offlinePrisma.$disconnect();
    }
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const {id} = await context.params
        const student = await offlinePrisma.student.findUnique({
            where: { id: id }
        });

        if (!student) {
            return NextResponse.json("Student does not exist", { status: 404 });
        }

        const deletedStudent = await offlinePrisma.student.update({
            where: { id: id },
            data: {
                isDeleted: true,
                sync: false,
                syncedAt: null,
                updatedAt: new Date()
            }
        });

        return NextResponse.json({
            message: "Student deleted successfully",
            student: deletedStudent
        }, { status: 200 });
    } catch (error) {
        console.error("Student deletion error:", error);
        return NextResponse.json(error, { status: 500 });
    } finally {
        await offlinePrisma.$disconnect();
    }
}