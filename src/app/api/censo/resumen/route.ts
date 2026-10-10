import { NextResponse } from "next/server";
import { db } from "@/db";
import { servicios } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { fallo } from "@/lib/validation";
import { ocupacionActual } from "@/lib/occupancy";
export async function GET() {
  try {
    await requireUser();
    const rows = await ocupacionActual();
    const todos = await db.select().from(servicios);
    const count = (data: typeof rows) => ({
      total: data.length,
      libres: data.filter((r) => r.estado === "libre").length,
      ocupadas: data.filter((r) => r.estado === "ocupada").length,
      inoperativas: data.filter((r) => r.estado === "inoperativa").length,
    });
    return NextResponse.json({
      camas: count(rows),
      pacientes: {
        hospitalizados: rows.filter((r) => r.ingresoId).length,
        oxigeno: rows.filter((r) => r.ingresoId && r.usaOxigeno).length,
        ventilador: rows.filter((r) => r.ingresoId && r.usaVentilador).length,
      },
      servicios: todos.map((s) => ({
        id: s.id,
        nombre: s.nombre,
        ...count(rows.filter((r) => r.servicioId === s.id)),
      })),
      inconsistencias: rows.filter((r) => r.inconsistente).length,
      actualizadoEn: new Date().toISOString(),
    });
  } catch (e) {
    return fallo(e);
  }
}
