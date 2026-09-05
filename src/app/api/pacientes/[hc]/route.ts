// src/app/api/pacientes/[hc]/route.ts (v2)
// Busca un paciente por HC en pacientes_ref
 
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pacientesRef } from "@/db/schema";
import { eq } from "drizzle-orm";
 
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hc: string }> }
) {
  try {
    const { hc } = await params;
 
    const data = await db
      .select()
      .from(pacientesRef)
      .where(eq(pacientesRef.hc, hc));
 
    if (data.length === 0) {
      return NextResponse.json(
        { error: "Paciente no encontrado" },
        { status: 404 }
      );
    }
 
    return NextResponse.json(data[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
 