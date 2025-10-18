import { NextRequest, NextResponse } from "next/server";


import offlinePrisma from "@/lib/oflinePrisma";


export async function POST(req: NextRequest) {
  try {
    const { warehouseId, reportType, month, year, format = 'csv' } = await req.json();

    if (!warehouseId || !reportType) {
      return NextResponse.json(
        { error: "Warehouse ID and report type are required" },
        { status: 400 }
      );
    }

    // Find warehouse by code or id, ensuring it's not deleted.
    // The model name is corrected to `Warehouses` to match the schema.
    let warehouse = await offlinePrisma.warehouses.findFirst({
      where: {
        OR: [
          { warehouseCode: warehouseId, isDeleted: false },
          { id: warehouseId, isDeleted: false }
        ]
      }
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }

    let csvData = '';
    let filename = '';

    if (reportType === 'inventory') {
      // Corrected model name from `products` to `Product`.
      // Corrected relation field from `warehousesId` to `warehousesId`.
      const products = await offlinePrisma.product.findMany({
        where: {
          warehousesId: warehouse.warehouseCode,
          isDeleted: false
        },
        orderBy: {
          name: 'asc'
        }
      });

      // CSV headers (removed price-related columns)
      csvData = 'Product Name,Barcode,Quantity,Unit,Status,Last Updated\n';
      
      // CSV rows
      products.forEach(product => {
        const status = product.quantity === 0 ? 'Out of Stock' : product.quantity <= 10 ? 'Low Stock' : 'In Stock';
        const lastUpdated = new Date(product.updatedAt).toLocaleDateString();
        
        csvData += `"${product.name}","${product.barcode}",${product.quantity},"${product.unit}","${status}","${lastUpdated}"\n`;
      });

      filename = `${warehouse.warehouseCode}_inventory_${new Date().toISOString().split('T')[0]}.csv`;
    }

    else if (reportType === 'sales') {
      if (!month || !year) {
        return NextResponse.json(
          { error: "Month and year are required for sales reports" },
          { status: 400 }
        );
      }

      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

      // Corrected model name from `sale` to `Sale`.
      // Corrected relation field from `warehousesId` to `warehousesId`.
      // Corrected included relation names from `product` to `Product` and `selectedCustomer` to `Customer`.
      const sales = await offlinePrisma.consultation.findMany({
        where: {
          warehousesId: warehouse.warehouseCode,
          isDeleted: false,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          consultationItems: {
            include: {
              product: true // Corrected relation name
            }
          },
          selectedStudent: true // Corrected relation name
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // CSV headers (removed money-related columns)
      csvData = 'Invoice No,Date,Student,Student Matric,Items Count,Diagnosis,Status\n';
      
      // CSV rows
      sales.forEach((sale:any) => {
        const status = sale.balance === 0 ? 'Completed' : sale.balance === sale.grandTotal ? 'Pending' : 'Partial';
        const date = new Date(sale.createdAt).toLocaleDateString();
        const student = sale.selectedStudent?.name || 'Walk-in Patient';
        const matricNumber = sale.selectedStudent?.matricNumber || 'N/A';
        const diagnosis = sale.diagnosis || 'Not specified';
        
        csvData += `"${sale.invoiceNo}","${date}","${student}","${matricNumber}",${sale.consultationItems.length},"${diagnosis}","${status}"\n`;
      });

      filename = `${warehouse.warehouseCode}_sales_${year}_${month.toString().padStart(2, '0')}.csv`;
    }

    else if (reportType === 'monthly') {
      if (!month || !year) {
        return NextResponse.json(
          { error: "Month and year are required for monthly reports" },
          { status: 400 }
        );
      }

      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

      // Get inventory data - Corrected model and field names
      const products = await offlinePrisma.product.findMany({
        where: {
          warehousesId: warehouse.warehouseCode,
          isDeleted: false
        },
        orderBy: {
          name: 'asc'
        }
      });

      // Get sales data - Corrected model, field, and include names
      const sales = await offlinePrisma.consultation.findMany({
        where: {
          warehousesId: warehouse.warehouseCode,
          isDeleted: false,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          consultationItems: {
            include: {
              product: true // Corrected relation name
            }
          },
          selectedStudent: true // Corrected relation name
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Create comprehensive monthly report
      csvData = 'MONTHLY REPORT\n';
      csvData += `Warehouse: ${warehouse.name} (${warehouse.warehouseCode})\n`;
      csvData += `Period: ${new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}\n`;
      csvData += `Generated: ${new Date().toLocaleDateString()}\n\n`;

      // Summary section (removed money-related data)
      const totalQuantityDispensed = sales.reduce((sum:any, s:any) => sum + (s.consultationItems?.reduce((itemSum:any, item:any) => itemSum + item.quantity, 0) || 0), 0);
      const totalMedicinesInStock = products.reduce((sum:any, p:any) => sum + p.quantity, 0);
      
      csvData += 'SUMMARY\n';
      csvData += `Report Period,${new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}\n`;
      csvData += `Total Medicines,${products.length}\n`;
      csvData += `Total Consultations,${sales.length}\n`;
      csvData += `Total Medicines Dispensed,${totalQuantityDispensed}\n`;
      csvData += `Total Medicines in Stock,${totalMedicinesInStock}\n`;
      csvData += `Low Stock Items,${products.filter(p => p.quantity <= 10).length}\n`;
      csvData += `Out of Stock Items,${products.filter(p => p.quantity === 0).length}\n\n`;

      // Inventory section (removed price-related data)
      csvData += 'INVENTORY\n';
      csvData += 'Product Name,Barcode,Quantity,Unit,Status,Last Updated\n';
      
      products.forEach(product => {
        const status = product.quantity === 0 ? 'Out of Stock' : product.quantity <= 10 ? 'Low Stock' : 'In Stock';
        const lastUpdated = new Date(product.updatedAt).toLocaleDateString();
        
        csvData += `"${product.name}","${product.barcode}",${product.quantity},"${product.unit}","${status}","${lastUpdated}"\n`;
      });

      csvData += '\nCONSULTATIONS\n';
      csvData += 'Invoice No,Date,Student,Student Matric,Items Count,Diagnosis,Status\n';
      
      sales.forEach(sale => {
        const status = sale.balance === 0 ? 'Completed' : sale.balance === sale.grandTotal ? 'Pending' : 'Partial';
        const date = new Date(sale.createdAt).toLocaleDateString();
        const student = sale.selectedStudent?.name || 'Walk-in Patient';
        const matricNumber = sale.selectedStudent?.matricNumber || 'N/A';
        const diagnosis = sale.diagnosis || 'Not specified';
        
        csvData += `"${sale.invoiceNo}","${date}","${student}","${matricNumber}",${sale.consultationItems.length},"${diagnosis}","${status}"\n`;
      });

      // Add detailed consultation items section
      csvData += '\nDETAILED CONSULTATION ITEMS\n';
      csvData += 'Invoice No,Date,Student,Medicine Name,Quantity Dispensed,Dosage,Frequency,Duration\n';
      
      sales.forEach(sale => {
        const date = new Date(sale.createdAt).toLocaleDateString();
        const student = sale.selectedStudent?.name || 'Walk-in Patient';
        
        sale.consultationItems.forEach((item:any) => {
          csvData += `"${sale.invoiceNo}","${date}","${student}","${item.productName}",${item.quantity},"${item.dosage || 'N/A'}","${item.frequency || 'N/A'}","${item.duration || 'N/A'}"\n`;
        });
      });

      filename = `${warehouse.warehouseCode}_monthly_report_${year}_${month.toString().padStart(2, '0')}.csv`;
    }

    else {
      return NextResponse.json(
        { error: "Invalid report type. Supported types: inventory, sales, monthly" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      csvData,
      filename,
      warehouse: {
        id: warehouse.id,
        warehouseCode: warehouse.warehouseCode,
        name: warehouse.name
      }
    }, { status: 200 });

  } catch (error) {
    console.error("Error exporting report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    // Disconnecting the Prisma client is generally not recommended in serverless environments
    // as it can affect performance by closing and reopening connections for each request.
    // await offlinePrisma.$disconnect();
  }
}
