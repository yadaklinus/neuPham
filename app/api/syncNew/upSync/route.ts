import { NextRequest, NextResponse } from "next/server";
import pMap from "p-map";

import onlinePrisma from "@/lib/onlinePrisma";
import offlinePrisma from "@/lib/oflinePrisma";

interface SyncProgress {
  entity: string;
  completed: number;
  total: number;
  status: 'pending' | 'syncing' | 'completed' | 'error' | 'skipped';
  error?: string;
}

interface SyncResult {
  success: boolean;
  totalEntities: number;
  completedEntities: number;
  skippedEntities: number;
  progress: SyncProgress[];
  errors: string[];
  warnings: string[];
  startTime: Date;
  endTime?: Date;
  duration?: number;
  mode: 'full' | 'offline-only' | 'online-only';
  connectivityStatus: {
    online: boolean;
    offline: boolean;
  };
}

// Global sync state (in production, use Redis or database)
let currentSyncStatus: SyncResult | null = null;
let isSyncing = false;

// Helper function to check connection availability
async function checkConnectionAvailability() {
  const results = {
    online: false,
    offline: false
  };

  try {
    await onlinePrisma.$queryRaw`SELECT 1`;
    results.online = true;
    console.log("Online database connection available");
  } catch (error) {
    console.log("Online database connection not available:", error instanceof Error ? error.message : 'Unknown error');
  }

  try {
    await offlinePrisma.$queryRaw`SELECT 1`;
    results.offline = true;
    console.log("Offline database connection available");
  } catch (error) {
    console.log("Offline database connection not available:", error instanceof Error ? error.message : 'Unknown error');
  }

  return results;
}

// Enhanced connection function that doesn't throw on partial failure
async function ensureAvailableConnections(maxRetries = 3) {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const connectivity = await checkConnectionAvailability();
      
      if (!connectivity.offline && !connectivity.online) {
        throw new Error("Neither online nor offline database connections are available");
      }
      
      if (!connectivity.offline) {
        console.warn("Warning: Offline database not available. Some operations will be skipped.");
      }
      
      if (!connectivity.online) {
        console.warn("Warning: Online database not available. Running in offline mode.");
      }
      
      return connectivity;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown connection error');
      console.error(`Connection attempt ${attempt} failed:`, lastError.message);
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  throw lastError || new Error("Connection failed after all attempts");
}

// Safe upsert with error handling
async function safeUpsert<T>(
  operation: () => Promise<T>,
  entityName: string,
  entityId: string | number,
  maxRetries = 2
): Promise<{ success: boolean; error?: string }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await operation();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`${entityName} upsert failed for ID ${entityId}, attempt ${attempt}:`, errorMessage);
      
      if (attempt === maxRetries) {
        return { success: false, error: errorMessage };
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  return { success: false, error: 'Max retries exceeded' };
}

// Update sync progress
function updateProgress(entityName: string, completed: number, total: number, status: SyncProgress['status'], error?: string) {
  if (!currentSyncStatus) return;
  
  const progressIndex = currentSyncStatus.progress.findIndex(p => p.entity === entityName);
  if (progressIndex >= 0) {
    currentSyncStatus.progress[progressIndex] = {
      entity: entityName,
      completed,
      total,
      status,
      error
    };
  }
  
  // Update overall progress
  const completedEntities = currentSyncStatus.progress.filter(p => p.status === 'completed').length;
  const skippedEntities = currentSyncStatus.progress.filter(p => p.status === 'skipped').length;
  currentSyncStatus.completedEntities = completedEntities;
  currentSyncStatus.skippedEntities = skippedEntities;
}

