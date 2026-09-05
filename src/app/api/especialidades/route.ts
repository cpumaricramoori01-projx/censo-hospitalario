import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { especialidades } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const servicioId = request.nextUrl.searchParams.get(
      "servicioId"
    );

    if (!servicioId) {
      return NextResponse.json(
        { error: "Falta el parametro servicioId" },
        { status: 400 }
      );
    }

    const data = await db
      .select()
      .from(especialidades)
      .where(
        eq(
          especialidades.servicioId,
          Number(servicioId)
        )
      );

    return NextResponse.json(data);
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Error desconocido",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const nombre = String(body.nombre ?? "").trim();
    const servicioId = Number(body.servicioId);

    if (!nombre || !servicioId) {
      return NextResponse.json(
        {
          error:
            "Nombre y servicio son obligatorios",
        },
        { status: 400 }
      );
    }

    const existente = await db
      .select()
      .from(especialidades)
      .where(
        and(
          eq(especialidades.nombre, nombre),
          eq(especialidades.servicioId, servicioId)
        )
      );

    if (existente.length > 0) {
      return NextResponse.json(
        {
          error:
            "Ya existe esa especialidad en el servicio seleccionado",
        },
        { status: 409 }
      );
    }

    const result = await db
      .insert(especialidades)
      .values({
        nombre,
        servicioId,
      });

    return NextResponse.json(
      {
        id: result[0].insertId,
        nombre,
        servicioId,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Error desconocido",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    const id = Number(body.id);
    const nombre = String(body.nombre ?? "").trim();
    const servicioId = Number(body.servicioId);

    if (!id || !nombre || !servicioId) {
      return NextResponse.json(
        {
          error:
            "ID, nombre y servicio son obligatorios",
        },
        { status: 400 }
      );
    }

    const existente = await db
      .select()
      .from(especialidades)
      .where(eq(especialidades.id, id));

    if (existente.length === 0) {
      return NextResponse.json(
        { error: "Especialidad no encontrada" },
        { status: 404 }
      );
    }

    await db
      .update(especialidades)
      .set({
        nombre,
        servicioId,
      })
      .where(eq(especialidades.id, id));

    return NextResponse.json({
      id,
      nombre,
      servicioId,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Error desconocido",
      },
      { status: 500 }
    );
  }
}