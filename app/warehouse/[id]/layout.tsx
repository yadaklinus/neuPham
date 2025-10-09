"use client"
import { getWareHouseId } from "@/hooks/get-werehouseId";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";


export default function SupAdminLayout({children}:{children:React.ReactNode}){
    const {data,status} = useSession()
    const router = useRouter()
    const warehouseId = getWareHouseId()
    
    useEffect(()=>{

        
        if(status == "unauthenticated"){
           
                router.replace("/user/login")
                
            
        }
        if(status == "authenticated"){
            if(data){
                if(data?.user?.warehousesId == "supaAdmina"){
                    router.replace("/user/login")

                }
                if(data?.user?.warehousesId !== warehouseId){
                    router.replace("/user/login")
                    
                }
            }
        }

    
    // if(data?.role != "supaAdmina" && status == "authenticated") router.replace("/login")
    // if(status == "unauthenticated") router.push("/login")
    },[status,data])
       
    // if(data?.role != "supaAdmina") return router.replace("/login")
    
    return(
        <>
        
                    {children}
         
        </>
    )
}