import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { diasCenso, partesCenso } from "@/db/schema";
import { requireUser, requireWrite } from "@/lib/auth";
import { fallo, HttpError, jsonObject, texto } from "@/lib/validation";
import { dailyReport, dayWindow } from "@/lib/census";
import {
  configuration,
  lockCensus,
  loadCensus,
  audit,
  reportHash,
} from "@/lib/census-store";
function window(fecha: string, corte: string) {
  try {
    return dayWindow(fecha, corte);
  } catch (e) {
    throw new HttpError((e as Error).message);
  }
}
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const p = new URL(request.url).searchParams;
    const fecha = p.get("fecha") ?? "";
    return NextResponse.json(
      await db.transaction(async (tx) => {
        const config = await configuration(tx);
        const { inicio, fin } = window(fecha, config.horaCorte);
        if (+inicio > Date.now())
          throw new HttpError("El período todavía no comienza");
        const live = dailyReport(
          await loadCensus(tx, inicio, fin),
          fecha,
          config.horaCorte,
        );
        const [day] = await tx
          .select()
          .from(diasCenso)
          .where(eq(diasCenso.fecha, fecha));
        const versions = await tx
          .select()
          .from(partesCenso)
          .where(eq(partesCenso.fecha, fecha))
          .orderBy(desc(partesCenso.version));
        const requested = p.get("version");
        if (requested && !/^\d+$/.test(requested))
          throw new HttpError("Versión inválida");
        const selected = requested
          ? versions.find((v) => v.version === Number(requested))
          : day?.estado === "cerrado"
            ? versions[0]
            : undefined;
        if (requested && !selected)
          throw new HttpError("Versión no encontrada", 404);
        return {
          estado: day?.estado ?? "abierto",
          version: day?.version ?? 0,
          reporte: selected ? JSON.parse(selected.contenido) : live,
          esVersionGuardada: Boolean(selected),
          versionMostrada: selected?.version ?? null,
          hayCambios: versions.length
            ? versions[0].huella !== reportHash(live)
            : false,
          versiones: versions.map(({ contenido, huella, ...v }) => ({
            ...v,
            huella,
            bytes: contenido.length,
          })),
          puedeCerrar: user.rol === "administrador",
          actual: live,
        };
      }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return fallo(e);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireWrite(true);
    const b = await jsonObject(request);
    const fecha = texto(b.fecha, "Fecha", 10);
    const accion = texto(b.accion, "Acción", 10);
    if (!["cerrar", "reabrir"].includes(accion))
      throw new HttpError("Acción inválida");
    const result = await db.transaction(async (tx) => {
      const config = await lockCensus(tx);
      const { inicio, fin } = window(fecha, config.horaCorte);
      if (+fin > Date.now())
        throw new HttpError("Solo se cierran o reabren días completos");
      const [day] = await tx
        .select()
        .from(diasCenso)
        .where(eq(diasCenso.fecha, fecha))
        .for("update");
      const expected = Number(b.version);
      if (!Number.isSafeInteger(expected) || expected !== (day?.version ?? 0))
        throw new HttpError(
          "El parte cambió. Actualiza antes de continuar",
          409,
        );
      const motivo = texto(
        b.motivo,
        "Motivo",
        2000,
        accion === "reabrir" || Boolean(day?.version),
      );
      if (accion === "reabrir") {
        if (day?.estado !== "cerrado")
          throw new HttpError("El día no está cerrado", 409);
        await tx
          .update(diasCenso)
          .set({ estado: "abierto" })
          .where(eq(diasCenso.fecha, fecha));
        await audit(
          tx,
          user.usuario,
          "parte",
          fecha,
          "reabrir",
          { estado: "cerrado", version: day.version },
          { estado: "abierto", version: day.version },
          motivo,
        );
        return { ok: true, version: day.version };
      }
      if (day?.estado === "cerrado")
        throw new HttpError("El día ya está cerrado", 409);
      const report = dailyReport(
        await loadCensus(tx, inicio, fin),
        fecha,
        config.horaCorte,
      );
      if (report.inconsistencias.length)
        throw new HttpError(
          "Resuelve las inconsistencias antes de cerrar el parte",
          409,
        );
      const version = (day?.version ?? 0) + 1;
      if (!day)
        await tx
          .insert(diasCenso)
          .values({ fecha, estado: "cerrado", version });
      else
        await tx
          .update(diasCenso)
          .set({ estado: "cerrado", version })
          .where(eq(diasCenso.fecha, fecha));
      await tx
        .insert(partesCenso)
        .values({
          fecha,
          version,
          contenido: JSON.stringify(report),
          huella: reportHash(report),
          motivo: motivo || "Revisión y cierre del parte diario",
          responsable: user.usuario,
          registradoEn: new Date(),
        });
      await audit(
        tx,
        user.usuario,
        "parte",
        fecha,
        "cerrar",
        day ?? null,
        { estado: "cerrado", version, huella: reportHash(report) },
        motivo,
      );
      return { ok: true, version };
    });
    return NextResponse.json(result);
  } catch (e) {
    return fallo(e);
  }
}
