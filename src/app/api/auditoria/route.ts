import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireUser } from "@/lib/auth";
import { fallo, HttpError } from "@/lib/validation";
import { periodoReporte } from "@/lib/hospital";
export async function GET(request: Request) {
  try {
    await requireUser(["administrador"]);
    const p = new URL(request.url).searchParams;
    const page = Number(p.get("pagina") ?? 1);
    if (!Number.isInteger(page) || page < 1 || page > 10000)
      throw new HttpError("Página inválida");
    const actor = (p.get("responsable") ?? "").trim();
    const ref = (p.get("referencia") ?? "").trim();
    if (actor.length > 100 || ref.length > 64)
      throw new HttpError("Filtro demasiado largo");
    let period: ReturnType<typeof periodoReporte>;
    try {
      period = periodoReporte(p.get("desde"), p.get("hasta"));
    } catch (e) {
      throw new HttpError((e as Error).message);
    }
    const clauses = [
      sql`1=1`,
      ...(actor ? [sql`responsable=${actor}`] : []),
      ...(ref ? [sql`(referencia=${ref} OR hc=${ref})`] : []),
      ...(period.inicio ? [sql`registradoEn>=${period.inicio}`] : []),
      ...(period.fin ? [sql`registradoEn<${period.fin}`] : []),
    ];
    const where = sql.join(clauses, sql` AND `);
    // Las tablas legacy y nuevas pueden usar intercalaciones diferentes.
    const text = (value: ReturnType<typeof sql>) =>
      sql`CONVERT(${value} USING utf8mb4) COLLATE utf8mb4_unicode_ci`;
    const union = sql`(
      SELECT ${text(sql`CONCAT('m-',m.id)`)} AS id,
        ${text(sql`'hospitalizacion'`)} AS entidad,
        ${text(sql`CAST(m.ingreso_id AS CHAR)`)} AS referencia,
        ${text(sql`i.hc`)} AS hc, ${text(sql`m.tipo`)} AS accion,
        ${text(sql`m.responsable`)} AS responsable, ${text(sql`m.motivo`)} AS motivo,
        ${text(sql`m.detalle`)} AS detalle, m.fecha_registro AS registradoEn, m.fecha AS fechaEvento
      FROM movimientos m JOIN ingresos i ON i.id=m.ingreso_id
      UNION ALL SELECT ${text(sql`CONCAT('a-',a.id)`)}, ${text(sql`a.entidad`)},
        ${text(sql`a.referencia`)}, NULL, ${text(sql`a.accion`)}, ${text(sql`a.responsable`)},
        ${text(sql`a.motivo`)},
        ${text(sql`JSON_OBJECT('antes',IF(a.antes IS NULL,NULL,CAST(a.antes AS JSON)),'despues',IF(a.despues IS NULL,NULL,CAST(a.despues AS JSON)))`)},
        a.registrado_en,NULL
      FROM auditoria_sistema a
    ) eventos`;
    const [rows] = await db.execute(
      sql`SELECT * FROM ${union} WHERE ${where} ORDER BY registradoEn DESC,id DESC LIMIT 51 OFFSET ${(page - 1) * 50}`,
    );
    const list = rows as unknown as Record<string, unknown>[];
    return NextResponse.json(
      { pagina: page, hayMas: list.length > 50, eventos: list.slice(0, 50) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return fallo(e);
  }
}
