// src/app/api/ingresos/route.ts (v3)
// Igual que v2, pero al crear un paciente nuevo tambien captura
// sexo y fecha de nacimiento (necesarios para los reportes de censo
// desglosados por sexo). correo/telefono/direccion quedan fuera a
// proposito: llegaran sincronizados del HIS mas adelante, no se
// capturan manualmente aqui.
 
import { NextRequest, NextResponse } from "next/server";
import {
  ingresos,
  camas,
  pacientesRef,
  diagnosticosIngreso,
} from "@/db/schema";
import { db } from "@/db";
import { eq } from "drizzle-orm";
 
type DiagnosticoInput = {
  cie10Codigo?: string;
  cie10Descripcion: string;
};
 
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      hc,
      dni,
      nombres,
      apellidoPaterno,
      apellidoMaterno,
      sexo,
      fechaNacimiento,
      camaId,
      medico,
      tipoIngreso,
      servicioOrigenId,
      financiamiento,
      usaVentilador,
      usaOxigeno,
      tieneProblemaJudicial,
      tieneProblemaSocial,
      notasEstancia,
      diagnosticos,
    }: {
      hc: string;
      dni?: string;
      nombres?: string;
      apellidoPaterno?: string;
      apellidoMaterno?: string;
      sexo?: "M" | "F";
      fechaNacimiento?: string; // "YYYY-MM-DD"
      camaId: number;
      medico?: string;
      tipoIngreso: "normal" | "transferencia";
      servicioOrigenId?: number;
      financiamiento?: string;
      usaVentilador?: boolean;
      usaOxigeno?: boolean;
      tieneProblemaJudicial?: boolean;
      tieneProblemaSocial?: boolean;
      notasEstancia?: string;
      diagnosticos: DiagnosticoInput[];
    } = body;
 
    if (!hc || !camaId) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios: hc y camaId" },
        { status: 400 }
      );
    }
    if (!diagnosticos || diagnosticos.length === 0) {
      return NextResponse.json(
        { error: "Debes indicar al menos un diagnóstico" },
        { status: 400 }
      );
    }
    if (tipoIngreso === "transferencia" && !servicioOrigenId) {
      return NextResponse.json(
        { error: "Un ingreso por transferencia debe indicar el servicio de origen" },
        { status: 400 }
      );
    }
 
    const pacienteExistente = await db
      .select()
      .from(pacientesRef)
      .where(eq(pacientesRef.hc, hc));
 
    if (pacienteExistente.length === 0) {
      if (!nombres || !apellidoPaterno || !sexo) {
        return NextResponse.json(
          {
            error:
              "El paciente no existe. Debes indicar al menos nombres, apellido paterno y sexo para crearlo.",
          },
          { status: 400 }
        );
      }
      await db.insert(pacientesRef).values({
        hc,
        dni,
        nombres,
        apellidoPaterno,
        apellidoMaterno,
        sexo,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : undefined,
        origenDato: "manual",
        fechaActualizacion: new Date(),
      });
    }
 
    const camaActual = await db.select().from(camas).where(eq(camas.id, camaId));
    if (camaActual.length === 0) {
      return NextResponse.json({ error: "Cama no encontrada" }, { status: 404 });
    }
    if (camaActual[0].estado !== "libre") {
      return NextResponse.json(
        { error: "Esa cama ya no está libre, elige otra" },
        { status: 409 }
      );
    }
 
    const resultIngreso = await db.insert(ingresos).values({
      hc,
      camaId,
      fechaIngreso: new Date(),
      medico,
      tipoIngreso,
      servicioOrigenId: tipoIngreso === "transferencia" ? servicioOrigenId : null,
      financiamiento,
      usaVentilador: !!usaVentilador,
      usaOxigeno: !!usaOxigeno,
      tieneProblemaJudicial: !!tieneProblemaJudicial,
      tieneProblemaSocial: !!tieneProblemaSocial,
      notasEstancia,
    });
 
    const ingresoId = resultIngreso[0].insertId;
 
    await db.insert(diagnosticosIngreso).values(
      diagnosticos.map((d, i) => ({
        ingresoId,
        orden: i + 1,
        cie10Codigo: d.cie10Codigo,
        cie10Descripcion: d.cie10Descripcion,
      }))
    );
 
    await db.update(camas).set({ estado: "ocupada" }).where(eq(camas.id, camaId));
 
    return NextResponse.json({ id: ingresoId }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}