import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  camas,
  especialidades,
  servicios,
  periodosCama,
  ocupacionesActivas,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { fallo, identificador } from "@/lib/validation";
export async function GET(request: Request) {
  try {
    await requireUser();
    const id = new URL(request.url).searchParams.get("camaId");
    if (id)
      return NextResponse.json(
        await db
          .select()
          .from(periodosCama)
          .where(eq(periodosCama.camaId, identificador(id)))
          .orderBy(desc(periodosCama.desde), desc(periodosCama.id)),
        { headers: { "Cache-Control": "no-store" } },
      );
    return NextResponse.json(
      await db
        .select({
          id: camas.id,
          numero: camas.numero,
          ubicacion: camas.ubicacion,
          especialidadId: camas.especialidadId,
          especialidad: especialidades.nombre,
          servicio: servicios.nombre,
          estado: camas.estado,
          ingresoId: ocupacionesActivas.ingresoId,
        })
        .from(camas)
        .innerJoin(especialidades, eq(camas.especialidadId, especialidades.id))
        .innerJoin(servicios, eq(especialidades.servicioId, servicios.id))
        .leftJoin(ocupacionesActivas, eq(ocupacionesActivas.camaId, camas.id))
        .orderBy(servicios.nombre, camas.numero),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return fallo(e);
  }
}