// Sync entities that require offline to online (up sync)
async function syncUpstreamEntities(connectivity: { online: boolean; offline: boolean }) {
  if (!connectivity.online) {
    console.log("Skipping upstream sync - online database not available");
    
    // Mark upstream entities as skipped
    const upstreamEntities = ['products', 'student', 'suppliers', 'consultation', 'purchases', 'consultationItems', 'purchaseItems', 'paymentMethods', 'balancePayment'];
    upstreamEntities.forEach(entity => {
      updateProgress(entity, 0, 0, 'skipped', 'Online database not available');
      currentSyncStatus?.warnings.push(`${entity} sync skipped - online database not available`);
    });
    return;
  }

  if (!connectivity.offline) {
    console.log("Cannot perform upstream sync - offline database not available");
    const upstreamEntities = ['products', 'student', 'suppliers', 'consultation', 'purchases', 'consultationItems', 'purchaseItems', 'paymentMethods', 'balancePayment'];
    upstreamEntities.forEach(entity => {
      updateProgress(entity, 0, 0, 'skipped', 'Offline database not available');
      currentSyncStatus?.warnings.push(`${entity} sync skipped - offline database not available`);
    });
    return;
  }

  // 3. Products (Up sync - offline to online)
  updateProgress('products', 0, 0, 'syncing');
  try {
    console.log("Starting products sync...");
    const products = await offlinePrisma.product.findMany({ where: { sync: false } });
    updateProgress('products', 0, products.length, 'syncing');
    
    if (products.length > 0) {
      let productErrors = 0;
      const successfulIds: string[] = [];
      
      await pMap(products, async (data, index) => {
        const { warehousesId: warehouses_onlineId, ...rest } = data;
        const result = await safeUpsert(
          () => onlinePrisma.product_online.upsert({
            where: { id: data.id },
            update: { ...rest, warehouses_onlineId, syncedAt: new Date(), sync: true },
            create: { ...rest, warehouses_onlineId, syncedAt: new Date(), sync: true },
          }),
          'products',
          data.id
        );
        
        if (result.success) {
          successfulIds.push(data.id);
        } else {
          productErrors++;
          currentSyncStatus?.errors.push(`Product ${data.id}: ${result.error}`);
        }
        
        updateProgress('products', index + 1, products.length, 'syncing');
      }, { concurrency: 2 });
      
      // Update sync status for successful products only
      if (successfulIds.length > 0) {
        await offlinePrisma.product.updateMany({
          where: { id: { in: successfulIds } },
          data: { sync: true }
        });
      }
      
      console.log(`Synced ${successfulIds.length} products (${productErrors} errors)`);
    }
    
    updateProgress('products', products.length, products.length, 'completed');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    updateProgress('products', 0, 0, 'error', errorMessage);
    currentSyncStatus?.errors.push(`Products sync failed: ${errorMessage}`);
  }

  // Add other upstream entities (student, suppliers, consultation, etc.) following the same pattern...
  // For brevity, I'll show just the student example:

  // 4. student (Up sync - offline to online)
  updateProgress('student', 0, 0, 'syncing');
  try {
    console.log("Starting student sync...");
    const student = await offlinePrisma.student.findMany({ where: { sync: false } });
    updateProgress('student', 0, student.length, 'syncing');
    
    if (student.length > 0) {
      let customerErrors = 0;
      const successfulIds: string[] = [];
      
      await pMap(student, async (data, index) => {
        const { warehousesId, ...rest } = data;
        const result = await safeUpsert(
          () => onlinePrisma.student_online.upsert({
            where: { id: data.id },
            update: { ...rest, warehousesId, syncedAt: new Date(), sync: true },
            create: { ...rest, warehousesId, syncedAt: new Date(), sync: true },
          }),
          'student',
          data.id
        );
        
        if (result.success) {
          successfulIds.push(data.id);
        } else {
          customerErrors++;
          currentSyncStatus?.errors.push(`Customer ${data.id}: ${result.error}`);
        }
        
        updateProgress('student', index + 1, student.length, 'syncing');
      }, { concurrency: 2 });
      
      if (successfulIds.length > 0) {
        await offlinePrisma.student.updateMany({
          where: { id: { in: successfulIds } },
          data: { sync: true }
        });
      }
      
      console.log(`Synced ${successfulIds.length} student (${customerErrors} errors)`);
    }
    
    updateProgress('student', student.length, student.length, 'completed');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    updateProgress('student', 0, 0, 'error', errorMessage);
    currentSyncStatus?.errors.push(`student sync failed: ${errorMessage}`);
  }

  updateProgress('suppliers', 0, 0, 'syncing');
  try {
    console.log("Starting suppliers sync...");
    const suppliers = await offlinePrisma.supplier.findMany({ where: { sync: false } });
    updateProgress('suppliers', 0, suppliers.length, 'syncing');
    
    if (suppliers.length > 0) {
      let supplierErrors = 0;
      const successfulIds: string[] = [];
      
      await pMap(suppliers, async (data, index) => {
        const { warehousesId: warehouses_onlineId, ...rest } = data;
        const result = await safeUpsert(
          () => onlinePrisma.supplier_online.upsert({
            where: { id: data.id },
            update: { ...rest, warehouses_onlineId, syncedAt: new Date(), sync: true },
            create: { ...rest, warehouses_onlineId, syncedAt: new Date(), sync: true },
          }),
          'suppliers',
          data.id
        );
        
        if (result.success) {
          successfulIds.push(data.id);
        } else {
          supplierErrors++;
          currentSyncStatus?.errors.push(`Supplier ${data.id}: ${result.error}`);
        }
        
        updateProgress('suppliers', index + 1, suppliers.length, 'syncing');
      }, { concurrency: 2 });
      
      if (successfulIds.length > 0) {
        await offlinePrisma.supplier.updateMany({
          where: { id: { in: successfulIds } },
          data: { sync: true }
        });
      }
      
      console.log(`Synced ${successfulIds.length} suppliers (${supplierErrors} errors)`);
    }
    
    updateProgress('suppliers', suppliers.length, suppliers.length, 'completed');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    updateProgress('suppliers', 0, 0, 'error', errorMessage);
    currentSyncStatus?.errors.push(`Suppliers sync failed: ${errorMessage}`);
  }
  
  //consultation
  updateProgress('consultation', 0, 0, 'syncing');
  try {
    console.log("Starting consultation sync...");
    const consultation = await offlinePrisma.consultation.findMany({ where: { sync: false } });
    updateProgress('consultation', 0, consultation.length, 'syncing');
  
    if (consultation.length > 0) {
      let consultationErrors = 0;
      const successfulInvoiceNos: string[] = [];
  
      await pMap(consultation, async (data, index) => {
        const { warehousesId: warehousesId, ...rest } = data;
        const result = await safeUpsert(
          () => onlinePrisma.consultation_online.upsert({
            where: { invoiceNo: data.invoiceNo },
            update: { ...rest, warehousesId, syncedAt: new Date(), sync: true },
            create: { ...rest, warehousesId, syncedAt: new Date(), sync: true },
          }),
          'consultation',
          data.invoiceNo
        );
  
        if (result.success) {
          successfulInvoiceNos.push(data.invoiceNo);
        } else {
          consultationErrors++;
          currentSyncStatus?.errors.push(`Sale ${data.invoiceNo}: ${result.error}`);
        }
  
        updateProgress('consultation', index + 1, consultation.length, 'syncing');
      }, { concurrency: 2 });
  
      if (successfulInvoiceNos.length > 0) {
        await offlinePrisma.consultation.updateMany({
          where: { invoiceNo: { in: successfulInvoiceNos } },
          data: { sync: true }
        });
      }
  
      console.log(`Synced ${successfulInvoiceNos.length} consultation (${consultationErrors} errors)`);
    }
  
    updateProgress('consultation', consultation.length, consultation.length, 'completed');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    updateProgress('consultation', 0, 0, 'error', errorMessage);
    currentSyncStatus?.errors.push(`consultation sync failed: ${errorMessage}`);
  }
  
  //Purchase
  updateProgress('purchases', 0, 0, 'syncing');
  try {
    console.log("Starting purchases sync...");
    const purchases = await offlinePrisma.purchase.findMany({ where: { sync: false } });
    updateProgress('purchases', 0, purchases.length, 'syncing');
  
    if (purchases.length > 0) {
      let purchaseErrors = 0;
      const successfulReferenceNos: string[] = [];
  
      await pMap(purchases, async (data, index) => {
        const { warehousesId: warehouses_onlineId, supplierId: supplier_onlineId, ...rest } = data;
        const result = await safeUpsert(
          () => onlinePrisma.purchase_online.upsert({
            where: { referenceNo: data.referenceNo },
            update: { ...rest, warehouses_onlineId, supplier_onlineId, syncedAt: new Date(), sync: true },
            create: { ...rest, warehouses_onlineId, supplier_onlineId, syncedAt: new Date(), sync: true },
          }),
          'purchases',
          data.referenceNo
        );
  
        if (result.success) {
          successfulReferenceNos.push(data.referenceNo);
        } else {
          purchaseErrors++;
          currentSyncStatus?.errors.push(`Purchase ${data.referenceNo}: ${result.error}`);
        }
  
        updateProgress('purchases', index + 1, purchases.length, 'syncing');
      }, { concurrency: 2 });
  
      if (successfulReferenceNos.length > 0) {
        await offlinePrisma.purchase.updateMany({
          where: { referenceNo: { in: successfulReferenceNos } },
          data: { sync: true }
        });
      }
  
      console.log(`Synced ${successfulReferenceNos.length} purchases (${purchaseErrors} errors)`);
    }
  
    updateProgress('purchases', purchases.length, purchases.length, 'completed');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    updateProgress('purchases', 0, 0, 'error', errorMessage);
    currentSyncStatus?.errors.push(`Purchases sync failed: ${errorMessage}`);
  }
  
  // consultationItems
  updateProgress('consultationItems', 0, 0, 'syncing');
  try {
    console.log("Starting sale items sync...");
    const consultationItems = await offlinePrisma.consultationItem.findMany({ where: { sync: false } });
    updateProgress('consultationItems', 0, consultationItems.length, 'syncing');
  
    if (consultationItems.length > 0) {
      let saleItemErrors = 0;
      const successfulIds: string[] = [];
  
      await pMap(consultationItems, async (data, index) => {
        const { 
          warehousesId: warehouses_onlineId, 
          consultationId: consultationId, 
          studentId: studentId, 
          productId: productId, 
          ...rest 
        } = data;
  
        const result = await safeUpsert(
          () => onlinePrisma.consultationItem_online.upsert({
            where: { id: data.id },
            update: { ...rest, syncedAt: new Date(), sync: true },
            create: { ...rest, syncedAt: new Date(), sync: true },
          }),
          'consultationItems',
          data.id
        );
  
        if (result.success) {
          successfulIds.push(data.id);
        } else {
          saleItemErrors++;
          currentSyncStatus?.errors.push(`Sale Item ${data.id}: ${result.error}`);
        }
  
        updateProgress('consultationItems', index + 1, consultationItems.length, 'syncing');
      }, { concurrency: 2 });
  
      if (successfulIds.length > 0) {
        await offlinePrisma.consultationItem.updateMany({
          where: { id: { in: successfulIds } },
          data: { sync: true }
        });
      }
  
      console.log(`Synced ${successfulIds.length} sale items (${saleItemErrors} errors)`);
    }
  
    updateProgress('consultationItems', consultationItems.length, consultationItems.length, 'completed');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    updateProgress('consultationItems', 0, 0, 'error', errorMessage);
    currentSyncStatus?.errors.push(`Sale Items sync failed: ${errorMessage}`);
  }
  
  //PurchaseItems
  
  updateProgress('purchaseItems', 0, 0, 'syncing');
  try {
    console.log("Starting purchase items sync...");
    const purchaseItems = await offlinePrisma.purchaseItem.findMany({ where: { sync: false } });
    updateProgress('purchaseItems', 0, purchaseItems.length, 'syncing');
  
    if (purchaseItems.length > 0) {
      let purchaseItemErrors = 0;
      const successfulIds: string[] = [];
  
      await pMap(purchaseItems, async (data, index) => {
        const { 
          warehousesId: warehouses_onlineId, 
          purchaseId: purchase_onlineId, 
          productId: product_onlineId, 
          ...rest 
        } = data;
  
        const result = await safeUpsert(
          () => onlinePrisma.purchaseItem_online.upsert({
            where: { id: data.id },
            update: { ...rest, warehouses_onlineId, product_onlineId, purchase_onlineId, syncedAt: new Date(), sync: true },
            create: { ...rest, warehouses_onlineId, product_onlineId, purchase_onlineId, syncedAt: new Date(), sync: true },
          }),
          'purchaseItems',
          data.id
        );
  
        if (result.success) {
          successfulIds.push(data.id);
        } else {
          purchaseItemErrors++;
          currentSyncStatus?.errors.push(`Purchase Item ${data.id}: ${result.error}`);
        }
  
        updateProgress('purchaseItems', index + 1, purchaseItems.length, 'syncing');
      }, { concurrency: 2 });
  
      if (successfulIds.length > 0) {
        await offlinePrisma.purchaseItem.updateMany({
          where: { id: { in: successfulIds } },
          data: { sync: true }
        });
      }
  
      console.log(`Synced ${successfulIds.length} purchase items (${purchaseItemErrors} errors)`);
    }
  
    updateProgress('purchaseItems', purchaseItems.length, purchaseItems.length, 'completed');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    updateProgress('purchaseItems', 0, 0, 'error', errorMessage);
    currentSyncStatus?.errors.push(`Purchase Items sync failed: ${errorMessage}`);
  }
  
  //PaymentMethod
  updateProgress('paymentMethods', 0, 0, 'syncing');
  try {
    console.log("Starting payment methods sync...");
    const paymentMethods = await offlinePrisma.paymentMethod.findMany({ where: { sync: false } });
    updateProgress('paymentMethods', 0, paymentMethods.length, 'syncing');
  
    if (paymentMethods.length > 0) {
      let paymentMethodErrors = 0;
      const successfulIds: string[] = [];
  
      await pMap(paymentMethods, async (data, index) => {
        const { 
          warehousesId: warehouses_onlineId, 
          consultationId: consultation_onlineId, 
          ...rest 
        } = data;
  
        const result = await safeUpsert(
          () => onlinePrisma.paymentMethod_online.upsert({
            where: { id: data.id },
            update: { ...rest, warehouses_onlineId, consultation_onlineId, syncedAt: new Date(), sync: true },
            create: { ...rest, warehouses_onlineId, consultation_onlineId, syncedAt: new Date(), sync: true },
          }),
          'paymentMethods',
          data.id
        );
  
        if (result.success) {
          successfulIds.push(data.id);
        } else {
          paymentMethodErrors++;
          currentSyncStatus?.errors.push(`Payment Method ${data.id}: ${result.error}`);
        }
  
        updateProgress('paymentMethods', index + 1, paymentMethods.length, 'syncing');
      }, { concurrency: 2 });
  
      if (successfulIds.length > 0) {
        await offlinePrisma.paymentMethod.updateMany({
          where: { id: { in: successfulIds } },
          data: { sync: true }
        });
      }
  
      console.log(`Synced ${successfulIds.length} payment methods (${paymentMethodErrors} errors)`);
    }
  
    updateProgress('paymentMethods', paymentMethods.length, paymentMethods.length, 'completed');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    updateProgress('paymentMethods', 0, 0, 'error', errorMessage);
    currentSyncStatus?.errors.push(`Payment Methods sync failed: ${errorMessage}`);
  }
  
}

