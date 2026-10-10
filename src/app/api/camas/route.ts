import { lockCensus, recordCapacity, audit } from "@/lib/census-store";
import { jsonObject } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { camas, especialidades, ocupacionesActivas } from "@/db/schema";
import { requireUser, requireWrite } from "@/lib/auth";
import { fallo, HttpError, identificador, texto } from "@/lib/validation";
export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const especialidadId = identificador(
      request.nextUrl.searchParams.get("especialidadId"),
      "Especialidad",
    );
    const all = request.nextUrl.searchParams.get("all") === "true";
    const rows = await db
      .select({
        id: camas.id,
        numero: camas.numero,
        ubicacion: camas.ubicacion,
        especialidadId: camas.especialidadId,
        estado: sql<string>`CASE WHEN ${ocupacionesActivas.ingresoId} IS NOT NULL THEN 'ocupada' WHEN ${camas.estado} = 'inoperativa' THEN 'inoperativa' ELSE 'libre' END`,
      })
      .from(camas)
      .leftJoin(ocupacionesActivas, eq(ocupacionesActivas.camaId, camas.id))
      .where(
        and(
          eq(camas.especialidadId, especialidadId),
          ...(all
            ? []
            : [
                isNull(ocupacionesActivas.ingresoId),
                ne(camas.estado, "inoperativa"),
              ]),
        ),
      )
      .orderBy(camas.numero);
    return NextResponse.json(rows);
  } catch (e) {
    return fallo(e);
  }
}
async function guardar(request: Request, editar: boolean) {
  try {
    const user = await requireWrite(true);
    const b = await jsonObject(request);
    const numero = texto(b.numero, "Número de cama", 10);
    const ubicacion = texto(b.ubicacion, "Ubicación", 80, false) || null;
    const especialidadId = identificador(b.especialidadId, "Especialidad");
    if (
      typeof b.estado !== "string" ||
      !["libre", "ocupada", "inoperativa"].includes(b.estado)
    )
      throw new HttpError("Estado inválido");
    const result = await db.transaction(async (tx) => {
      await lockCensus(tx);
      const [especialidad] = await tx
        .select()
        .from(especialidades)
        .where(eq(especialidades.id, especialidadId))
        .for("update");
      if (!especialidad) throw new HttpError("Especialidad no encontrada", 404);
      if (!editar) {
        if (b.estado === "ocupada")
          throw new HttpError("Una cama se ocupa al asignarle un paciente");
        const res = await tx.insert(camas).values({
          numero,
          ubicacion,
          especialidadId,
          estado: String(b.estado),
        });
        await recordCapacity(tx, res[0].insertId, user.usuario, texto(b.motivo, "Motivo", 2000, false) || "Creación de cama");
        return {
          id: res[0].insertId,
          numero,
          ubicacion,
          especialidadId,
          estado: String(b.estado),
        };
      }
      const id = identificador(b.id);
      const [actual] = await tx
        .select()
        .from(camas)
        .where(eq(camas.id, id))
        .for("update");
      if (!actual) throw new HttpError("Cama no encontrada", 404);
      const [activa] = await tx
        .select()
        .from(ocupacionesActivas)
        .where(eq(ocupacionesActivas.camaId, id));
      if (
        activa &&
        (b.estado !== "ocupada" ||
          actual.especialidadId !== especialidadId ||
          actual.numero !== numero)
      )
        throw new HttpError(
          "Traslada o egresa al paciente antes de cambiar el estado, número o especialidad de su cama",
          409,
        );
      if (!activa && b.estado === "ocupada")
        throw new HttpError(
          "La cama se ocupa mediante un ingreso o traslado",
          409,
        );
      await tx
        .update(camas)
        .set({ numero, ubicacion, especialidadId, estado: String(b.estado) })
        .where(eq(camas.id, id));
      const motivo = texto(b.motivo, "Motivo", 2000, false) || "Actualización administrativa de cama";
      await recordCapacity(tx, id, user.usuario, motivo);
      await audit(tx, user.usuario, "cama", String(id), "actualizar", actual, { numero, ubicacion, especialidadId, estado: b.estado }, motivo);
      return {
        id,
        numero,
        ubicacion,
        especialidadId,
        estado: String(b.estado),
      };
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
