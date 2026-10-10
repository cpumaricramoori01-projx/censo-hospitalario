import { NextResponse } from "next/server";
import { eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  ingresos,
  pacientesRef,
  egresos,
  diagnosticosIngreso,
  ubicacionesIngreso,
  ocupacionesActivas,
  camas,
  especialidades,
  servicios,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { fallo } from "@/lib/validation";
import { configuration } from "@/lib/census-store";
import { diasEstancia } from "@/lib/hospital";
export async function GET() {
  try {
    await requireUser();
    const result = await db.transaction(async (tx) => {
      const config = await configuration(tx);
      const rows = await tx
        .select({
          ingreso: ingresos,
          paciente: pacientesRef,
          activo: ocupacionesActivas,
        })
        .from(ingresos)
        .innerJoin(pacientesRef, eq(pacientesRef.hc, ingresos.hc))
        .leftJoin(egresos, eq(egresos.ingresoId, ingresos.id))
        .leftJoin(
          ocupacionesActivas,
          eq(ocupacionesActivas.ingresoId, ingresos.id),
        )
        .where(isNull(egresos.id));
      const diagnostics = await tx.select().from(diagnosticosIngreso);
      const locations = await tx
        .select()
        .from(ubicacionesIngreso)
        .where(isNull(ubicacionesIngreso.hasta));
      const pendientes = rows.flatMap(({ ingreso: i, paciente: p, activo }) => {
        const motivos: string[] = [];
        if (!activo || !locations.some((l) => l.ingresoId === i.id))
          motivos.push("Falta asignación o ubicación activa");
        if (!i.medicoId) motivos.push("Falta médico responsable");
        if (!i.financiamiento) motivos.push("Falta financiamiento");
        if (!diagnostics.some((d) => d.ingresoId === i.id))
          motivos.push("Falta diagnóstico");
        if (!p.fechaNacimiento) motivos.push("Completar fecha de nacimiento");
        if (i.tieneProblemaSocial) motivos.push("Seguimiento social pendiente");
        if (i.tieneProblemaJudicial)
          motivos.push("Seguimiento judicial pendiente");
        const estancia = diasEstancia(i.fechaIngreso);
        if (estancia >= config.alertaEstancia)
          motivos.push(`Revisar estancia de ${estancia} días`);
        return motivos.length
          ? [
              {
                ingresoId: i.id,
                hc: i.hc,
                paciente: [p.apellidoPaterno, p.apellidoMaterno, p.nombres]
                  .filter(Boolean)
                  .join(" "),
                servicio:
                  locations.find((l) => l.ingresoId === i.id)?.servicio ??
                  i.servicioIngreso ??
                  "Sin servicio",
                estancia,
                motivos,
                prioridad:
                  !activo || !locations.some((l) => l.ingresoId === i.id)
                    ? "integridad"
                    : "seguimiento",
              },
            ]
          : [];
      });
      const [orphans] = await tx.execute(
        sql`SELECT COUNT(*) AS n FROM ocupaciones_activas o LEFT JOIN egresos e ON e.ingreso_id=o.ingreso_id LEFT JOIN camas c ON c.id=o.cama_id WHERE e.id IS NOT NULL OR c.estado='inoperativa'`,
      );
      const beds = await tx
        .select({
          id: camas.id,
          numero: camas.numero,
          especialidadId: camas.especialidadId,
        })
        .from(camas)
        .leftJoin(especialidades, eq(especialidades.id, camas.especialidadId))
        .leftJoin(servicios, eq(servicios.id, especialidades.servicioId))
        .where(sql`${especialidades.id} IS NULL OR ${servicios.id} IS NULL`);
      const [history] = await tx.execute(
        sql`SELECT a.id AS ingresoA,b.id AS ingresoB,a.hc,a.fecha_ingreso AS inicioA,ea.fecha_egreso AS finA,b.fecha_ingreso AS inicioB,eb.fecha_egreso AS finB FROM ingresos a JOIN ingresos b ON a.hc=b.hc AND a.id<b.id LEFT JOIN egresos ea ON ea.ingreso_id=a.id LEFT JOIN egresos eb ON eb.ingreso_id=b.id WHERE a.fecha_ingreso<COALESCE(eb.fecha_egreso,'9999-12-31') AND b.fecha_ingreso<COALESCE(ea.fecha_egreso,'9999-12-31') ORDER BY a.fecha_ingreso,a.id,b.id LIMIT 101`,
      );
      return {
        historicos: (history as unknown as Record<string, unknown>[]).slice(
          0,
          100,
        ),
        hayMasHistoricos:
          (history as unknown as Record<string, unknown>[]).length > 100,
        alertaEstancia: config.alertaEstancia,
        pendientes: pendientes.sort(
          (a, b) =>
            a.prioridad.localeCompare(b.prioridad) || b.estancia - a.estancia,
        ),
        integridad: {
          asignacionesInvalidas: Number(
            (orphans as unknown as { n: number }[])[0].n,
          ),
          camasSinEstructura: beds.length,
        },
        nota: "Las alertas de estancia y seguimiento son avisos operativos; no indican por sí mismas una decisión clínica.",
      };
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return fallo(e);
  }
}
