import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { servicios, camas, especialidades } from "@/db/schema";
import { requireUser, requireWrite } from "@/lib/auth";
import {
  fallo,
  texto,
  identificador,
  jsonObject,
  HttpError,
} from "@/lib/validation";
import { lockCensus, recordCapacity, audit } from "@/lib/census-store";
export async function GET() {
  try {
    await requireUser();
    return NextResponse.json(await db.select().from(servicios));
  } catch (e) {
    return fallo(e);
  }
}
async function save(request: Request, edit: boolean) {
  try {
    const user = await requireWrite(true);
    const b = await jsonObject(request);
    const nombre = texto(b.nombre, "Servicio", 60);
    const id = edit ? identificador(b.id) : null;
    const result = await db.transaction(async (tx) => {
      await lockCensus(tx);
      const existing = await tx
        .select()
        .from(servicios)
        .where(eq(servicios.nombre, nombre));
      if (existing.some((s) => s.id !== id))
        throw new HttpError("Ya existe un servicio con ese nombre", 409);
      if (!id) {
        const res = await tx.insert(servicios).values({ nombre });
        await audit(
          tx,
          user.usuario,
          "servicio",
          String(res[0].insertId),
          "crear",
          null,
          { nombre },
        );
        return { id: res[0].insertId, nombre };
      }
      const [old] = await tx
        .select()
        .from(servicios)
        .where(eq(servicios.id, id));
      if (!old) throw new HttpError("Servicio no encontrado", 404);
      await tx.update(servicios).set({ nombre }).where(eq(servicios.id, id));
      const beds = await tx
        .select({ id: camas.id })
        .from(camas)
        .innerJoin(especialidades, eq(camas.especialidadId, especialidades.id))
        .where(eq(especialidades.servicioId, id))
        .orderBy(camas.id);
      for (const bed of beds)
        await recordCapacity(
          tx,
          bed.id,
          user.usuario,
          "Cambio del nombre del servicio",
        );
      await audit(tx, user.usuario, "servicio", String(id), "actualizar", old, {
        nombre,
      });
      return { id, nombre };
    });
    return NextResponse.json(result, { status: edit ? 200 : 201 });
  } catch (e) {
    return fallo(e);
  }
}
export async function POST(request: Request) {
  return save(request, false);
}
export async function PATCH(request: Request) {
  return save(request, true);
}
