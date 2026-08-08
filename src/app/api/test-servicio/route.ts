// =====================================================================
// src/app/api/test-servicio/route.ts
// API route TEMPORAL de prueba: inserta un registro en "servicios"
// para validar que Vercel puede escribir en la base de Aiven.
// Borrar junto con la pagina de prueba cuando ya no se necesite.
// =====================================================================
 
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { servicios } from "@/db/schema";
 
export async function POST(request: NextRequest) {
  try {
    const { nombre } = await request.json();
 
    if (!nombre || typeof nombre !== "string") {
      return NextResponse.json(
        { error: "Falta el campo 'nombre'" },
        { status: 400 }
      );
    }
 
    const result = await db.insert(servicios).values({ nombre });
 
    return NextResponse.json({ id: result[0].insertId }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
 