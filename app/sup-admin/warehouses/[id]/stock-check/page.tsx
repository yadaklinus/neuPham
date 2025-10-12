"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { DrugTrackingDashboard } from "@/components/drug-tracking-dashboard"
import { ClinicPagination } from "@/components/clinic-pagination"
import {
  AlertTriangle,
  AlertCircle,
  Package,
  Search,
  Shield,
  Scan,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Download,
  RefreshCw,
  Plus,
  Minus,
  Camera,
  FileText,
  Activity,
  ArrowLeft
} from "lucide-react"

interface Medicine {
  id: string
  name: string
  barcode: string
  expectedQuantity: number
  actualQuantity: number
  discrepancy: number
  lastCounted: string
  status: 'matched' | 'discrepancy' | 'missing' | 'excess'
  location: string
  batchNumber: string
  expiryDate: string
  cost: number
}

interface StockAudit {
  id: string
  startTime: string
  endTime?: string
  status: 'in_progress' | 'completed' | 'cancelled'
  totalItems: number
  checkedItems: number
  discrepancies: number
  conductedBy: string
}

export default function StockCheckPage() {
  const router = useRouter()
  const path = usePathname()
  const warehouseId = path?.split("/")[3]

  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [currentAudit, setCurrentAudit] = useState<StockAudit | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null)
  const [adjustmentReason, setAdjustmentReason] = useState("")
  const [scanMode, setScanMode] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  useEffect(() => {
    fetchStockData()
  }, [warehouseId])

  const fetchStockData = async () => {
    setLoading(true)
    try {
      // Mock data for demonstration
      const mockMedicines: Medicine[] = [
        {
          id: "1",
          name: "Paracetamol 500mg",
          barcode: "123456789",
          expectedQuantity: 100,
          actualQuantity: 98,
          discrepancy: -2,
          lastCounted: new Date().toISOString(),
          status: 'discrepancy',
          location: "A1-B2",
          batchNumber: "BT001",
          expiryDate: "2025-12-31",
          cost: 0.50
        },
        {
          id: "2",
          name: "Ibuprofen 400mg",
          barcode: "987654321",
          expectedQuantity: 50,
          actualQuantity: 50,
          discrepancy: 0,
          lastCounted: new Date().toISOString(),
          status: 'matched',
          location: "A2-B1",
          batchNumber: "BT002",
          expiryDate: "2025-08-15",
          cost: 0.75
        }
      ]

      const mockAudit: StockAudit = {
        id: "audit_001",
        startTime: new Date().toISOString(),
        status: 'in_progress',
        totalItems: mockMedicines.length,
        checkedItems: 1,
        discrepancies: 1,
        conductedBy: "Admin User"
      }

      setMedicines(mockMedicines)
      setCurrentAudit(mockAudit)
    } catch (error) {
      console.error('Failed to fetch stock data:', error)
    } finally {
      setLoading(false)
    }
  }

  const startNewAudit = async () => {
    try {
      const newAudit: StockAudit = {
        id: `audit_${Date.now()}`,
        startTime: new Date().toISOString(),
        status: 'in_progress',
        totalItems: medicines.length,
        checkedItems: 0,
        discrepancies: 0,
        conductedBy: "Admin User"
      }
      setCurrentAudit(newAudit)
    } catch (error) {
      console.error('Failed to start audit:', error)
    }
  }

  const updateMedicineCount = async (medicineId: string, newCount: number, reason: string) => {
    try {
      const updatedMedicines = medicines.map(medicine => {
        if (medicine.id === medicineId) {
          const discrepancy = newCount - medicine.expectedQuantity
          return {
            ...medicine,
            actualQuantity: newCount,
            discrepancy,
            status: discrepancy === 0 ? 'matched' as const : 'discrepancy' as const,
            lastCounted: new Date().toISOString()
          }
        }
        return medicine
      })
      
      setMedicines(updatedMedicines)
      
      // Update audit progress
      if (currentAudit) {
        const checkedItems = updatedMedicines.filter(m => m.lastCounted).length
        const discrepancies = updatedMedicines.filter(m => m.discrepancy !== 0).length
        
        setCurrentAudit({
          ...currentAudit,
          checkedItems,
          discrepancies
        })
      }

      // Create stock tracking record
      await fetch('/api/warehouse/drug-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseId,
          productId: medicineId,
          action: 'adjusted',
          quantity: Math.abs(newCount - (medicines.find(m => m.id === medicineId)?.expectedQuantity || 0)),
          staffId: 'admin',
          reason: `Stock audit adjustment: ${reason}`
        })
      })

    } catch (error) {
      console.error('Failed to update medicine count:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      matched: { variant: "default" as const, className: "bg-green-600", text: "Matched" },
      discrepancy: { variant: "destructive" as const, className: "", text: "Discrepancy" },
      missing: { variant: "destructive" as const, className: "", text: "Missing" },
      excess: { variant: "secondary" as const, className: "", text: "Excess" }
    }
    
    const config = variants[status as keyof typeof variants] || variants.matched
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.text}
      </Badge>
    )
  }

  const filteredMedicines = medicines.filter(medicine => {
    const matchesSearch = medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         medicine.barcode.includes(searchTerm) ||
                         medicine.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === "all" || medicine.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const paginatedMedicines = filteredMedicines.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Activity className="h-6 w-6 animate-spin mr-2" />
        Loading stock check system...
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push(`/sup-admin/warehouses/${warehouseId}/dash`)}
              className="p-0 h-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Button>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-red-600">🔍 Stock Check & Anti-Theft System</h1>
          <p className="text-muted-foreground">
            Comprehensive medicine inventory audit with real-time discrepancy detection
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {!currentAudit || currentAudit.status !== 'in_progress' ? (
            <Button onClick={startNewAudit} className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Start New Audit
            </Button>
          ) : (
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          )}
        </div>
      </div>

      {/* Current Audit Status */}
      {currentAudit && (
        <Card className={`${currentAudit.status === 'in_progress' ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'}`}>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg">
                  {currentAudit.status === 'in_progress' ? '🔄 Audit in Progress' : '✅ Audit Completed'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Started: {new Date(currentAudit.startTime).toLocaleString()}
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full sm:w-auto">
                <div className="text-center">
                  <div className="text-2xl font-bold">{currentAudit.checkedItems}</div>
                  <div className="text-xs text-muted-foreground">Checked</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{currentAudit.totalItems}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="text-center col-span-2 sm:col-span-1">
                  <div className="text-2xl font-bold text-red-600">{currentAudit.discrepancies}</div>
                  <div className="text-xs text-muted-foreground">Discrepancies</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search medicines, barcodes, or batch numbers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="matched">Matched</SelectItem>
              <SelectItem value="discrepancy">Discrepancy</SelectItem>
              <SelectItem value="missing">Missing</SelectItem>
              <SelectItem value="excess">Excess</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={scanMode ? "default" : "outline"}
            onClick={() => setScanMode(!scanMode)}
            className="gap-2"
          >
            <Scan className="h-4 w-4" />
            <span className="hidden sm:inline">Scan Mode</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="audit" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3">
          <TabsTrigger value="audit">Stock Audit</TabsTrigger>
          <TabsTrigger value="tracking">Drug Tracking</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Stock Audit Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Medicine Inventory Audit
              </CardTitle>
              <CardDescription>
                Physical count verification with automatic discrepancy detection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Medicine</TableHead>
                      <TableHead className="min-w-[120px]">Location</TableHead>
                      <TableHead className="text-center">Expected</TableHead>
                      <TableHead className="text-center">Actual</TableHead>
                      <TableHead className="text-center">Difference</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMedicines.map((medicine) => (
                      <TableRow key={medicine.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{medicine.name}</div>
                            <div className="text-xs text-muted-foreground">
                              Batch: {medicine.batchNumber} | Exp: {new Date(medicine.expiryDate).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {medicine.barcode}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{medicine.location}</Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {medicine.expectedQuantity}
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            value={medicine.actualQuantity}
                            onChange={(e) => {
                              const newValue = parseInt(e.target.value) || 0
                              setMedicines(medicines.map(m => 
                                m.id === medicine.id 
                                  ? { ...m, actualQuantity: newValue, discrepancy: newValue - m.expectedQuantity }
                                  : m
                              ))
                            }}
                            className="w-20 text-center"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-medium ${
                            medicine.discrepancy === 0 ? 'text-green-600' :
                            medicine.discrepancy > 0 ? 'text-blue-600' : 'text-red-600'
                          }`}>
                            {medicine.discrepancy > 0 ? '+' : ''}{medicine.discrepancy}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(medicine.status)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-1 justify-center">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedMedicine(medicine)}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Update Stock Count</DialogTitle>
                                  <DialogDescription>
                                    Adjust the physical count for {medicine.name}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>Current Count</Label>
                                    <Input
                                      type="number"
                                      value={medicine.actualQuantity}
                                      onChange={(e) => {
                                        const newValue = parseInt(e.target.value) || 0
                                        setMedicines(medicines.map(m => 
                                          m.id === medicine.id 
                                            ? { ...m, actualQuantity: newValue, discrepancy: newValue - m.expectedQuantity }
                                            : m
                                        ))
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <Label>Adjustment Reason</Label>
                                    <Textarea
                                      placeholder="Explain the reason for this adjustment..."
                                      value={adjustmentReason}
                                      onChange={(e) => setAdjustmentReason(e.target.value)}
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button
                                    onClick={() => {
                                      updateMedicineCount(medicine.id, medicine.actualQuantity, adjustmentReason)
                                      setAdjustmentReason("")
                                    }}
                                    disabled={!adjustmentReason}
                                  >
                                    Update Count
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            {scanMode && (
                              <Button variant="outline" size="sm">
                                <Camera className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4">
                <ClinicPagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(filteredMedicines.length / itemsPerPage)}
                  totalItems={filteredMedicines.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Drug Tracking Tab */}
        <TabsContent value="tracking" className="space-y-4">
          <DrugTrackingDashboard warehouseId={warehouseId} />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Audit Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Medicines</span>
                  <span className="font-medium">{medicines.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Checked Items</span>
                  <span className="font-medium">{medicines.filter(m => m.lastCounted).length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Perfect Matches</span>
                  <span className="font-medium text-green-600">{medicines.filter(m => m.status === 'matched').length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discrepancies</span>
                  <span className="font-medium text-red-600">{medicines.filter(m => m.status === 'discrepancy').length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Accuracy Rate</span>
                  <span className="font-medium">
                    {medicines.length > 0 ? Math.round((medicines.filter(m => m.status === 'matched').length / medicines.length) * 100) : 0}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Audit Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="mr-2 h-4 w-4" />
                  Export Discrepancies
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Security Alert Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Schedule Next Audit
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}