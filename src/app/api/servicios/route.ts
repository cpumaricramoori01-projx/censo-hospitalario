import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { servicios } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const data = await db.select().from(servicios);

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

    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre del servicio es obligatorio" },
        { status: 400 }
      );
    }

    const existente = await db
      .select()
      .from(servicios)
      .where(eq(servicios.nombre, nombre));

    if (existente.length > 0) {
      return NextResponse.json(
        { error: "Ya existe un servicio con ese nombre" },
        { status: 409 }
      );
    }

    const result = await db.insert(servicios).values({
      nombre,
    });

    return NextResponse.json(
      {
        id: result[0].insertId,
        nombre,
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

    if (!id || !nombre) {
      return NextResponse.json(
        { error: "ID y nombre son obligatorios" },
        { status: 400 }
      );
    }

    const existente = await db
      .select()
      .from(servicios)
      .where(eq(servicios.id, id));

    if (existente.length === 0) {
      return NextResponse.json(
        { error: "Servicio no encontrado" },
        { status: 404 }
      );
    }

    await db
      .update(servicios)
      .set({ nombre })
      .where(eq(servicios.id, id));

    return NextResponse.json({
      id,
      nombre,
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