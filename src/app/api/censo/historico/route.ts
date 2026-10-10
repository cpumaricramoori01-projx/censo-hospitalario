import { NextResponse } from "next/server";
import { db } from "@/db";
import { requireUser } from "@/lib/auth";
import { fallo, HttpError } from "@/lib/validation";
import { dayWindow, historicalCensus, localDay } from "@/lib/census";
import { loadCensus } from "@/lib/census-store";
export async function GET(request: Request) {
  try {
    await requireUser();
    const p = new URL(request.url).searchParams;
    const fecha = p.get("fecha") ?? localDay(new Date());
    const hora =
      p.get("hora") ??
      (fecha === localDay(new Date())
        ? new Date(Date.now() - 5 * 3600000).toISOString().slice(11, 19)
        : "23:59:59");
    if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(hora))
      throw new HttpError("Hora inválida");
    let inicio: Date;
    try {
      inicio = dayWindow(fecha).inicio;
    } catch (e) {
      throw new HttpError((e as Error).message);
    }
    const instant = new Date(
      `${fecha}T${hora.length === 5 ? hora + ":00" : hora}-05:00`,
    );
    if (+instant > Date.now() + 1000)
      throw new HttpError("El censo histórico no admite fechas futuras");
    const result = await db.transaction(async (tx) =>
      historicalCensus(
        await loadCensus(tx, inicio, new Date(+instant + 1)),
        instant,
      ),
    );
    return NextResponse.json(
      {
        fecha,
        hora,
        instante: instant.toISOString(),
        ...result,
        nota: "Ubicación reconstruida desde los períodos registrados. Los datos identificativos corresponden a la referencia actual del paciente; los recorridos legacy pueden ser incompletos.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return fallo(e);
  }
}
