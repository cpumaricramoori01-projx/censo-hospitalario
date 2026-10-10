import { jsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  ingresos,
  egresos,
  pacientesRef,
  camas,
  medicos,
  diagnosticosIngreso,
  ocupacionesActivas,
  ubicacionesIngreso,
  movimientos,
  servicios,
} from "@/db/schema";
import { requireWrite } from "@/lib/auth";
import {
  fallo,
  HttpError,
  identificador,
  texto,
  bandera,
} from "@/lib/validation";
import { fechaEvento } from "@/lib/hospital";
import { ubicacion, disponibleDesde } from "@/lib/clinical";

export async function POST(request: Request) {
  try {
    const user = await requireWrite();
    const b = await jsonObject(request);
    const hc = texto(b.hc, "Historia clínica", 20);
    const camaId = identificador(b.camaId, "Cama");
    const medicoId = identificador(b.medicoId, "Médico");
    const financiamiento = texto(b.financiamiento, "Financiamiento", 40);
    const notas = texto(b.notasEstancia, "Notas", 5000, false);
    if (
      typeof b.tipoIngreso !== "string" ||
      !["normal", "transferencia"].includes(b.tipoIngreso)
    )
      throw new HttpError("Tipo de ingreso inválido");
    const servicioOrigenId =
      b.tipoIngreso === "transferencia"
        ? identificador(b.servicioOrigenId, "Servicio de origen")
        : null;
    let fechaIngreso: Date;
    try {
      fechaIngreso = fechaEvento(b.fechaIngreso, "Fecha de ingreso");
    } catch (e) {
      throw new HttpError((e as Error).message);
    }
    if (
      !Array.isArray(b.diagnosticos) ||
      !b.diagnosticos.length ||
      b.diagnosticos.length > 20
    )
      throw new HttpError("Indica entre 1 y 20 diagnósticos");
    if (
      b.diagnosticos.some(
        (d) => !d || typeof d !== "object" || Array.isArray(d),
      )
    )
      throw new HttpError("Diagnóstico inválido");
    const diagnosticos = b.diagnosticos.map(
      (
        d: { cie10Codigo?: unknown; cie10Descripcion?: unknown },
        i: number,
      ) => ({
        orden: i + 1,
        cie10Codigo: texto(d.cie10Codigo, "Código CIE-10", 15, false) || null,
        cie10Descripcion: texto(d.cie10Descripcion, "Diagnóstico", 250),
      }),
    );
    const indicadores = {
      usaOxigeno: bandera(b.usaOxigeno),
      usaVentilador: bandera(b.usaVentilador),
      tieneProblemaJudicial: bandera(b.tieneProblemaJudicial),
      tieneProblemaSocial: bandera(b.tieneProblemaSocial),
    };
    const id = await db.transaction(async (tx) => {
      // Crear o bloquear la misma fila de paciente serializa admisiones concurrentes.
      const [existing] = await tx
        .select()
        .from(pacientesRef)
        .where(eq(pacientesRef.hc, hc))
        .for("update");
      if (!existing) {
        const nombres = texto(b.nombres, "Nombres", 100);
        const apellidoPaterno = texto(
          b.apellidoPaterno,
          "Apellido paterno",
          100,
        );
        if (typeof b.sexo !== "string" || !["M", "F"].includes(b.sexo))
          throw new HttpError("Sexo inválido");
        let nacimiento: Date | undefined;
        if (b.fechaNacimiento) {
          if (
            typeof b.fechaNacimiento !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(b.fechaNacimiento)
          )
            throw new HttpError("Fecha de nacimiento inválida");
          nacimiento = new Date(`${b.fechaNacimiento}T00:00:00Z`);
          if (
            !Number.isFinite(nacimiento.getTime()) ||
            nacimiento.toISOString().slice(0, 10) !== b.fechaNacimiento ||
            nacimiento > fechaIngreso
          )
            throw new HttpError("Fecha de nacimiento inválida");
        }
        await tx.insert(pacientesRef).values({
          hc,
          nombres,
          apellidoPaterno,
          apellidoMaterno:
            texto(b.apellidoMaterno, "Apellido materno", 100, false) || null,
          dni: texto(b.dni, "DNI", 15, false) || null,
          sexo: String(b.sexo),
          fechaNacimiento: nacimiento,
          origenDato: "manual",
          fechaActualizacion: new Date(),
        });
      }
      const activos = await tx
        .select({ id: ingresos.id })
        .from(ingresos)
        .leftJoin(egresos, eq(egresos.ingresoId, ingresos.id))
        .where(and(eq(ingresos.hc, hc), isNull(egresos.id)))
        .limit(1);
      if (activos.length)
        throw new HttpError(
          "El paciente ya está hospitalizado. Usa la ficha para trasladarlo.",
          409,
        );
      const [doctor] = await tx
        .select()
        .from(medicos)
        .where(and(eq(medicos.id, medicoId), eq(medicos.activo, true)));
      if (!doctor) throw new HttpError("Médico no disponible");
      const u = await ubicacion(tx, camaId);
      if (u.estado === "inoperativa")
        throw new HttpError("La cama está inoperativa", 409);
      const [ocupada] = await tx
        .select()
        .from(ocupacionesActivas)
        .where(eq(ocupacionesActivas.camaId, camaId));
      if (ocupada)
        throw new HttpError(
          "La cama ya está ocupada. Actualiza y selecciona otra.",
          409,
        );
      await disponibleDesde(tx, camaId, fechaIngreso);
      if (servicioOrigenId) {
        const [origen] = await tx
          .select()
          .from(servicios)
          .where(eq(servicios.id, servicioOrigenId));
        if (!origen || servicioOrigenId === u.servicioId)
          throw new HttpError("Servicio de origen inválido");
      }
      const result = await tx.insert(ingresos).values({
        hc,
        camaId,
        fechaIngreso,
        fechaRegistro: new Date(),
        registradoPor: user.usuario,
        medicoId,
        medico: [doctor.nombres, doctor.apellidoPaterno, doctor.apellidoMaterno]
          .filter(Boolean)
          .join(" ")
          .slice(0, 100),
        tipoIngreso: String(b.tipoIngreso),
        servicioOrigenId,
        financiamiento,
        notasEstancia: notas || null,
        ...indicadores,
        servicioIngresoId: u.servicioId,
        servicioIngreso: u.servicio,
        especialidadIngreso: u.especialidad,
        camaIngreso: u.cama,
      });
      const ingresoId = result[0].insertId;
      await tx.insert(ocupacionesActivas).values({ ingresoId, hc, camaId });
      await tx
        .update(camas)
        .set({ estado: "ocupada" })
        .where(eq(camas.id, camaId));
      await tx.insert(ubicacionesIngreso).values({
        ingresoId,
        camaId,
        servicioId: u.servicioId,
        servicio: u.servicio,
        especialidad: u.especialidad,
        cama: u.cama,
        desde: fechaIngreso,
      });
      await tx
        .insert(diagnosticosIngreso)
        .values(
          diagnosticos.map(
            (d: {
              orden: number;
              cie10Codigo: string | null;
              cie10Descripcion: string;
            }) => ({ ...d, ingresoId }),
          ),
        );
      await tx.insert(movimientos).values({
        ingresoId,
        camaDestinoId: camaId,
        fecha: fechaIngreso,
        fechaRegistro: new Date(),
        tipo: "ingreso",
        responsable: user.usuario,
        detalle: JSON.stringify({
          ubicacion: u.servicio + " / " + u.especialidad + " / " + u.cama,
        }),
      });
      return ingresoId;
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    return fallo(e);
  }
}
