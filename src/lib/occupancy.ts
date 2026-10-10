import { db } from "@/db";
import {
  camas,
  especialidades,
  servicios,
  ocupacionesActivas,
  ingresos,
  pacientesRef,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { diasEstancia } from "./hospital";
export async function ocupacionActual() {
  const rows = await db
    .select({
      id: camas.id,
      numero: camas.numero,
      estadoCama: camas.estado,
      ubicacion: camas.ubicacion,
      especialidadId: especialidades.id,
      especialidad: especialidades.nombre,
      servicioId: servicios.id,
      servicio: servicios.nombre,
      ingresoId: ocupacionesActivas.ingresoId,
      hc: ocupacionesActivas.hc,
      fechaIngreso: ingresos.fechaIngreso,
      usaOxigeno: ingresos.usaOxigeno,
      usaVentilador: ingresos.usaVentilador,
      nombres: pacientesRef.nombres,
      apellidoPaterno: pacientesRef.apellidoPaterno,
      apellidoMaterno: pacientesRef.apellidoMaterno,
    })
    .from(camas)
    .innerJoin(especialidades, eq(camas.especialidadId, especialidades.id))
    .innerJoin(servicios, eq(especialidades.servicioId, servicios.id))
    .leftJoin(ocupacionesActivas, eq(ocupacionesActivas.camaId, camas.id))
    .leftJoin(ingresos, eq(ingresos.id, ocupacionesActivas.ingresoId))
    .leftJoin(pacientesRef, eq(pacientesRef.hc, ocupacionesActivas.hc))
    .orderBy(servicios.nombre, camas.numero);
  return rows.map((r) => ({
    ...r,
    estado: r.ingresoId
      ? "ocupada"
      : r.estadoCama === "inoperativa"
        ? "inoperativa"
        : "libre",
    estadoTexto: r.ingresoId
      ? "Ocupada"
      : r.estadoCama === "inoperativa"
        ? "Inoperativa"
        : "Libre",
    paciente: r.ingresoId
      ? [r.nombres, r.apellidoPaterno, r.apellidoMaterno]
          .filter(Boolean)
          .join(" ")
      : null,
    diasEstancia: r.fechaIngreso ? diasEstancia(r.fechaIngreso) : null,
    inconsistente: !!r.ingresoId !== (r.estadoCama === "ocupada"),
  }));
}
