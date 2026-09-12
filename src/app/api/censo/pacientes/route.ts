import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  ingresos,
  egresos,
  pacientesRef,
  camas,
  especialidades,
  servicios,
  medicos,
  diagnosticosIngreso,
} from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";

export async function GET() {
  try {
    const data = await db
      .select({
        ingresoId: ingresos.id,
        hc: ingresos.hc,

        nombres: pacientesRef.nombres,
        apellidoPaterno: pacientesRef.apellidoPaterno,
        apellidoMaterno: pacientesRef.apellidoMaterno,

        servicioId: servicios.id,
        servicioNombre: servicios.nombre,

        especialidadId: especialidades.id,
        especialidadNombre: especialidades.nombre,

        camaId: camas.id,
        numeroCama: camas.numero,

        medicoId: medicos.id,
        medicoCmp: medicos.cmp,
        medicoNombres: medicos.nombres,
        medicoApellidoPaterno: medicos.apellidoPaterno,
        medicoApellidoMaterno: medicos.apellidoMaterno,

        fechaIngreso: ingresos.fechaIngreso,
        usaOxigeno: ingresos.usaOxigeno,
        usaVentilador: ingresos.usaVentilador,

        diagnosticoCodigo:
          diagnosticosIngreso.cie10Codigo,
        diagnosticoDescripcion:
          diagnosticosIngreso.cie10Descripcion,
      })
      .from(ingresos)

      .leftJoin(
        egresos,
        eq(egresos.ingresoId, ingresos.id)
      )

      .innerJoin(
        pacientesRef,
        eq(pacientesRef.hc, ingresos.hc)
      )

      .innerJoin(
        camas,
        eq(camas.id, ingresos.camaId)
      )

      .innerJoin(
        especialidades,
        eq(
          especialidades.id,
          camas.especialidadId
        )
      )

      .innerJoin(
        servicios,
        eq(
          servicios.id,
          especialidades.servicioId
        )
      )

      .leftJoin(
        medicos,
        eq(
          medicos.id,
          ingresos.medicoId
        )
      )

      .leftJoin(
        diagnosticosIngreso,
        and(
          eq(
            diagnosticosIngreso.ingresoId,
            ingresos.id
          ),
          eq(
            diagnosticosIngreso.orden,
            1
          )
        )
      )

      .where(
        isNull(egresos.id)
      );

    const resultado = data.map((item) => ({
      ingresoId: item.ingresoId,
      hc: item.hc,

      paciente: [
        item.nombres,
        item.apellidoPaterno,
        item.apellidoMaterno,
      ]
        .filter(Boolean)
        .join(" "),

      servicio: {
        id: item.servicioId,
        nombre: item.servicioNombre,
      },

      especialidad: {
        id: item.especialidadId,
        nombre: item.especialidadNombre,
      },

      cama: {
        id: item.camaId,
        numero: item.numeroCama,
      },

      medico: item.medicoId
        ? {
            id: item.medicoId,
            cmp: item.medicoCmp,
            nombre: [
              item.medicoNombres,
              item.medicoApellidoPaterno,
              item.medicoApellidoMaterno,
            ]
              .filter(Boolean)
              .join(" "),
          }
        : null,

      diagnostico: item.diagnosticoCodigo
        ? {
            codigo: item.diagnosticoCodigo,
            descripcion:
              item.diagnosticoDescripcion,
          }
        : {
            codigo: null,
            descripcion:
              item.diagnosticoDescripcion,
          },

      fechaIngreso: item.fechaIngreso,

      usaOxigeno: item.usaOxigeno,
      usaVentilador: item.usaVentilador,
    }));

    return NextResponse.json(resultado);
  } catch (err) {
    console.error(
      "Error obteniendo pacientes hospitalizados:",
      err
    );

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Error desconocido",
      },
      { status: 500 }
    );
  }
}