// src/app/api/egresos/route.ts
// Crea un egreso para un ingreso activo y libera la cama.
 
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { egresos, ingresos, camas } from "@/db/schema";
import { eq } from "drizzle-orm";
 
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ingresoId,
      tipoEgreso,
      codigoEgresoOriginal,
      servicioDestinoId,
      medicoAlta,
      diagnosticoFinal,
    }: {
      ingresoId: number;
      tipoEgreso: string;
      codigoEgresoOriginal?: string;
      servicioDestinoId?: number;
      medicoAlta?: string;
      diagnosticoFinal?: string;
    } = body;
 
    if (!ingresoId || !tipoEgreso) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios: ingresoId y tipoEgreso" },
        { status: 400 }
      );
    }
    if (tipoEgreso === "transferencia" && !servicioDestinoId) {
      return NextResponse.json(
        { error: "Un egreso por transferencia debe indicar el servicio de destino" },
        { status: 400 }
      );
    }
 
    // 1. Verifica que el ingreso exista y no tenga ya un egreso
    const ingresoExistente = await db
      .select()
      .from(ingresos)
      .where(eq(ingresos.id, ingresoId));
 
    if (ingresoExistente.length === 0) {
      return NextResponse.json({ error: "Ingreso no encontrado" }, { status: 404 });
    }
 
    const egresoExistente = await db
      .select()
      .from(egresos)
      .where(eq(egresos.ingresoId, ingresoId));
 
    if (egresoExistente.length > 0) {
      return NextResponse.json(
        { error: "Este ingreso ya tiene un egreso registrado" },
        { status: 409 }
      );
    }
 
    // 2. Crea el egreso
    const resultEgreso = await db.insert(egresos).values({
      ingresoId,
      fechaEgreso: new Date(),
      tipoEgreso,
      codigoEgresoOriginal,
      servicioDestinoId: tipoEgreso === "transferencia" ? servicioDestinoId : null,
      medicoAlta,
      diagnosticoFinal,
    });
 
    // 3. Libera la cama
    const camaId = ingresoExistente[0].camaId;
    await db.update(camas).set({ estado: "libre" }).where(eq(camas.id, camaId));
 
    return NextResponse.json({ id: resultEgreso[0].insertId }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}