export async function POST(req: NextRequest) {
  // Prevent concurrent syncs
  if (isSyncing) {
    return NextResponse.json({
      status: 409,
      message: "Sync already in progress",
      currentProgress: currentSyncStatus
    }, { status: 409 });
  }

  const body = await req.json();
  console.log("Sync request body:", body);

  // Initialize sync status
  const syncEntities = [
    'products', 'student', 'suppliers',
    'consultation', 'purchases', 'consultationItems', 'purchaseItems', 'paymentMethods', 'balancePayment'
  ];

  isSyncing = true;
  let connectivity = { online: false, offline: false };

  try {
    // Check connectivity first
    connectivity = await ensureAvailableConnections();
    
    // Determine sync mode
    let syncMode: 'full' | 'offline-only' | 'online-only' = 'full';
    if (!connectivity.online && connectivity.offline) {
      syncMode = 'offline-only';
    } else if (connectivity.online && !connectivity.offline) {
      syncMode = 'online-only';
    }

    currentSyncStatus = {
      success: false,
      totalEntities: syncEntities.length,
      completedEntities: 0,
      skippedEntities: 0,
      progress: syncEntities.map(entity => ({
        entity,
        completed: 0,
        total: 0,
        status: 'pending'
      })),
      errors: [],
      warnings: [],
      startTime: new Date(),
      mode: syncMode,
      connectivityStatus: connectivity
    };

    console.log(`Starting sync in ${syncMode} mode`);

    // Perform sync based on available connections
    
    await syncUpstreamEntities(connectivity);

    // Mark sync as completed
    const hasErrors = currentSyncStatus.errors.length > 0;
    const hasWarnings = currentSyncStatus.warnings.length > 0;
    
    currentSyncStatus.success = !hasErrors;
    currentSyncStatus.endTime = new Date();
    currentSyncStatus.duration = currentSyncStatus.endTime.getTime() - currentSyncStatus.startTime.getTime();

    let message = "Sync completed successfully";
    if (hasErrors && hasWarnings) {
      message = "Sync completed with errors and warnings";
    } else if (hasErrors) {
      message = "Sync completed with errors";
    } else if (hasWarnings) {
      message = "Sync completed with warnings";
    }

    console.log("Sync completed", { 
      success: currentSyncStatus.success, 
      errors: currentSyncStatus.errors.length,
      warnings: currentSyncStatus.warnings.length,
      mode: syncMode,
      duration: currentSyncStatus.duration 
    });

    return NextResponse.json({
      status: 200,
      message,
      result: currentSyncStatus
    });

  } catch (error) {
    console.error("Critical sync error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    if (currentSyncStatus) {
      currentSyncStatus.success = false;
      currentSyncStatus.endTime = new Date();
      currentSyncStatus.duration = currentSyncStatus.endTime.getTime() - currentSyncStatus.startTime.getTime();
      currentSyncStatus.errors.push(`Critical error: ${errorMessage}`);
    }

    return NextResponse.json({
      status: 500,
      message: "Sync failed critically",
      error: errorMessage,
      result: currentSyncStatus,
      timestamp: new Date().toISOString()
    }, { status: 500 });

  } finally {
    isSyncing = false;
  }
}

// GET endpoint to check sync status
export async function GET() {
  const overallPercentage = currentSyncStatus ? 
    Math.round(((currentSyncStatus.completedEntities + currentSyncStatus.skippedEntities) / currentSyncStatus.totalEntities) * 100) : 0;

  return NextResponse.json({
    status: 200,
    isSyncing,
    overallPercentage,
    syncStatus: currentSyncStatus,
    lastSync: currentSyncStatus?.endTime || null
  });
}