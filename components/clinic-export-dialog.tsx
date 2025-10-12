"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
// import { Calendar } from "@/components/ui/calendar"
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
// import { format } from "date-fns"
import {
  Download,
  FileText,
  Calendar as CalendarIcon,
  Activity,
  Package,
  Users,
  Shield,
  Stethoscope,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react"

interface ExportDialogProps {
  warehouseId: string
  trigger?: React.ReactNode
  className?: string
}

interface ReportType {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  fields: string[]
  estimatedSize: string
}

export function ClinicExportDialog({ warehouseId, trigger, className = "" }: ExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<string>("")
  const [dateFrom, setDateFrom] = useState<Date>()
  const [dateTo, setDateTo] = useState<Date>()
  const [format, setFormat] = useState<string>("xlsx")
  const [isExporting, setIsExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [exportError, setExportError] = useState<string>("")

  const reportTypes: ReportType[] = [
    {
      id: "consultations",
      name: "Consultations Report",
      description: "Complete consultation records with patient details, diagnoses, and treatments",
      icon: <Stethoscope className="h-5 w-5 text-blue-600" />,
      fields: ["consultation_id", "date", "student", "diagnosis", "medicines", "payment"],
      estimatedSize: "~2-5MB"
    },
    {
      id: "medicines",
      name: "Medicine Inventory Report", 
      description: "Current stock levels, dispensing history, and revenue analysis",
      icon: <Package className="h-5 w-5 text-green-600" />,
      fields: ["medicine_name", "stock_level", "dispensed", "revenue", "status"],
      estimatedSize: "~1-3MB"
    },
    {
      id: "students",
      name: "Student Health Records",
      description: "Student registration data and consultation history",
      icon: <Users className="h-5 w-5 text-purple-600" />,
      fields: ["student_info", "consultations", "spending", "balance"],
      estimatedSize: "~1-2MB"
    },
    {
      id: "drug_tracking",
      name: "Drug Tracking Report",
      description: "Complete audit trail of all drug movements and staff activities",
      icon: <Activity className="h-5 w-5 text-orange-600" />,
      fields: ["timestamp", "medicine", "action", "staff", "patient", "reason"],
      estimatedSize: "~5-10MB"
    },
    {
      id: "security_audit",
      name: "Security Audit Report",
      description: "Suspicious activities and security alerts for anti-theft monitoring",
      icon: <Shield className="h-5 w-5 text-red-600" />,
      fields: ["activity_type", "severity", "staff", "medicine", "status"],
      estimatedSize: "~500KB-2MB"
    }
  ]

  const handleExport = async () => {
    if (!selectedReport) return

    setIsExporting(true)
    setExportError("")
    setExportSuccess(false)

    try {
      const response = await fetch('/api/warehouse/reports/clinic-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          warehouseId,
          reportType: selectedReport,
          dateFrom: dateFrom?.toISOString(),
          dateTo: dateTo?.toISOString(),
          format
        })
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `clinic_report_${selectedReport}_${new Date().toISOString().split('T')[0]}.xlsx`

      // Create blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setExportSuccess(true)
      setTimeout(() => {
        setOpen(false)
        setExportSuccess(false)
      }, 2000)

    } catch (error) {
      console.error('Export error:', error)
      setExportError('Failed to export report. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const resetForm = () => {
    setSelectedReport("")
    setDateFrom(undefined)
    setDateTo(undefined)
    setFormat("xlsx")
    setExportError("")
    setExportSuccess(false)
  }

  const selectedReportData = reportTypes.find(r => r.id === selectedReport)

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen)
      if (!newOpen) resetForm()
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className={`gap-2 ${className}`}>
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export Clinic Report
          </DialogTitle>
          <DialogDescription>
            Generate comprehensive reports for your clinic management system with anti-theft tracking
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Type Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Select Report Type</Label>
            <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
              {reportTypes.map((report) => (
                <Card
                  key={report.id}
                  className={`cursor-pointer transition-all ${
                    selectedReport === report.id
                      ? 'ring-2 ring-blue-500 border-blue-200 bg-blue-50'
                      : 'hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedReport(report.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{report.icon}</div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{report.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {report.estimatedSize}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {report.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {report.fields.slice(0, 3).map((field) => (
                            <Badge key={field} variant="secondary" className="text-xs">
                              {field.replace('_', ' ')}
                            </Badge>
                          ))}
                          {report.fields.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{report.fields.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="mt-1">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          selectedReport === report.id
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedReport === report.id && (
                            <CheckCircle className="w-4 h-4 text-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Date Range Selection */}
          {/*selectedReport && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Date Range</Label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>From Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFrom ? format(dateFrom, "PPP") : "Select start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>To Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateTo ? format(dateTo, "PPP") : "Select end date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Leave dates empty to export all available data
              </p>
            </div>
          )*/}

          {/* Format Selection */}
          {selectedReport && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Export Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Selected Report Preview */}
          {selectedReportData && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {selectedReportData.icon}
                  {selectedReportData.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    This report will include:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedReportData.fields.map((field) => (
                      <Badge key={field} variant="outline" className="text-xs">
                        {field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                    <span>Estimated size: {selectedReportData.estimatedSize}</span>
                    <span>Format: {format.toUpperCase()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Export Status */}
          {exportError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {exportError}
              </AlertDescription>
            </Alert>
          )}

          {exportSuccess && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Report exported successfully! Check your downloads folder.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isExporting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={!selectedReport || isExporting}
            className="w-full sm:w-auto gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}