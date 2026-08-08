// src/app/api/camas/route.ts
// Lista camas LIBRES de una especialidad especifica
// Uso: GET /api/camas?especialidadId=1

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { camas } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const especialidadId = request.nextUrl.searchParams.get("especialidadId");

    if (!especialidadId) {
      return NextResponse.json(
        { error: "Falta el parametro especialidadId" },
        { status: 400 }
      );
    }

    const data = await db
      .select()
      .from(camas)
      .where(
        and(
          eq(camas.especialidadId, Number(especialidadId)),
          eq(camas.estado, "libre")
        )
      );

    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}