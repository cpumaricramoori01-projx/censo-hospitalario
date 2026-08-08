// src/app/api/servicios/route.ts
// Lista todos los servicios (Medicina, Cirugia, Pediatria, UCI)

import { NextResponse } from "next/server";
import { db } from "@/db";
import { servicios } from "@/db/schema";

export async function GET() {
  try {
    const data = await db.select().from(servicios);
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}