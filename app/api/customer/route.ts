import { NextRequest, NextResponse } from "next/server";
import offlinePrisma from "@/lib/oflinePrisma";
import { markCustomerAsUnsynced } from "@/lib/sync-helpers";

export async function GET(req: NextRequest) {
    try {
        const students = await offlinePrisma.customer.findMany({
            where: { isDeleted: false }
        });
        
       
        return NextResponse.json(students, { status: 200 });
    } catch (error) {
        console.error("Student fetch error:", error);
        return NextResponse.json(error, { status: 500 });
    } finally {
        await offlinePrisma.$disconnect();
    }
}

export async function POST(req:NextRequest){
    const {
        address,
        department,
        email,
        name,
        phone,
        matricNumber,
        level,
        dateOfBirth,
        emergencyContact,
        bloodGroup,
        allergies,
        medicalHistory,
        userType,
        warehouseId
    } = await req.json()

    try {
        const newStudent = await offlinePrisma.customer.create({
            data:{
                name,
                type:userType || 'undergraduate',
                matricNumber,
                department,
                level,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                emergencyContact,
                bloodGroup,
                allergies,
                medicalHistory,
                email,
                address,
                warehousesId:warehouseId,
                phone:phone,
                sync: false, // New students should be marked as unsynced
                syncedAt: null
            }
        })

        
        //console.log(`New student created: ${newStudent.id} - marked as unsynced`);
        
        return NextResponse.json({
            message: "Student registered successfully",
            student: newStudent
        }, {status:201})
    } catch (error) {
        console.error("Student registration error:", error);
        return NextResponse.json(error, {status:500})
    } finally {
        await offlinePrisma.$disconnect()
    }
}

export async function PUT(req: NextRequest) {
    const {
        customerId: studentId,
        address,
        department,
        email,
        name,
        phone,
        matricNumber,
        level,
        dateOfBirth,
        emergencyContact,
        bloodGroup,
        allergies,
        medicalHistory,
        userType
    } = await req.json();

    try {
        // Check if student exists
        const existingStudent = await offlinePrisma.customer.findUnique({
            where: { id: studentId, isDeleted: false }
        });

        if (!existingStudent) {
            return NextResponse.json("Student does not exist", { status: 404 });
        }

        // Update the student
        const updatedStudent = await offlinePrisma.customer.update({
            where: { id: studentId },
            data: {
                name,
                type: userType,
                matricNumber,
                department,
                level,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                emergencyContact,
                bloodGroup,
                allergies,
                medicalHistory,
                email,
                address,
                phone,
                sync: false, // Mark as unsynced since it was updated
                syncedAt: null,
                updatedAt: new Date()
            }
        });

        //console.log(`Student updated: ${studentId} - marked as unsynced`);

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

export async function DELETE(req: NextRequest) {
    const { customerId: studentId } = await req.json();

    try {
        const student = await offlinePrisma.customer.findUnique({
            where: { id: studentId }
        });

        if (!student) {
            return NextResponse.json("Student does not exist", { status: 404 });
        }

        const deletedStudent = await offlinePrisma.customer.update({
            where: { id: studentId },
            data: {
                isDeleted: true,
                sync: false, // Mark as unsynced to sync the deletion
                syncedAt: null,
                updatedAt: new Date()
            }
        });

        //console.log(`Student deleted: ${studentId} - marked as unsynced for deletion sync`);

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