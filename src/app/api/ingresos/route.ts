// src/app/api/ingresos/route.ts
// Crea un nuevo ingreso de paciente.
// - Si el HC no existe en pacientes_ref, lo crea (con los datos manuales
//   que envie el formulario).
// - Crea el registro en "ingresos".
// - Marca la cama correspondiente como "ocupada".

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ingresos, camas, pacientesRef } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      hc,
      nombres,
      apellidos,
      camaId,
      diagnostico,
      medico,
    }: {
      hc: string;
      nombres?: string;
      apellidos?: string;
      camaId: number;
      diagnostico?: string;
      medico?: string;
    } = body;

    if (!hc || !camaId) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios: hc y camaId" },
        { status: 400 }
      );
    }

    // 1. Verifica si el paciente ya existe en pacientes_ref
    const pacienteExistente = await db
      .select()
      .from(pacientesRef)
      .where(eq(pacientesRef.hc, hc));

    if (pacienteExistente.length === 0) {
      // No existe: lo creamos con los datos que vinieron del formulario
      if (!nombres || !apellidos) {
        return NextResponse.json(
          {
            error:
              "El paciente no existe. Debes indicar nombres y apellidos para crearlo.",
          },
          { status: 400 }
        );
      }
      await db.insert(pacientesRef).values({
        hc,
        nombres,
        apellidos,
        origenDato: "manual",
        fechaActualizacion: new Date(),
      });
    }

    // 2. Verifica que la cama siga libre (evita condiciones de carrera basicas)
    const camaActual = await db
      .select()
      .from(camas)
      .where(eq(camas.id, camaId));

    if (camaActual.length === 0) {
      return NextResponse.json({ error: "Cama no encontrada" }, { status: 404 });
    }
    if (camaActual[0].estado !== "libre") {
      return NextResponse.json(
        { error: "Esa cama ya no esta libre, elige otra" },
        { status: 409 }
      );
    }

    // 3. Crea el ingreso
    const resultIngreso = await db.insert(ingresos).values({
      hc,
      camaId,
      fechaIngreso: new Date(),
      diagnostico,
      medico,
    });

    // 4. Marca la cama como ocupada
    await db
      .update(camas)
      .set({ estado: "ocupada" })
      .where(eq(camas.id, camaId));

    return NextResponse.json(
      { id: resultIngreso[0].insertId },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}