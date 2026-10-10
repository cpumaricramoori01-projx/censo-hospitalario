import { requireUser } from "@/lib/auth";
import { fallo } from "@/lib/validation";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { diagnosticos } from "@/db/schema";
import { and, eq, like, or } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";

    if (q.length < 2) {
      return NextResponse.json([]);
    }

    const termino = `%${q}%`;

    const resultados = await db
      .select({
        id: diagnosticos.id,
        codigo: diagnosticos.codigo,
        descripcion: diagnosticos.descripcion,
      })
      .from(diagnosticos)
      .where(
        and(
          eq(diagnosticos.activo, true),
          or(
            like(diagnosticos.codigo, termino),
            like(diagnosticos.descripcion, termino),
          ),
        ),
      )
      .limit(20);

    return NextResponse.json(resultados);
  } catch (error) {
    return fallo(error);
  }
}
