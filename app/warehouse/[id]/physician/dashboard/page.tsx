"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"

export default function PurchaseDashboard() {
 const params = useParams()
  const router = useRouter()
  const warehouseId = params.id as string
  useEffect(() => {
    router.push(`/warehouse/${warehouseId}/physician/sales/add`)
  }, [router])

  return null // or a loading spinner if you want
}
