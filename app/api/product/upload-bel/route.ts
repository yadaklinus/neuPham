import { NextResponse } from 'next/server';
import offlinePrisma from "@/lib/oflinePrisma";

export async function POST(req: Request) {
  const {products} = await req.json();


  try {
    const created = await offlinePrisma.product.createMany({
      data: products,
    // In case barcode is unique
    });

    return NextResponse.json({ success: true, created });
  } catch (error) {
    console.error('Error saving products:', error);
    return NextResponse.json({ success: false, error });
  }
}
