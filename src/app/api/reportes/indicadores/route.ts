import { NextResponse } from "next/server";
import { db } from "@/db";
import { requireUser } from "@/lib/auth";
import { fallo, HttpError } from "@/lib/validation";
import { dayWindow, monthlyIndicators } from "@/lib/census";
import { configuration, loadCensus } from "@/lib/census-store";
export async function GET(request: Request) {
  try {
    await requireUser();
    const mes = new URL(request.url).searchParams.get("mes") ?? "";
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes))
      throw new HttpError("Mes inválido");
    const result = await db.transaction(async (tx) => {
      const config = await configuration(tx);
      let inicio: Date;
      try {
        inicio = dayWindow(mes + "-01", config.horaCorte).inicio;
      } catch (e) {
        throw new HttpError((e as Error).message);
      }
      if (+inicio > Date.now())
        throw new HttpError("El mes todavía no comienza");
      const next = new Date(+inicio);
      next.setUTCMonth(next.getUTCMonth() + 1);
      const data = await loadCensus(tx, inicio, next);
      return monthlyIndicators(data, mes, config.horaCorte);
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return fallo(e);
  }
}
