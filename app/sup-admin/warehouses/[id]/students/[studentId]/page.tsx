"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
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
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  User,
  ArrowLeft,
  AlertCircle,
  Activity,
  Phone,
  Mail,
  MapPin,
  Calendar,
  GraduationCap,
  Heart,
  CreditCard,
  FileText,
  Stethoscope
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import fetchWareHouseData from "@/hooks/fetch-invidual-data"

export default function StudentDetailPage() {
  const router = useRouter()
  const path = usePathname()
  const [studentData, setStudentData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  
  const pathSegments = path?.split("/") || []
  const wareHouseId = pathSegments[3]
  const studentId = pathSegments[5]

  // Fetch student data
  useEffect(() => {
    const fetchStudentData = async () => {
      if (!studentId || !wareHouseId) return
      
      setLoading(true)
      try {
        const response = await fetch('/api/student/list', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            id: studentId,
            warehouseId: wareHouseId 
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          setStudentData(data)
        } else {
          setError(true)
        }
      } catch (error) {
        console.error('Error fetching student data:', error)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchStudentData()
  }, [studentId, wareHouseId])

  // Loading state
  if (loading) {
    return (
      <>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="text-center">
            <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-muted-foreground">Loading student details...</p>
          </div>
        </div>
      </>
    )
  }

  // Error state
  if (error || !studentData) {
    return (
      <>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="text-center max-w-md">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-600" />
            <h2 className="text-2xl font-semibold mb-2">Student Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The student you're looking for doesn't exist or has been removed.
            </p>
            <Button 
              onClick={() => router.push(`/sup-admin/warehouses/${wareHouseId}/dash`)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Clinic
            </Button>
          </div>
        </div>
      </>
    )
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
                <BreadcrumbLink href="/sup-admin/warehouses/list">Clinics</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/sup-admin/warehouses/${wareHouseId}/dash`}>
                  Clinic Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{studentData.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0 max-w-7xl mx-auto">
        {/* Student Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src="" alt={studentData.name} />
              <AvatarFallback className="text-lg">
                {studentData.name
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-semibold text-blue-600">{studentData.name}</h1>
              <p className="text-muted-foreground font-mono">{studentData.matricNumber}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <GraduationCap className="h-4 w-4" />
                  <span>{studentData.department} - Level {studentData.level}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  <span>{studentData.phone}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => router.push(`/sup-admin/warehouses/${wareHouseId}/dash`)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Clinic
            </Button>
          </div>
        </div>

        {/* Student Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Account Balance</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${studentData.accountBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(studentData.accountBalance)}
              </div>
              <p className="text-xs text-muted-foreground">
                Current balance
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Consultations</CardTitle>
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{studentData.Consultation?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Medical visits
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Visit</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {studentData.Consultation && studentData.Consultation.length > 0
                  ? new Date(studentData.Consultation[0].createdAt).toLocaleDateString()
                  : 'Never'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Most recent consultation
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Health Status</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <Badge variant="secondary" className="text-sm">
                  {studentData.bloodGroup || 'Unknown'} | {studentData.genotype || 'Unknown'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Blood group & genotype
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Student Details */}
        <Card>
          <CardHeader>
            <CardTitle>Student Information</CardTitle>
            <CardDescription>
              Personal details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Full Name</Label>
              <p className="text-sm text-muted-foreground">{studentData.name}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Matriculation Number</Label>
              <p className="text-sm text-muted-foreground font-mono">{studentData.matricNumber}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Email</Label>
              <p className="text-sm text-muted-foreground">{studentData.email || 'Not provided'}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Phone Number</Label>
              <p className="text-sm text-muted-foreground">{studentData.phone}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Department</Label>
              <p className="text-sm text-muted-foreground">{studentData.department || 'Not specified'}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Level</Label>
              <p className="text-sm text-muted-foreground">{studentData.level || 'Not specified'}</p>
            </div>
            {studentData.address && (
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium">Address</Label>
                <p className="text-sm text-muted-foreground">{studentData.address}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Medical Information */}
        <Card>
          <CardHeader>
            <CardTitle>Medical Information</CardTitle>
            <CardDescription>
              Health records and emergency contacts
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Blood Group</Label>
              <p className="text-sm text-muted-foreground">{studentData.bloodGroup || 'Not specified'}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Genotype</Label>
              <p className="text-sm text-muted-foreground">{studentData.genotype || 'Not specified'}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Emergency Contact</Label>
              <p className="text-sm text-muted-foreground">{studentData.emergencyContact || 'Not provided'}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Emergency Phone</Label>
              <p className="text-sm text-muted-foreground">{studentData.emergencyPhone || 'Not provided'}</p>
            </div>
            {studentData.allergies && (
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium">Known Allergies</Label>
                <p className="text-sm text-muted-foreground">{studentData.allergies}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="consultations" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="consultations">Consultation History</TabsTrigger>
            <TabsTrigger value="payments">Payment History</TabsTrigger>
            <TabsTrigger value="transactions">Account Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="consultations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Consultation History</CardTitle>
                <CardDescription>
                  All medical consultations for this student
                </CardDescription>
              </CardHeader>
              <CardContent>
                {studentData.Consultation && studentData.Consultation.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Consultation ID</TableHead>
                        <TableHead>Diagnosis</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentData.Consultation.map((consultation: any) => (
                        <TableRow key={consultation.id}>
                          <TableCell>
                            {new Date(consultation.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-mono">{consultation.invoiceNo}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {consultation.diagnosis || 'Not specified'}
                          </TableCell>
                          <TableCell>{formatCurrency(consultation.grandTotal)}</TableCell>
                          <TableCell>{formatCurrency(consultation.balance)}</TableCell>
                          <TableCell>
                            {consultation.balance == 0 ? (
                              <Badge variant="default" className="bg-green-600">
                                Completed
                              </Badge>
                            ) : consultation.balance === consultation.grandTotal ? (
                              <Badge variant="default" className="bg-red-600">
                                Not Paid
                              </Badge>
                            ) : (
                              <Badge variant="default" className="bg-yellow-600">
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Stethoscope className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No Consultations Found</h3>
                    <p className="text-muted-foreground">
                      This student hasn't had any consultations yet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>
                  All payments made by this student
                </CardDescription>
              </CardHeader>
              <CardContent>
                {studentData.balancePayment && studentData.balancePayment.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Receipt No</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentData.balancePayment.map((payment: any) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-mono">{payment.receiptNo}</TableCell>
                          <TableCell>{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>{payment.paymentMethod}</TableCell>
                          <TableCell>{payment.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No Payments Found</h3>
                    <p className="text-muted-foreground">
                      This student hasn't made any payments yet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Account Transactions</CardTitle>
                <CardDescription>
                  All account balance transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {studentData.balanceTransaction && studentData.balanceTransaction.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Balance After</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentData.balanceTransaction.map((transaction: any) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={transaction.type === 'CREDIT' ? 'default' : 'secondary'}>
                              {transaction.type}
                            </Badge>
                          </TableCell>
                          <TableCell className={transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}>
                            {transaction.type === 'CREDIT' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                          </TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>{formatCurrency(transaction.balanceAfter)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No Transactions Found</h3>
                    <p className="text-muted-foreground">
                      This student doesn't have any account transactions yet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}