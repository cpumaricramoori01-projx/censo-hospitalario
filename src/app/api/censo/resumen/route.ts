import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  camas,
  egresos,
  ingresos,
  especialidades,
  servicios,
} from "@/db/schema";
import { eq, isNull } from "drizzle-orm";

export async function GET() {
  try {
    // =====================================================
    // 1. RESUMEN GENERAL DE CAMAS
    // =====================================================

    const todasLasCamas = await db
      .select({
        id: camas.id,
        estado: camas.estado,
      })
      .from(camas);

    const camasTotal = todasLasCamas.length;

    const camasLibres = todasLasCamas.filter(
      (cama) => cama.estado === "libre"
    ).length;

    const camasOcupadas = todasLasCamas.filter(
      (cama) => cama.estado === "ocupada"
    ).length;

    const camasInoperativas = todasLasCamas.filter(
      (cama) => cama.estado === "inoperativa"
    ).length;

    // =====================================================
    // 2. PACIENTES HOSPITALIZADOS ACTIVOS
    // =====================================================

    const ingresosActivos = await db
      .select({
        id: ingresos.id,
      })
      .from(ingresos)
      .leftJoin(
        egresos,
        eq(egresos.ingresoId, ingresos.id)
      )
      .where(isNull(egresos.id));

    const pacientesHospitalizados =
      ingresosActivos.length;

    // =====================================================
    // 3. PACIENTES CON OXÍGENO
    // =====================================================

    const pacientesOxigeno = await db
      .select({
        id: ingresos.id,
      })
      .from(ingresos)
      .leftJoin(
        egresos,
        eq(egresos.ingresoId, ingresos.id)
      )
      .where(isNull(egresos.id))
      .then(async () => {
        const activos = await db
          .select({
            usaOxigeno: ingresos.usaOxigeno,
          })
          .from(ingresos)
          .leftJoin(
            egresos,
            eq(egresos.ingresoId, ingresos.id)
          )
          .where(isNull(egresos.id));

        return activos.filter(
          (item) => item.usaOxigeno
        ).length;
      });

    // =====================================================
    // 4. PACIENTES CON VENTILADOR
    // =====================================================

    const pacientesVentilador = await db
      .select({
        usaVentilador: ingresos.usaVentilador,
      })
      .from(ingresos)
      .leftJoin(
        egresos,
        eq(egresos.ingresoId, ingresos.id)
      )
      .where(isNull(egresos.id))
      .then((activos) =>
        activos.filter(
          (item) => item.usaVentilador
        ).length
      );

    // =====================================================
    // 5. RESUMEN POR SERVICIO
    // =====================================================

    const estructuraServicios = await db
      .select({
        servicioId: servicios.id,
        servicioNombre: servicios.nombre,
        camaId: camas.id,
        camaEstado: camas.estado,
      })
      .from(servicios)
      .leftJoin(
        especialidades,
        eq(
          especialidades.servicioId,
          servicios.id
        )
      )
      .leftJoin(
        camas,
        eq(
          camas.especialidadId,
          especialidades.id
        )
      );

    const serviciosResumen = serviciosResumenDesdeDatos(
      estructuraServicios
    );

    // =====================================================
    // RESPUESTA
    // =====================================================

    return NextResponse.json({
      camas: {
        total: camasTotal,
        libres: camasLibres,
        ocupadas: camasOcupadas,
        inoperativas: camasInoperativas,
      },

      pacientes: {
        hospitalizados: pacientesHospitalizados,
        oxigeno: pacientesOxigeno,
        ventilador: pacientesVentilador,
      },

      servicios: serviciosResumen,
    });
  } catch (err) {
    console.error(
      "Error obteniendo resumen del censo:",
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

function serviciosResumenDesdeDatos(
  datos: Array<{
    servicioId: number;
    servicioNombre: string;
    camaId: number | null;
    camaEstado: string | null;
  }>
) {
  const mapa = new Map<
    number,
    {
      id: number;
      nombre: string;
      total: number;
      libres: number;
      ocupadas: number;
      inoperativas: number;
    }
  >();

  for (const fila of datos) {
    if (!mapa.has(fila.servicioId)) {
      mapa.set(fila.servicioId, {
        id: fila.servicioId,
        nombre: fila.servicioNombre,
        total: 0,
        libres: 0,
        ocupadas: 0,
        inoperativas: 0,
      });
    }

    const servicio = mapa.get(
      fila.servicioId
    )!;

    if (fila.camaId !== null) {
      servicio.total++;

      if (fila.camaEstado === "libre") {
        servicio.libres++;
      }

      if (fila.camaEstado === "ocupada") {
        servicio.ocupadas++;
      }

      if (fila.camaEstado === "inoperativa") {
        servicio.inoperativas++;
      }
    }
  }

  return Array.from(mapa.values());
}