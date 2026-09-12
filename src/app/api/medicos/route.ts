import { NextResponse } from "next/server";
import { db } from "@/db";
import { medicos, servicios } from "@/db/schema";
import { and, eq, like, or, sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";

    if (q.length < 2) {
      return NextResponse.json([]);
    }

    const termino = `%${q}%`;

    const resultados = await db
      .select({
        id: medicos.id,
        cmp: medicos.cmp,
        nombres: medicos.nombres,
        apellidoPaterno: medicos.apellidoPaterno,
        apellidoMaterno: medicos.apellidoMaterno,
        especialidad: medicos.especialidad,
        servicioId: medicos.servicioId,
        servicio: servicios.nombre,
      })
      .from(medicos)
      .innerJoin(servicios, eq(medicos.servicioId, servicios.id))
      .where(
        and(
          eq(medicos.activo, true),
          or(
            like(medicos.cmp, termino),
            like(medicos.nombres, termino),
            like(medicos.apellidoPaterno, termino),
            like(medicos.apellidoMaterno, termino),
            like(medicos.especialidad, termino),
            like(servicios.nombre, termino),
            sql`CONCAT(
              ${medicos.nombres},
              ' ',
              ${medicos.apellidoPaterno},
              ' ',
              COALESCE(${medicos.apellidoMaterno}, '')
            ) LIKE ${termino}`,
          ),
        ),
      )
      .limit(20);

    return NextResponse.json(resultados);
  } catch (error) {
    console.error("Error buscando médicos:", error);

    return NextResponse.json(
      { error: "No se pudieron consultar los médicos" },
      { status: 500 },
    );
  }
}