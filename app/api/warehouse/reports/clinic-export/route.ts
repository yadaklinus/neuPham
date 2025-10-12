import { PrismaClient } from "@/prisma/generated/online";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from 'xlsx';

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  try {
    const { 
      warehouseId, 
      reportType, 
      dateFrom, 
      dateTo, 
      format = 'xlsx' 
    } = await req.json()

    // Verify warehouse exists
    const warehouse = await prisma.warehouses_online.findUnique({
      where: { warehouseCode: warehouseId, isDeleted: false }
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: 'Clinic not found' },
        { status: 404 }
      );
    }

    const fromDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = dateTo ? new Date(dateTo) : new Date();

    let reportData: any[] = [];
    let filename = '';
    let headers: string[] = [];

    switch (reportType) {
      case 'consultations':
        const consultations = await prisma.sale_online.findMany({
          where: {
            warehouses_onlineId: warehouseId,
            isDeleted: false,
            createdAt: {
              gte: fromDate,
              lte: toDate
            }
          },
          include: {
            Customer_online: true,
            saleItems: {
              include: {
                Product_online: true
              }
            },
            paymentMethod: true
          },
          orderBy: { createdAt: 'desc' }
        });

        headers = [
          'Consultation ID', 'Date', 'Student Name', 'Matric Number', 
          'Diagnosis', 'Symptoms', 'Treatment', 'Medicines Prescribed',
          'Total Amount', 'Amount Paid', 'Balance', 'Payment Method', 'Status'
        ];

        reportData = consultations.map(consultation => ({
          'Consultation ID': consultation.invoiceNo,
          'Date': consultation.createdAt.toLocaleDateString(),
          'Student Name': consultation.Customer_online?.name || 'Walk-in Patient',
          'Matric Number': consultation.Customer_online?.matricNumber || 'N/A',
          'Diagnosis': consultation.diagnosis || 'General Consultation',
          'Symptoms': consultation.symptoms || 'N/A',
          'Treatment': consultation.treatment || 'N/A',
          'Medicines Prescribed': consultation.saleItems.length,
          'Total Amount': consultation.grandTotal,
          'Amount Paid': consultation.paidAmount,
          'Balance': consultation.balance,
          'Payment Method': consultation.paymentMethod?.[0]?.method || 'cash',
          'Status': consultation.balance === 0 ? 'Paid' : consultation.balance === consultation.grandTotal ? 'Unpaid' : 'Partial'
        }));

        filename = `consultations_report_${warehouse.name}_${fromDate.toISOString().split('T')[0]}_to_${toDate.toISOString().split('T')[0]}`;
        break;

      case 'medicines':
        const medicines = await prisma.product_online.findMany({
          where: {
            warehouses_onlineId: warehouseId,
            isDeleted: false
          },
          include: {
            saleItems: {
              where: {
                createdAt: {
                  gte: fromDate,
                  lte: toDate
                }
              }
            }
          }
        });

        headers = [
          'Medicine Name', 'Barcode', 'Current Stock', 'Unit', 'Cost Price',
          'Retail Price', 'Total Dispensed', 'Revenue Generated', 'Stock Status',
          'Last Dispensed', 'Reorder Level'
        ];

        reportData = medicines.map(medicine => {
          const totalDispensed = medicine.saleItems.reduce((sum, item) => sum + item.quantity, 0);
          const revenue = medicine.saleItems.reduce((sum, item) => sum + item.total, 0);
          const stockStatus = medicine.quantity <= 5 ? 'Critical' : medicine.quantity <= 10 ? 'Low' : 'Good';

          return {
            'Medicine Name': medicine.name,
            'Barcode': medicine.barcode,
            'Current Stock': medicine.quantity,
            'Unit': medicine.unit,
            'Cost Price': medicine.cost,
            'Retail Price': medicine.retailPrice,
            'Total Dispensed': totalDispensed,
            'Revenue Generated': revenue,
            'Stock Status': stockStatus,
            'Last Dispensed': medicine.lastDispensed ? new Date(medicine.lastDispensed).toLocaleDateString() : 'Never',
            'Reorder Level': medicine.reorderLevel || 10
          };
        });

        filename = `medicines_inventory_${warehouse.name}_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'students':
        const students = await prisma.customer_online.findMany({
          where: {
            warehouses_onlineId: warehouseId,
            isDeleted: false
          },
          include: {
            sales: {
              where: {
                createdAt: {
                  gte: fromDate,
                  lte: toDate
                }
              }
            }
          }
        });

        headers = [
          'Student Name', 'Matric Number', 'Department', 'Level', 'Phone',
          'Email', 'Account Balance', 'Total Consultations', 'Total Spent',
          'Last Visit', 'Registration Date'
        ];

        reportData = students.map(student => {
          const totalConsultations = student.sales?.length || 0;
          const totalSpent = student.sales?.reduce((sum, sale) => sum + sale.grandTotal, 0) || 0;
          const lastVisit = student.sales?.length > 0 
            ? new Date(Math.max(...student.sales.map(s => new Date(s.createdAt).getTime()))).toLocaleDateString()
            : 'Never';

          return {
            'Student Name': student.name,
            'Matric Number': student.matricNumber || 'N/A',
            'Department': student.department || 'N/A',
            'Level': student.level || 'N/A',
            'Phone': student.phone,
            'Email': student.email,
            'Account Balance': student.accountBalance || 0,
            'Total Consultations': totalConsultations,
            'Total Spent': totalSpent,
            'Last Visit': lastVisit,
            'Registration Date': student.createdAt.toLocaleDateString()
          };
        });

        filename = `students_report_${warehouse.name}_${fromDate.toISOString().split('T')[0]}_to_${toDate.toISOString().split('T')[0]}`;
        break;

      case 'drug_tracking':
        const trackingRecords = await prisma.stockTracking_online.findMany({
          where: {
            warehouse: {
              warehouseCode: warehouseId
            },
            timestamp: {
              gte: fromDate,
              lte: toDate
            }
          },
          include: {
            product: true,
            staff: true,
            patient: true
          },
          orderBy: { timestamp: 'desc' }
        });

        headers = [
          'Date & Time', 'Medicine Name', 'Action', 'Quantity', 'Previous Stock',
          'New Stock', 'Staff Name', 'Staff Role', 'Patient Name', 'Reason',
          'Dosage', 'Frequency', 'IP Address'
        ];

        reportData = trackingRecords.map(record => ({
          'Date & Time': record.timestamp.toLocaleString(),
          'Medicine Name': record.product?.name || 'Unknown',
          'Action': record.action,
          'Quantity': record.quantity,
          'Previous Stock': record.previousStock,
          'New Stock': record.newStock,
          'Staff Name': record.staff?.userName || 'System',
          'Staff Role': record.staff?.role || 'N/A',
          'Patient Name': record.patient?.name || 'N/A',
          'Reason': record.reason,
          'Dosage': record.dosage || 'N/A',
          'Frequency': record.frequency || 'N/A',
          'IP Address': record.ipAddress || 'N/A'
        }));

        filename = `drug_tracking_${warehouse.name}_${fromDate.toISOString().split('T')[0]}_to_${toDate.toISOString().split('T')[0]}`;
        break;

      case 'security_audit':
        const [suspiciousActivities, stockDiscrepancies] = await Promise.all([
          prisma.suspiciousActivity_online.findMany({
            where: {
              warehouseId: warehouse.id,
              timestamp: {
                gte: fromDate,
                lte: toDate
              }
            },
            include: {
              staff: true,
              product: true
            }
          }),
          // Get stock discrepancies (mock data for now)
          []
        ]);

        headers = [
          'Date & Time', 'Activity Type', 'Severity', 'Description', 'Staff Name',
          'Medicine Name', 'Status', 'Resolved By', 'Resolution Date', 'IP Address'
        ];

        reportData = suspiciousActivities.map(activity => ({
          'Date & Time': activity.timestamp.toLocaleString(),
          'Activity Type': activity.activityType,
          'Severity': activity.severity.toUpperCase(),
          'Description': activity.description,
          'Staff Name': activity.staff?.userName || 'Unknown',
          'Medicine Name': activity.product?.name || 'N/A',
          'Status': activity.resolved ? 'Resolved' : 'Open',
          'Resolved By': activity.resolvedBy || 'N/A',
          'Resolution Date': activity.resolvedAt ? new Date(activity.resolvedAt).toLocaleDateString() : 'N/A',
          'IP Address': activity.ipAddress || 'N/A'
        }));

        filename = `security_audit_${warehouse.name}_${fromDate.toISOString().split('T')[0]}_to_${toDate.toISOString().split('T')[0]}`;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        );
    }

    // Generate Excel file
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, reportType);

    // Add clinic information sheet
    const clinicInfo = {
      'Clinic Name': warehouse.name,
      'Clinic ID': warehouse.warehouseCode,
      'Address': warehouse.address,
      'Phone': warehouse.phoneNumber,
      'Email': warehouse.email,
      'Report Type': reportType.replace('_', ' ').toUpperCase(),
      'Report Period': `${fromDate.toLocaleDateString()} - ${toDate.toLocaleDateString()}`,
      'Generated On': new Date().toLocaleString(),
      'Total Records': reportData.length
    };

    const infoSheet = XLSX.utils.json_to_sheet([clinicInfo]);
    XLSX.utils.book_append_sheet(workbook, infoSheet, 'Clinic Info');

    // Convert to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Return file
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
        'Content-Length': buffer.length.toString()
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get('warehouseId');

    if (!warehouseId) {
      return NextResponse.json(
        { error: 'Warehouse ID is required' },
        { status: 400 }
      );
    }

    // Get available report types and their descriptions
    const reportTypes = [
      {
        id: 'consultations',
        name: 'Consultations Report',
        description: 'Complete consultation records with patient details and treatments',
        fields: ['consultation_id', 'date', 'student', 'diagnosis', 'medicines', 'payment']
      },
      {
        id: 'medicines',
        name: 'Medicine Inventory Report',
        description: 'Current stock levels, dispensing history, and revenue analysis',
        fields: ['medicine_name', 'stock_level', 'dispensed', 'revenue', 'status']
      },
      {
        id: 'students',
        name: 'Student Health Records',
        description: 'Student registration data and consultation history',
        fields: ['student_info', 'consultations', 'spending', 'balance']
      },
      {
        id: 'drug_tracking',
        name: 'Drug Tracking Report',
        description: 'Complete audit trail of all drug movements and staff activities',
        fields: ['timestamp', 'medicine', 'action', 'staff', 'patient', 'reason']
      },
      {
        id: 'security_audit',
        name: 'Security Audit Report',
        description: 'Suspicious activities and security alerts for anti-theft monitoring',
        fields: ['activity_type', 'severity', 'staff', 'medicine', 'status']
      }
    ];

    return NextResponse.json({
      reportTypes,
      supportedFormats: ['xlsx', 'csv'],
      maxDateRange: 365 // days
    });

  } catch (error) {
    console.error('Failed to get report types:', error);
    return NextResponse.json(
      { error: 'Failed to get report information' },
      { status: 500 }
    );
  }
}