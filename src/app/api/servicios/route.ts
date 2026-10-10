import { jsonObject } from "@/lib/validation";
import { requireUser, requireWrite } from "@/lib/auth";
import { fallo, texto, identificador } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { servicios } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    await requireUser();
    const data = await db.select().from(servicios);

    return NextResponse.json(data);
  } catch (err) {
    return fallo(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireWrite(true);
    const body = await jsonObject(request);
    const nombre = texto(body.nombre, "Servicio", 60);

    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre del servicio es obligatorio" },
        { status: 400 },
      );
    }

    const existente = await db
      .select()
      .from(servicios)
      .where(eq(servicios.nombre, nombre));

    if (existente.length > 0) {
      return NextResponse.json(
        { error: "Ya existe un servicio con ese nombre" },
        { status: 409 },
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
      { status: 201 },
    );
  } catch (err) {
    return fallo(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireWrite(true);
    const body = await jsonObject(request);

    const id = identificador(body.id);
    const nombre = texto(body.nombre, "Servicio", 60);

    if (!id || !nombre) {
      return NextResponse.json(
        { error: "ID y nombre son obligatorios" },
        { status: 400 },
      );
    }

    const existente = await db
      .select()
      .from(servicios)
      .where(eq(servicios.id, id));

    if (existente.length === 0) {
      return NextResponse.json(
        { error: "Servicio no encontrado" },
        { status: 404 },
      );
    }

    await db.update(servicios).set({ nombre }).where(eq(servicios.id, id));

    return NextResponse.json({
      id,
      nombre,
    });
  } catch (err) {
    return fallo(err);
  }
}
