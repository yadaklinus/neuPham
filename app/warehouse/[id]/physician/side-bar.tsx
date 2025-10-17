"use client"

import type * as React from "react"
import { useState,useEffect } from "react"
import {
  BarChart3,
  Bell,
  ChevronRight,
  Home,
  Package,
  Plus,
  Settings,
  ShoppingCart,
  FileText,
  Truck,
  ArrowLeftRight,
  Users,
  User,
  Building2,
  UserCheck,
  Eye,
  Warehouse,
  type LucideIcon,
  Receipt,
  Calculator,
  Quote,
  Stethoscope,
} from "lucide-react"


import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import fetchData from "@/hooks/fetch-data"
import { NavbarItem } from "@heroui/navbar"
import { Button } from "@heroui/button"
import { signOut, useSession } from "next-auth/react"
import { getWareHouseId } from "@/hooks/get-werehouseId"
import { SystemStatus } from "@/components/system-status"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalculatorCard } from "@/components/shad-cal"
import { useRouter } from "next/navigation"

// Navigation data for inventory management system

function NavSection({
  title,
  items,
}: {
  title: string
  items: Array<{
    title: string
    url?: string
    icon: LucideIcon
    items?: Array<{
      title: string
      url: string
      icon?: LucideIcon
    }>
  }>
}) {

  const [open, setOpen] = useState(false);
  
  return (
    
    <SidebarGroup>
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          if (item.items) {
            return (
              <Collapsible key={item.title} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title}>
                      <item.icon />
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <a href={subItem.url}>
                              {subItem.icon && <subItem.icon className="w-4 h-4" />}
                              <span>{subItem.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                    
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          }

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title}>
                <a href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

export function PurchaseSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [open, setOpen] = useState(false);
  const {data,loading,error} = fetchData("/api/settings")
  const warehouseId = getWareHouseId()
  const {data:session} = useSession()
  const [endpoint,setEndPoint] = useState("")
  const router = useRouter()


  useEffect(()=>{
    setEndPoint(`/warehouse/${warehouseId}/${session?.user?.role}`)
  },[session,warehouseId])

  

  
  if(loading) return ""

  // const isOnline = useConnectionCheck()
  
  return (
    <Sidebar className="mb-4" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-12 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <img src="/neu.jpg"/>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{data?.companyName}</span>
                  <span className="truncate text-xs">Clinic Management System</span>
                  {/* {isOnline ? "online" : "ofline"} */}
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
        </SidebarMenu>
        <SidebarMenu>
          <SidebarMenuItem>
          <SidebarMenuButton
              tooltip="Consultation"
              onClick={()=>router.replace(`${endpoint}/sales/add`)}
              className="bg-blue-500 text-white hover:bg-blue-600 transition"
            >
              <Stethoscope className="mr-2 h-4 w-4" />
              <span>New Consultation</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        
      
        <NavSection title="Overview" items={[
                {
                  title: "Dashboard",
                  url: `${endpoint}/dashboard`,
                  icon: Home,
                },
              ]} />
        <NavSection title="Clinic Operations" items={[
    {
      title: "Consultations",
      icon: Stethoscope,
      items: [
        {
          title: "New Consultation",
          url: `${endpoint}/sales/add`,
          icon: Plus,
        },
        {
          title: "View Consultations",
          url: `${endpoint}/sales/consultations`,
          icon: Eye,
        },
        
      ],
    },
  
    {
      title: "Medicines",
      icon: Package,
      items: [
        {
          title: "Add Medicine",
          url: `${endpoint}/products/add`,
          icon: Plus,
        },
        {
          title: "View Medicines",
          url: `${endpoint}/products/list`,
          icon: Eye,
        },
        // {
        //   title: "Update Medicine",
        //   url: `${endpoint}/products/update`,
        //   icon: Plus,
        // },
      ],
    },
   
  ]} />
        <NavSection title="People" items={[
              {
                title: "People",
                icon: Users,
                items: [
                  
                  {
                    title: "Students",
                    url: `${endpoint}/people/students`,
                    icon: UserCheck,
                  },
                  
                ],
              },
            ]} />
       

        

        <SidebarMenu>
          <SidebarMenuItem>
          <SidebarMenuButton
              tooltip="Logout"
              onClick={() => signOut()}
              className="bg-red-500 text-white hover:bg-red-600 transition"
            >
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarMenu>
          <SidebarMenuItem>
          <SidebarMenuButton
            >
              
              <span></span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}