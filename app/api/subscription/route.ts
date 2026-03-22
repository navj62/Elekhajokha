import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {prisma } from "@/lib/prisma"
import { error } from "console";

export async function POST(){
    const userId=await auth();
    if(!userId){
        return NextResponse.json({error:"Unauthorized"},{status:400})
    }
    
    
}