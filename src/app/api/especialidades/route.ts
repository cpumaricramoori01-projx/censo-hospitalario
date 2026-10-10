import { lockCensus, recordCapacity, audit } from "@/lib/census-store";
import { jsonObject } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  especialidades,
  servicios,
  camas,
  ocupacionesActivas,
} from "@/db/schema";
import { requireUser, requireWrite } from "@/lib/auth";
import { fallo, identificador, texto, HttpError } from "@/lib/validation";
export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const servicioId = identificador(
      request.nextUrl.searchParams.get("servicioId"),
    );
    return NextResponse.json(
      await db
        .select()
        .from(especialidades)
        .where(eq(especialidades.servicioId, servicioId))
        .orderBy(especialidades.nombre),
    );
  } catch (e) {
    return fallo(e);
  }
}
async function guardar(request: Request, editar: boolean) {
  try {
    const user = await requireWrite(true);
    const b = await jsonObject(request);
    const nombre = texto(b.nombre, "Especialidad", 80);
    const servicioId = identificador(b.servicioId, "Servicio");
    const result = await db.transaction(async (tx) => {
      await lockCensus(tx);
      const [service] = await tx
        .select()
        .from(servicios)
        .where(eq(servicios.id, servicioId))
        .for("update");
      if (!service) throw new HttpError("Servicio no encontrado", 404);
      const id = editar ? identificador(b.id) : null;
      const [duplicate] = await tx
        .select()
        .from(especialidades)
        .where(
          and(
            eq(especialidades.servicioId, servicioId),
            eq(especialidades.nombre, nombre),
            ...(id ? [ne(especialidades.id, id)] : []),
          ),
        )
        .for("update");
      if (duplicate)
        throw new HttpError("Ya existe esa especialidad en este servicio", 409);
      if (!id) {
        const res = await tx
          .insert(especialidades)
          .values({ nombre, servicioId });
        await audit(tx, user.usuario, "especialidad", String(res[0].insertId), "crear", null, { nombre, servicioId });
        return { id: res[0].insertId, nombre, servicioId };
      }
      const [actual] = await tx
        .select()
        .from(especialidades)
        .where(eq(especialidades.id, id))
        .for("update");
      if (!actual) throw new HttpError("Especialidad no encontrada", 404);
      if (actual.servicioId !== servicioId) {
        const active = await tx
          .select({ id: camas.id })
          .from(camas)
          .innerJoin(
            ocupacionesActivas,
            eq(ocupacionesActivas.camaId, camas.id),
          )
          .where(eq(camas.especialidadId, id));
        if (active.length)
          throw new HttpError(
            "Esta especialidad tiene pacientes hospitalizados. Trasládalos antes de cambiarla de servicio",
            409,
          );
      }
      await tx
        .update(especialidades)
        .set({ nombre, servicioId })
        .where(eq(especialidades.id, id));
      const affected = await tx.select({ id: camas.id }).from(camas).where(eq(camas.especialidadId, id)).orderBy(camas.id);
      for (const bed of affected) await recordCapacity(tx, bed.id, user.usuario, "Cambio administrativo de especialidad");
      await audit(tx, user.usuario, "especialidad", String(id), "actualizar", actual, { nombre, servicioId });
      return { id, nombre, servicioId };
    });
    return NextResponse.json(result, { status: editar ? 200 : 201 });
  } catch (e) {
    return fallo(e);
  }
}
export async function POST(request: Request) {
  return guardar(request, false);
}
export async function PATCH(request: Request) {
  return guardar(request, true);
}
