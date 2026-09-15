// src/app/api/ingresos/route.ts
// Crea un ingreso hospitalario de forma transaccional.
// Si cualquier paso falla, no queda información parcial.

import { NextRequest, NextResponse } from "next/server";
import {
  ingresos,
  egresos,
  camas,
  pacientesRef,
  diagnosticosIngreso,
  medicos,
} from "@/db/schema";
import { db } from "@/db";
import { and, eq, isNull } from "drizzle-orm";

type DiagnosticoInput = {
  cie10Codigo?: string;
  cie10Descripcion: string;
};

class IngresoError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "IngresoError";
    this.status = status;
  }
}

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
      medicoId,
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
      fechaNacimiento?: string;
      camaId: number;
      medico?: string;
      medicoId?: number | null;
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

    // ---------------------------------------------------------
    // VALIDACIONES BASICAS
    // ---------------------------------------------------------

    if (!hc?.trim() || !camaId) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios: paciente (HC) y cama" },
        { status: 400 },
      );
    }

    if (!medicoId) {
      return NextResponse.json(
        { error: "Debes seleccionar un médico responsable" },
        { status: 400 },
      );
    }

    if (tipoIngreso !== "normal" && tipoIngreso !== "transferencia") {
      return NextResponse.json(
        { error: "Debes seleccionar un tipo de ingreso válido" },
        { status: 400 },
      );
    }

    if (!financiamiento?.trim()) {
      return NextResponse.json(
        { error: "Debes seleccionar el financiamiento" },
        { status: 400 },
      );
    }

    if (!diagnosticos || diagnosticos.length === 0) {
      return NextResponse.json(
        { error: "Debes indicar al menos un diagnóstico" },
        { status: 400 },
      );
    }

    if (diagnosticos.some((d) => !d?.cie10Descripcion?.trim())) {
      return NextResponse.json(
        { error: "Cada diagnóstico debe tener una descripción" },
        { status: 400 },
      );
    }

    if (tipoIngreso === "transferencia" && !servicioOrigenId) {
      return NextResponse.json(
        { error: "Un ingreso por transferencia debe indicar el servicio de origen" },
        { status: 400 },
      );
    }

    // ---------------------------------------------------------
    // TRANSACCION COMPLETA
    // ---------------------------------------------------------

    const ingresoId = await db.transaction(async (tx) => {
      const ingresoActivo = await tx
        .select({ id: ingresos.id })
        .from(ingresos)
        .leftJoin(egresos, eq(egresos.ingresoId, ingresos.id))
        .where(and(eq(ingresos.hc, hc.trim()), isNull(egresos.id)))
        .limit(1);

      if (ingresoActivo.length > 0) {
        throw new IngresoError(
          "El paciente ya tiene un ingreso hospitalario activo. Registre primero el egreso o traslado correspondiente.",
          409,
        );
      }

      const medicoExistente = await tx
        .select({ id: medicos.id })
        .from(medicos)
        .where(and(eq(medicos.id, medicoId), eq(medicos.activo, true)))
        .limit(1);

      if (medicoExistente.length === 0) {
        throw new IngresoError(
          "El médico seleccionado no existe o se encuentra inactivo.",
          400,
        );
      }

      const reservaCama = await tx
        .update(camas)
        .set({ estado: "ocupada" })
        .where(and(eq(camas.id, camaId), eq(camas.estado, "libre")));

      if (reservaCama[0].affectedRows === 0) {
        const camaExiste = await tx
          .select({ id: camas.id })
          .from(camas)
          .where(eq(camas.id, camaId))
          .limit(1);

        if (camaExiste.length === 0) {
          throw new IngresoError("Cama no encontrada", 404);
        }

        throw new IngresoError("Esa cama ya no está libre, elige otra", 409);
      }

      const pacienteExistente = await tx
        .select({ hc: pacientesRef.hc })
        .from(pacientesRef)
        .where(eq(pacientesRef.hc, hc.trim()))
        .limit(1);

      if (pacienteExistente.length === 0) {
        if (!nombres?.trim() || !apellidoPaterno?.trim() || !sexo) {
          throw new IngresoError(
            "El paciente no existe. Debes indicar al menos nombres, apellido paterno y sexo para crearlo.",
            400,
          );
        }

        await tx.insert(pacientesRef).values({
          hc: hc.trim(),
          dni,
          nombres: nombres.trim(),
          apellidoPaterno: apellidoPaterno.trim(),
          apellidoMaterno,
          sexo,
          fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : undefined,
          origenDato: "manual",
          fechaActualizacion: new Date(),
        });
      }

      const resultIngreso = await tx.insert(ingresos).values({
        hc: hc.trim(),
        camaId,
        fechaIngreso: new Date(),
        medico,
        medicoId,
        tipoIngreso,
        servicioOrigenId: tipoIngreso === "transferencia" ? servicioOrigenId : null,
        financiamiento: financiamiento.trim(),
        usaVentilador: !!usaVentilador,
        usaOxigeno: !!usaOxigeno,
        tieneProblemaJudicial: !!tieneProblemaJudicial,
        tieneProblemaSocial: !!tieneProblemaSocial,
        notasEstancia,
      });

      const nuevoIngresoId = resultIngreso[0].insertId;

      await tx.insert(diagnosticosIngreso).values(
        diagnosticos.map((d, i) => ({
          ingresoId: nuevoIngresoId,
          orden: i + 1,
          cie10Codigo: d.cie10Codigo?.trim() || null,
          cie10Descripcion: d.cie10Descripcion.trim(),
        })),
      );

      return nuevoIngresoId;
    });

    return NextResponse.json({ id: ingresoId }, { status: 201 });
  } catch (err) {
    console.error(err);

    if (err instanceof IngresoError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    );
  }
}
