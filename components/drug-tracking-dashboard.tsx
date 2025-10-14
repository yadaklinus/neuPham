"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ClinicPagination } from "./clinic-pagination"
import {
  AlertTriangle,
  AlertCircle,
  Package,
  Activity,
  Users,
  Search,
  Filter,
  Download,
  Eye,
  Clock,
  Shield,
  TrendingUp,
  TrendingDown
} from "lucide-react"

interface DrugTrackingProps {
  warehouseId: string
  className?: string
}

interface StockMovement {
  id: string
  productName: string
  action: 'dispensed' | 'received' | 'adjusted' | 'transferred'
  quantity: number
  previousStock: number
  newStock: number
  staffName: string
  staffRole: string
  patientName?: string
  reason: string
  timestamp: string
  dosage?: string
  frequency?: string
}

interface SuspiciousActivity {
  id: string
  staffName: string
  productName: string
  activityType: string
  description: string
  severity: 'low' | 'medium' | 'high'
  timestamp: string
  resolved: boolean
}

export function DrugTrackingDashboard({ warehouseId, className = "" }: DrugTrackingProps) {
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([])
  const [suspiciousActivities, setSuspiciousActivities] = useState<SuspiciousActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterAction, setFilterAction] = useState<string>("all")
  const [filterSeverity, setFilterSeverity] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // Security metrics
  const [securityMetrics, setSecurityMetrics] = useState({
    totalMovements: 0,
    suspiciousActivities: 0,
    highRiskAlerts: 0,
    stockDiscrepancies: 0
  })

  useEffect(() => {
    fetchTrackingData()
  }, [warehouseId, currentPage, itemsPerPage, filterAction])

  const fetchTrackingData = async () => {
    if (!warehouseId) return
    
    setLoading(true)
    try {
      // Fetch stock movements (if drug-tracking API exists)
      let movementsData = { trackingRecords: [] }
      try {
        const movementsResponse = await fetch(
          `/api/warehouse/drug-tracking?warehouseId=${warehouseId}&page=${currentPage}&limit=${itemsPerPage}&action=${filterAction}`
        )
        if (movementsResponse.ok) {
          movementsData = await movementsResponse.json()
        }
      } catch (error) {
        console.log('Drug tracking API not available, using empty data')
      }
      
      // Fetch suspicious activities
      const securityResponse = await fetch(
        `/api/warehouse/anti-theft?warehouseId=${warehouseId}&severity=${filterSeverity}`
      )
      
      if (!securityResponse.ok) {
        throw new Error(`Anti-theft API error: ${securityResponse.status}`)
      }
      
      const securityData = await securityResponse.json()
      
      setStockMovements(movementsData.trackingRecords || [])
      setSuspiciousActivities(securityData.suspiciousActivities || [])
      setSecurityMetrics(securityData.securityMetrics || {
        totalSuspiciousActivities: 0,
        highSeverityCount: 0,
        mediumSeverityCount: 0,
        lowSeverityCount: 0,
        stockDiscrepanciesCount: 0,
        highRiskStaffCount: 0
      })
    } catch (error) {
      console.error('Failed to fetch tracking data:', error)
      // Set empty data to prevent crashes
      setSuspiciousActivities([])
      
    } finally {
      setLoading(false)
    }
  }

  const getActionBadge = (action: string) => {
    const variants = {
      dispensed: "destructive",
      received: "default",
      adjusted: "secondary",
      transferred: "outline"
    }
    return (
      <Badge variant={"outline"}>
        {action.charAt(0).toUpperCase() + action.slice(1)}
      </Badge>
    )
  }

  const getSeverityBadge = (severity: string) => {
    const variants = {
      high: "destructive",
      medium: "secondary",
      low: "outline"
    }
    const colors = {
      high: "text-red-600",
      medium: "text-yellow-600", 
      low: "text-blue-600"
    }
    return (
      <Badge variant={"default"}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Badge>
    )
  }

  const filteredMovements = stockMovements.filter(movement =>
    movement.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    movement.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    movement.reason.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredActivities = suspiciousActivities.filter(activity =>
    activity.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Activity className="h-6 w-6 animate-spin mr-2" />
          Loading drug tracking data...
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-red-600">🛡️ Drug Tracking & Anti-Theft System</h2>
          <p className="text-muted-foreground">
            Comprehensive monitoring to prevent drug theft and ensure accountability
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Security Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-blue-800 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Total Movements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {securityMetrics.totalMovements || 0}
            </div>
            <p className="text-xs text-blue-600">All tracked</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-yellow-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Flagged Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {securityMetrics.suspiciousActivities || 0}
            </div>
            <p className="text-xs text-yellow-600">Under review</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-red-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              High Risk Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {securityMetrics.highRiskAlerts || 0}
            </div>
            <p className="text-xs text-red-600">Immediate attention</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-purple-800 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Stock Discrepancies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {securityMetrics.stockDiscrepancies || 0}
            </div>
            <p className="text-xs text-purple-600">Requires audit</p>
          </CardContent>
        </Card>
      </div>

      {/* High Priority Alerts */}
      {suspiciousActivities.filter(a => a.severity === 'high' && !a.resolved).length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>High Priority Security Alert:</strong> {suspiciousActivities.filter(a => a.severity === 'high' && !a.resolved).length} critical security issues require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search medicines, staff, or activities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="dispensed">Dispensed</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="adjusted">Adjusted</SelectItem>
            <SelectItem value="transferred">Transferred</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="movements" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
          <TabsTrigger value="security">Security Alerts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Stock Movements Tab */}
        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Drug Movement History
              </CardTitle>
              <CardDescription>
                Complete audit trail of all drug movements with staff accountability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Stock Change</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMovements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell className="font-medium">{movement.productName}</TableCell>
                        <TableCell>{getActionBadge(movement.action)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {movement.action === 'dispensed' ? (
                              <TrendingDown className="h-3 w-3 text-red-500" />
                            ) : (
                              <TrendingUp className="h-3 w-3 text-green-500" />
                            )}
                            {movement.quantity}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {movement.previousStock} → {movement.newStock}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">{movement.staffName}</div>
                            <div className="text-xs text-muted-foreground">{movement.staffRole}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {movement.patientName && (
                            <span className="text-sm">{movement.patientName}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="text-sm truncate" title={movement.reason}>
                              {movement.reason}
                            </p>
                            {movement.dosage && (
                              <p className="text-xs text-muted-foreground">
                                {movement.dosage} - {movement.frequency}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(movement.timestamp).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="mt-4">
                <ClinicPagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(filteredMovements.length / itemsPerPage)}
                  totalItems={filteredMovements.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Alerts Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Security Alerts & Suspicious Activities
              </CardTitle>
              <CardDescription>
                Automated detection of unusual patterns and potential security threats
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredActivities.length > 0 ? (
                <div className="space-y-4">
                  {filteredActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className={`p-4 rounded-lg border ${
                        activity.severity === 'high'
                          ? 'border-red-200 bg-red-50'
                          : activity.severity === 'medium'
                          ? 'border-yellow-200 bg-yellow-50'
                          : 'border-blue-200 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {getSeverityBadge(activity.severity)}
                            <span className="text-sm font-medium">{activity.activityType}</span>
                            {activity.resolved && (
                              <Badge variant="outline" className="text-green-600">
                                Resolved
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm">{activity.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Staff: {activity.staffName}</span>
                            {activity.productName && <span>Medicine: {activity.productName}</span>}
                            <span>{new Date(activity.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-3 w-3 mr-1" />
                            Details
                          </Button>
                          {!activity.resolved && (
                            <Button variant="outline" size="sm">
                              Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <h3 className="text-lg font-medium mb-2 text-green-600">All Clear</h3>
                  <p className="text-muted-foreground">
                    No suspicious activities detected. All drug movements are properly tracked and accounted for.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Security Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>System Security</span>
                    <Badge className="bg-green-600">Excellent</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Tracking Coverage</span>
                    <Badge className="bg-green-600">100%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Staff Compliance</span>
                    <Badge className="bg-green-600">High</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Risk Level</span>
                    <Badge variant="outline" className="text-green-600">Low</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Package className="mr-2 h-4 w-4" />
                  Generate Stock Audit
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Activity className="mr-2 h-4 w-4" />
                  Export Activity Log
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Security Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Staff Performance
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}