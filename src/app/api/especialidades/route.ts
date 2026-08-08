// src/app/api/especialidades/route.ts
// Lista especialidades de un servicio especifico
// Uso: GET /api/especialidades?servicioId=1

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { especialidades } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const servicioId = request.nextUrl.searchParams.get("servicioId");

    if (!servicioId) {
      return NextResponse.json(
        { error: "Falta el parametro servicioId" },
        { status: 400 }
      );
    }

    const data = await db
      .select()
      .from(especialidades)
      .where(eq(especialidades.servicioId, Number(servicioId)));

    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}