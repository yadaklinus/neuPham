"use client"


import axios from "axios";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";


export default function SupAdminLayout({children}:{children:React.ReactNode}){
    const {data,status} = useSession()
    const router = useRouter()

    console.log(data)
        
    useEffect(()=>{
        if(status == "unauthenticated"){  
          router.replace("/user/login")
          console.log("not auth")  
        }else if(data?.user.role == "supaAdmina"){
          signOut()
          console.log("ok")
        }
       
    },[status,data])
       
    // if(data?.role != "supaAdmina") return router.replace("/login")
    
    return(
        <>
        
                    {children}
         
        </>
    )
}