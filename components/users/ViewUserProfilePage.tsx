"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
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
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  User, 
  ArrowLeft, 
  Edit, 
  Shield,
  Mail,
  Phone,
  Building,
  Calendar,
  Clock
} from "lucide-react"
import { getWareHouseId } from "@/hooks/get-werehouseId"
import { useSession } from "next-auth/react"
import { Loading } from "@/components/loading"

interface UserProfile {
  id: string
  userName: string
  email: string
  phoneNumber: string
  role: string
  warehousesId: string
  lastLogin: string | null
  createdAt: string
  updatedAt: string
  warehouses: {
    id: string
    name: string
    warehouseCode: string
  }
}

export default function ViewUserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [endPoint, setEndPoint] = useState("")
  const warehouseId = params.id as string
  const { data: session } = useSession()

  useEffect(() => {
    setEndPoint(`/warehouse/${warehouseId}/${session?.user?.role}`)
  }, [session, warehouseId])

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/users/${params.userId}`)

        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setUser(result.data)
          } else {
            console.error('Failed to fetch user:', result.error)
          }
        } else {
          console.error('Failed to fetch user:', response.statusText)
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setLoading(false)
      }
    }

    if (params.userId) {
      fetchUser()
    }
  }, [params.userId])

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-600">Admin</Badge>
      case "physician":
        return <Badge className="bg-blue-600">Physician</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  if (loading) {
    return <Loading />
  }

  if (!user) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p>User not found</p>
            <Button onClick={() => router.back()} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
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
                <BreadcrumbLink href={`${endPoint}/dashboard`}>Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`${endPoint}/people/users`}>Users</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>User Profile</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">User Profile</h1>
              <p className="text-muted-foreground">{user.userName}</p>
            </div>
          </div>
          {session?.user?.role == "suapaAdmina" && 
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => session?.user?.role == "supaAdmina" ? router.push(`/sup-admin/warehouses/${warehouseId}/users/${user.id}/edit`) : router.push(`${endPoint}/people/users/${user.id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit User
            </Button>
            <Button variant="outline" onClick={() => session?.user?.role == "supaAdmina" ? router.push(`/sup-admin/warehouses/${warehouseId}/users/${user.id}/reset-password`) :  router.push(`${endPoint}/people/users/${user.id}/reset-password`)}>
              <Shield className="mr-2 h-4 w-4" />
              Reset Password
            </Button>
          </div>
          }
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>Basic user details and account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src="" alt={user.userName} />
                  <AvatarFallback className="text-lg">
                    {user.userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{user.userName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getRoleBadge(user.role)}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Email:</span>
                  <span className="text-sm">{user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Phone:</span>
                  <span className="text-sm">{user.phoneNumber}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Warehouse:</span>
                  <span className="text-sm">{user.warehouses?.name || 'No warehouse assigned'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Account Activity</CardTitle>
              <CardDescription>Login and account activity information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Account Created:</span>
                <span className="text-sm">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Last Updated:</span>
                <span className="text-sm">
                  {new Date(user.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>Additional system-related information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">User ID:</span>
                <span className="ml-2 font-mono text-xs">{user.id}</span>
              </div>
              
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}