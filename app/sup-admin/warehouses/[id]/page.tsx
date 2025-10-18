"use client"
import * as XLSX from 'xlsx';
import { useState, useEffect, useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Warehouse,
  MapPin,
  Users,
  Package,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Truck,
  MoreHorizontal,
  Edit,
  Trash2,
  UserPlus,
  Eye,
  BarChart3,
  PieChartIcon,
  Activity,
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  Crown,
  Calendar,
  Target,
  Star,
  Search,
  Filter,
  FileText
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts"
import fetchData from "@/hooks/fetch-data"
import { formatCurrency } from "@/lib/utils"
import fetchWareHouseData from "@/hooks/fetch-invidual-data"
import Link from "next/link"
import { SalesCalendar } from "@/components/sales-calendar"
import { DailySalesModal } from "@/components/daily-sales-modal"
import { Input } from "@heroui/input"
import { useSession } from "next-auth/react"
import bcrypt from "bcryptjs"

// Color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function WarehouseDetailsPage() {
  const router = useRouter()
  const path = usePathname()
  const [selectedPeriod, setSelectedPeriod] = useState("12months")
  const [detailedAnalytics, setDetailedAnalytics] = useState<any>(null)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showDailyModal, setShowDailyModal] = useState(false)
  const wareHouseId = path?.split("/")[3]
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
  // User management states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [userToDelete, setUserToDelete] = useState<any>(null)
  const [deletePassword, setDeletePassword] = useState("")
  const [isDeletingUser, setIsDeletingUser] = useState(false)
  
  const { data: session } = useSession()
  // Fetch warehouse data using the ID from params
  const { data: warehouseData, loading, error } = fetchWareHouseData(`/api/warehouse/list`,{id:wareHouseId})

  console.log(warehouseData)


  
  // Fetch detailed analytics
  useEffect(() => {
    const fetchDetailedAnalytics = async () => {
      if (!wareHouseId) return
      
      setIsLoadingAnalytics(true)
      try {
        const response = await fetch('/api/warehouse/analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ warehouseId: wareHouseId })
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log(data)
          setDetailedAnalytics(data)
        }
      } catch (error) {
        console.error('Error fetching detailed analytics:', error)
      } finally {
        setIsLoadingAnalytics(false)
      }
    }

    fetchDetailedAnalytics()
  }, [wareHouseId])

  const filteredProducts = useMemo(() => {
    if (!warehouseData?.products) return []
    
    const query = searchQuery.toLowerCase().trim()
    if (query.length === 0) {
      // Show only first 50 products when no search query
      return warehouseData.products.slice(0, 50)
    }
    
    if (query.length < 2) {
      // Don't search until at least 2 characters
      return []
    }
    
    // Filter products based on search query
    const filtered = warehouseData?.products.filter((product:any) => {
      const matchesSearch =
      product.name.toLowerCase().includes(query) ||
      product.barcode.toLowerCase().includes(query) 
      
  
      return matchesSearch 
    })
    
    // Limit results to 100 for performance
    return filtered.slice(0, 100)
  }, [warehouseData?.products, searchQuery])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setIsSearching(true)
    
    // Clear searching state after a delay
    setTimeout(() => {
      setIsSearching(false)
    }, 300)
  }

  const handleDateClick = (date: string) => {
    setSelectedDate(date)
    setShowDailyModal(true)
  }

  const handleCloseModal = () => {
    setShowDailyModal(false)
    setSelectedDate(null)
  }

   const exportReport = async (reportType: string) => {
      if (!wareHouseId) return
  
      try {
        const response = await fetch('/api/warehouse/reports/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            warehouseId: wareHouseId,
            reportType,
            month: selectedMonth,
            year: selectedYear
          })
        })
  
        if (response.ok) {
          // const data = await response.json()
          
          // //Create and download CSV file
          // const blob = new Blob([data.csvData], { type: 'text/csv' })
          // const url = window.URL.createObjectURL(blob)
          // const a = document.createElement('a')
          // a.href = url
          // a.download = data.filename
          // document.body.appendChild(a)
          // a.click()
          // window.URL.revokeObjectURL(url)
          // document.body.removeChild(a)
          
          const data = await response.json();
  
  // Step 1: Parse CSV string into 2D array
  const rows = data.csvData
    .trim()
    .split("\n")
    .map((row:any) => row.split(",").map((cell:any) => cell.replace(/^"|"$/g, "")));
  
  // Step 2: Convert array of arrays to worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  
  // Step 3: Create workbook and append sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  
  // Step 4: Trigger Excel download
  XLSX.writeFile(workbook, data.filename.replace(".csv", ".xlsx"));
         console.log("sharp")
        }
      } catch (error) {
        console.error('Error exporting report:', error)
      }
    }


    const generateMonthlyReport = async () => {
      if (!wareHouseId) return
  
      try {
        const response = await fetch('/api/warehouse/reports/monthly', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            warehouseId: wareHouseId,
            month: selectedMonth,
            year: selectedYear,
            reportType: 'all'
          })
        })
  
        if (response.ok) {
          const data = await response.json()
          
        }
      } catch (error) {
        console.error('Error generating monthly report:', error)
      }
    }
  // Loading state
  if (loading) {
    return (
      <>
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="text-center">
              <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-muted-foreground">Loading warehouse details...</p>
            </div>
          </div>
       </>
    )
  }

  // Error state
  if (error || !warehouseData) {
    return (
      <>
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="text-center max-w-md">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-600" />
              <h2 className="text-2xl font-semibold mb-2">Warehouse Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The warehouse you're looking for doesn't exist or has been removed.
              </p>
              <Button 
                onClick={() => router.push('/sup-admin/warehouses/list')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Warehouses
              </Button>
            </div>
          </div>
       </>
    )
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <Badge variant="default" className="bg-red-600">
            Admin
          </Badge>
        )
      case "manager":
        return (
          <Badge variant="default" className="bg-blue-600">
            Manager
          </Badge>
        )
      case "staff":
        return <Badge variant="secondary">Staff</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  const getStockStatus = (quantity: number) => {
    if (quantity <= 5) return { status: 'Critical', color: 'text-red-600', bg: 'bg-red-100' }
    if (quantity <= 10) return { status: 'Low', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    return { status: 'Good', color: 'text-green-600', bg: 'bg-green-100' }
  }

  const handleViewUser = (userId: string) => {
    // Navigate to user profile view
    router.push(`/sup-admin/warehouses/${wareHouseId}/users/${userId}`)
  }

  const handleDeleteUser = (user: any) => {
    setUserToDelete(user)
    setShowDeleteDialog(true)
  }

  const confirmDeleteUser = async () => {
    if (!userToDelete || !deletePassword || !session?.user?.id) {
      alert("Password is required to delete user")
      return
    }

    setIsDeletingUser(true)

    try {
      // First verify the current user's password
      const verifyResponse = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          password: deletePassword
        }),
      })

      if (!verifyResponse.ok) {
        alert("Incorrect password. User deletion cancelled.")
        setIsDeletingUser(false)
        return
      }

      // If password is correct, proceed with user deletion
      const deleteResponse = await fetch(`/api/users/${userToDelete.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          deletedBy: session.user.id
        }),
      })

      const result = await deleteResponse.json()

      if (deleteResponse.ok && result.success) {
        alert(`User "${userToDelete.userName}" has been deleted successfully!`)
        setShowDeleteDialog(false)
        setUserToDelete(null)
        setDeletePassword("")
        window.location.reload()
      } else {
        alert(`Error: ${result.error || "Failed to delete user"}`)
      }
    } catch (error) {
      alert("Error deleting user")
      console.error(error)
    } finally {
      setIsDeletingUser(false)
    }
  }

  const cancelDeleteUser = () => {
    setShowDeleteDialog(false)
    setUserToDelete(null)
    setDeletePassword("")
  }

 
  return (
    <>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/sup-admin/dashboard">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/sup-admin/warehouses/list">Warehouses</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{warehouseData.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* Clinic Header - Mobile Responsive */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start gap-4 w-full lg:w-auto">
              <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-lg">
                <Warehouse className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-blue-600">{warehouseData.name} Clinic Management System</h1>
                <p className="text-muted-foreground font-mono">Clinic ID: {warehouseData.warehouseCode}</p>
                
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{warehouseData.address}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{warehouseData.stats?.assignedUsers || 0} Medical Staff</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <Button 
                variant="outline" 
                onClick={() => router.push('/sup-admin/warehouses/list')}
                className="gap-2 w-full sm:w-auto"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to List</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <Button asChild className="gap-2 w-full sm:w-auto" size="sm">
                <Link href={`/sup-admin/warehouses/${wareHouseId}/edit`}>
                  <Edit className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit Clinic</span>
                  <span className="sm:hidden">Edit</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* Warehouse Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Medicines</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{warehouseData.stats?.totalProducts || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Medicines in stock
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{warehouseData.stats?.totalStudents || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Registered students
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Consultations</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{warehouseData.stats?.totalConsultations || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Patient consultations
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Medical Staff</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{warehouseData.stats?.assignedUsers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Active clinic staff
                </p>
              </CardContent>
            </Card>
            
          </div>

          {/* Medicine Stock Alert & Anti-Theft Monitoring - Mobile Responsive */}
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
            {detailedAnalytics?.lowStockProducts && detailedAnalytics.lowStockProducts.length > 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertTriangle className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Medicine Stock Alert</p>
                      <p className="text-sm">
                        {detailedAnalytics.lowStockProducts.length} medicines are running low on stock
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
           
          </div>

          {/* Warehouse Details */}
          <Card>
            <CardHeader>
              <CardTitle>Clinic Information</CardTitle>
              <CardDescription>
                Basic details and contact information for this medical clinic
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Clinic Name</Label>
                <p className="text-sm text-muted-foreground">{warehouseData.name}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Clinic ID</Label>
                <p className="text-sm text-muted-foreground">{warehouseData.warehouseCode}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Email</Label>
                <p className="text-sm text-muted-foreground">{warehouseData.email}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Phone Number</Label>
                <p className="text-sm text-muted-foreground">{warehouseData.phoneNumber}</p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium">Address</Label>
                <p className="text-sm text-muted-foreground">{warehouseData.address}</p>
              </div>
              {warehouseData.description && (
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground">{warehouseData.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="analytics" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 h-auto">
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="medicines">Medicines</TabsTrigger>
              <TabsTrigger value="consultations">Consultations</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="staff">Staff</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="analytics" className="space-y-4">
              {isLoadingAnalytics ? (
                <div className="flex items-center justify-center py-8">
                  <Activity className="h-6 w-6 animate-spin mr-2" />
                  Loading analytics...
                </div>
              ) : detailedAnalytics ? (
                <>
                  {/* Monthly Consultation Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Monthly Consultation Performance
                      </CardTitle>
                      <CardDescription>
                        Patient consultations and revenue trends over the last 12 months
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={detailedAnalytics.monthlySalesData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip 
                            formatter={(value, name) => [
                              name === 'revenue' ? formatCurrency(value as number) : value,
                              name === 'revenue' ? 'Revenue' : 'Consultation'
                            ]}
                          />
                          <Bar dataKey="orders" fill="#10b981" name="orders" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Top Products and Top Customers */}
                  <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Star className="h-5 w-5" />
                              Most Prescribed Medicines
                            </CardTitle>
                          </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {detailedAnalytics.topProducts.slice(0, 5).map((product: any, index: number) => (
                            <div key={product.productId} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium">
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{product.productName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {product.totalQuantity} units 
                                  </p>
                                </div>
                              </div>
                              
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Crown className="h-5 w-5" />
                              Frequent Patients
                            </CardTitle>
                          </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {detailedAnalytics.topCustomers.slice(0, 5).map((customer: any, index: number) => (
                            <div key={customer.customerId} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs font-medium">
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{customer.customerName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {customer.totalOrders} consultants
                                  </p>
                                </div>
                              </div>
                              
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No analytics data available</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="calendar" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Daily Sales Calendar</h2>
                  <p className="text-sm text-muted-foreground">
                    Click on any date to view detailed sales information and export data
                  </p>
                </div>
                
                <SalesCalendar
                  warehouseId={wareHouseId}
                  onDateClick={handleDateClick}
                  apiEndpoint="/api/sale/daily-analytics"
                  className="w-full"
                />
              </div>
            </TabsContent>

            <TabsContent value="medicines" className="space-y-4">
              {/* Medicine Stock Overview Cards - Mobile Responsive */}
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Total Medicines</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{warehouseData.products?.length || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Low Stock Medicines</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                      {warehouseData.products?.filter((p: any) => p.quantity <= 10).length || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Out of Stock</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {warehouseData.products?.filter((p: any) => p.quantity === 0).length || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Tracked Movements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {warehouseData.products?.reduce((sum: number, p: any) => sum + (p.totalDispensed || 0), 0) || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Total dispensed</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Medicine Inventory with Anti-Theft Tracking</CardTitle>
                  <CardDescription>
                    All medicines with comprehensive tracking to prevent theft and ensure accountability
                  </CardDescription>
                </CardHeader>
                <div className="flex flex-col m-4 gap-4 md:flex-row md:items-end">
                                <div className="flex-1 space-y-2">
                                  <Label htmlFor="search">Search Products</Label>
                                  <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      id="search"
                                      placeholder="Search by name, code, or brand..."
                                      value={searchQuery}
                                      onChange={(e) => handleSearchChange(e.target.value)}
                                      className="pl-8"
                                    />
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="status">Status</Label>
                                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-40">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">All Status</SelectItem>
                                      <SelectItem value="active">Active</SelectItem>
                                      <SelectItem value="low_stock">Low Stock</SelectItem>
                                      <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button variant="outline" size="sm">
                                  <Filter className="mr-2 h-4 w-4" />
                                  Clear Filters
                                </Button>
                </div>
                <CardContent>
                  {warehouseData.products && warehouseData.products.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Medicine Name</TableHead>
                          <TableHead>Barcode</TableHead>
                          <TableHead>Stock Status</TableHead>
                          <TableHead>Current Stock</TableHead>
                          <TableHead>Total Dispensed</TableHead>
                          <TableHead>Last Dispensed</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map((product: any) => {
                          const stockStatus = getStockStatus(product.quantity)
                          return (
                            <TableRow key={product.id}>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell className="font-mono">{product.barcode}</TableCell>
                              <TableCell>
                                <Badge className={`${stockStatus.bg} ${stockStatus.color}`}>
                                  {stockStatus.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className={product.quantity <= 10 ? "text-red-500 font-medium" : "text-green-500"}>
                                    {product.quantity}
                                  </span>
                                  <Progress 
                                    value={Math.min((product.quantity / 50) * 100, 100)} 
                                    className="w-16 h-2"
                                  />
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-blue-600 font-medium">
                                  {product.totalDispensed || 0}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs text-muted-foreground">
                                  {product.lastDispensed ? new Date(product.lastDispensed).toLocaleDateString() : 'Never'}
                                </span>
                              </TableCell>
                              <TableCell>{product.unit}</TableCell>
                              <TableCell>{formatCurrency(product.retailPrice)}</TableCell>
                              <TableCell>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => router.push(`/sup-admin/warehouses/${wareHouseId}/${product.id}/stock-tracking`)}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Track
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">No Products Found</h3>
                      <p className="text-muted-foreground">
                        This warehouse doesn't have any products yet.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="consultations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Consultations</CardTitle>
                  <CardDescription>
                    Latest consultation records from this clinic
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {warehouseData.consultation && warehouseData.consultation.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Consultation ID</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Matric Number</TableHead>
                          <TableHead>Consultant</TableHead>
                          <TableHead>Diagnosis</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {warehouseData.consultation.slice(0, 20).map((consultation: any) => (
                          <TableRow key={consultation.id}>
                            <TableCell className="font-medium">{consultation.invoiceNo}</TableCell>
                            <TableCell>
                              {new Date(consultation.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{consultation.selectedStudent?.name || 'Walk-in Patient'}</TableCell>
                            <TableCell className="font-mono text-sm">
                              {consultation.selectedStudent?.matricNumber || 'N/A'}
                            </TableCell>
                            <TableCell>{consultation.createdByUser?.userName || 'Walk-in Patient'}</TableCell>
                            <TableCell className="max-w-xs truncate">{consultation.diagnosis || 'Not specified'}</TableCell>
                            <TableCell>
                              {consultation.balance == 0 &&
                              <Badge variant="default" className="bg-green-600">
                              Completed
                            </Badge>
                            }
                            {consultation.balance === consultation.grandTotal && 
                            <Badge variant="default" className="bg-red-600">
                            Not Paid
                          </Badge>
                          }
                          {(consultation.balance > 0 && consultation.balance < consultation.grandTotal) &&
                           <Badge variant="default" className="bg-yellow-600">
                           Pending
                         </Badge>
                         }
                             
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  // Show consultation details in a dialog or navigate to detail page
                                  router.push(`/sup-admin/warehouses/${wareHouseId}/consultations/${consultation.invoiceNo}`)
                                }}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">No Consultations Found</h3>
                      <p className="text-muted-foreground">
                        This clinic doesn't have any consultation records yet.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="students" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Student Records</CardTitle>
                  <CardDescription>
                    Registered students and their information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {warehouseData.student && warehouseData.student.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Matric Number</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Level</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {warehouseData.student.slice(0, 20).map((student: any) => (
                          <TableRow 
                            key={student.id} 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                              // Navigate to student detail view
                              router.push(`/sup-admin/warehouses/${wareHouseId}/students/${student.id}`)
                            }}
                          >
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell className="font-mono">{student.matricNumber}</TableCell>
                            <TableCell>{student.department || 'Not specified'}</TableCell>
                            <TableCell>{student.level || 'Not specified'}</TableCell>
                            <TableCell>{student.phone}</TableCell>
                            
                            <TableCell>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/sup-admin/warehouses/${wareHouseId}/students/${student.id}`)
                                }}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">No Students Found</h3>
                      <p className="text-muted-foreground">
                        This clinic doesn't have any registered students yet.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="staff" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Medical Staff</h2>
                  <p className="text-sm text-muted-foreground">
                    Medical professionals assigned to this clinic
                  </p>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  {warehouseData.users && warehouseData.users.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Last Login</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {warehouseData.users.map((user: any) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src="" alt={user.userName} />
                                  <AvatarFallback>
                                    {user.userName
                                      .split(" ")
                                      .map((n: string) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{user.userName}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{getRoleBadge(user.role)}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.phoneNumber}</TableCell>
                            <TableCell>
                              {user.lastLogin 
                                ? new Date(user.lastLogin).toLocaleDateString()
                                : 'Never'
                              }
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => handleViewUser(user.id)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Profile
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuSeparator />
                                  {/* <DropdownMenuItem 
                                    className="text-red-600"
                                    onClick={() => handleDeleteUser(user)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete User
                                  </DropdownMenuItem> */}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">No Users Assigned</h3>
                      <p className="text-muted-foreground">
                        This warehouse doesn't have any assigned users yet.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* <TabsContent value="security" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-red-600">Anti-Theft Security Monitoring</h2>
                  <p className="text-sm text-muted-foreground">
                    Comprehensive drug tracking and suspicious activity detection system
                  </p>
                </div>

                
                <div className="grid gap-4 md:grid-cols-4">
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-green-800">Secure Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {warehouseData.stats?.totalConsultations || 0}
                      </div>
                      <p className="text-xs text-green-600">All tracked</p>
                    </CardContent>
                  </Card>

                  <Card className="border-yellow-200 bg-yellow-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-yellow-800">Flagged Activities</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-600">0</div>
                      <p className="text-xs text-yellow-600">Under review</p>
                    </CardContent>
                  </Card>

                  <Card className="border-red-200 bg-red-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-red-800">High Risk Alerts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">0</div>
                      <p className="text-xs text-red-600">Immediate attention</p>
                    </CardContent>
                  </Card>

                  <Card className="border-blue-200 bg-blue-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-blue-800">Stock Audits</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">Daily</div>
                      <p className="text-xs text-blue-600">Automated</p>
                    </CardContent>
                  </Card>
                </div>

                
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        Drug Tracking Features
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Real-time stock monitoring</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Staff activity logging</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Automatic discrepancy detection</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Prescription validation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Excessive dispensing alerts</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        Security Protocols
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-sm">Biometric access control</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-sm">Multi-level authorization</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-sm">Audit trail maintenance</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-sm">Suspicious pattern detection</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-sm">Automated reporting</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Recent Security Events
                    </CardTitle>
                    <CardDescription>
                      Latest drug tracking and security monitoring activities
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                      <h3 className="text-lg font-medium mb-2 text-green-600">All Clear</h3>
                      <p className="text-muted-foreground">
                        No suspicious activities detected. All drug movements are properly tracked and accounted for.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Security Management</CardTitle>
                    <CardDescription>Quick actions for security monitoring and drug tracking</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent w-full">
                        <AlertTriangle className="h-6 w-6" />
                        <span>Stock Audit</span>
                      </Button>
                      <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent w-full">
                        <Activity className="h-6 w-6" />
                        <span>Activity Log</span>
                      </Button>
                      <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent w-full">
                        <AlertCircle className="h-6 w-6" />
                        <span>Security Report</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent> */}

<TabsContent value="reports" className="space-y-4">
              {/* Report Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle>Report Configuration</CardTitle>
                  <CardDescription>
                    Configure the period for your reports
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="month">Month</Label>
                      <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                            <SelectItem key={month} value={month.toString()}>
                              {new Date(2024, month - 1).toLocaleDateString('en-US', { month: 'long' })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year">Year</Label>
                      <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    
                    <div className="flex justify-between">
                      <span>Total Consultations</span>
                      <span className="font-medium">{warehouseData.stats?.totalOrders || 0}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Products in Stock</span>
                      <span className="font-medium">{warehouseData.stats?.totalProducts || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Staff Members</span>
                      <span className="font-medium">{warehouseData.stats?.assignedUsers || 0}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Export Reports</CardTitle>
                    <CardDescription>
                      Generate and download various reports
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => exportReport('monthly')}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Export Monthly Report
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => exportReport('inventory')}
                    >
                      <Package className="mr-2 h-4 w-4" />
                      Export Inventory Report
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => exportReport('sales')}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Export Consultation Report
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={generateMonthlyReport}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Generate Monthly Analytics
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Daily Sales Modal */}
        <DailySalesModal
          isOpen={showDailyModal}
          onClose={handleCloseModal}
          date={selectedDate}
          warehouseId={wareHouseId}
          warehouseName={warehouseData?.name || "Warehouse"}
          apiEndpoint="/api/sale/daily-analytics"
        />

        {/* Delete User Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Confirm User Deletion
              </DialogTitle>
              <DialogDescription>
                {userToDelete && (
                  <>
                    You are about to delete user <strong>{userToDelete.userName}</strong> ({userToDelete.email}).
                    <br /><br />
                    This action cannot be undone. Please enter your password to confirm.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deletePassword">Your Password</Label>
                <Input
                  id="deletePassword"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your password to confirm deletion"
                  required
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={cancelDeleteUser} disabled={isDeletingUser}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDeleteUser}
                disabled={!deletePassword || isDeletingUser}
              >
                {isDeletingUser ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete User
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
     </>
  )
}