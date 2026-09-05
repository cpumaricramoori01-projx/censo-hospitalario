import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { camas } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const especialidadId = request.nextUrl.searchParams.get(
      "especialidadId"
    );

    const mostrarTodas =
      request.nextUrl.searchParams.get("all") === "true";

    if (!especialidadId) {
      return NextResponse.json(
        { error: "Falta el parametro especialidadId" },
        { status: 400 }
      );
    }

    const condicion = mostrarTodas
      ? eq(
          camas.especialidadId,
          Number(especialidadId)
        )
      : and(
          eq(
            camas.especialidadId,
            Number(especialidadId)
          ),
          eq(camas.estado, "libre")
        );

    const data = await db
      .select()
      .from(camas)
      .where(condicion);

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

    const numero = String(body.numero ?? "").trim();
    const ubicacion = String(
      body.ubicacion ?? ""
    ).trim() || null;

    const especialidadId = Number(
      body.especialidadId
    );

    const estado = String(
      body.estado ?? "libre"
    ).trim();

    const estadosValidos = [
      "libre",
      "ocupada",
      "inoperativa",
    ];

    if (!numero || !especialidadId) {
      return NextResponse.json(
        {
          error:
            "Número y especialidad son obligatorios",
        },
        { status: 400 }
      );
    }

    if (!estadosValidos.includes(estado)) {
      return NextResponse.json(
        { error: "Estado de cama no válido" },
        { status: 400 }
      );
    }

    const existente = await db
      .select()
      .from(camas)
      .where(
        and(
          eq(camas.numero, numero),
          eq(
            camas.especialidadId,
            especialidadId
          )
        )
      );

    if (existente.length > 0) {
      return NextResponse.json(
        {
          error:
            "Ya existe una cama con ese número en esta especialidad",
        },
        { status: 409 }
      );
    }

    const result = await db
      .insert(camas)
      .values({
        numero,
        ubicacion,
        especialidadId,
        estado,
      });

    return NextResponse.json(
      {
        id: result[0].insertId,
        numero,
        ubicacion,
        especialidadId,
        estado,
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
    const numero = String(body.numero ?? "").trim();
    const ubicacion =
      String(body.ubicacion ?? "").trim() || null;
    const especialidadId = Number(
      body.especialidadId
    );
    const estado = String(
      body.estado ?? ""
    ).trim();

    const estadosValidos = [
      "libre",
      "ocupada",
      "inoperativa",
    ];

    if (!id || !numero || !especialidadId) {
      return NextResponse.json(
        {
          error:
            "ID, número y especialidad son obligatorios",
        },
        { status: 400 }
      );
    }

    if (!estadosValidos.includes(estado)) {
      return NextResponse.json(
        { error: "Estado de cama no válido" },
        { status: 400 }
      );
    }

    const existente = await db
      .select()
      .from(camas)
      .where(eq(camas.id, id));

    if (existente.length === 0) {
      return NextResponse.json(
        { error: "Cama no encontrada" },
        { status: 404 }
      );
    }

    await db
      .update(camas)
      .set({
        numero,
        ubicacion,
        especialidadId,
        estado,
      })
      .where(eq(camas.id, id));

    return NextResponse.json({
      id,
      numero,
      ubicacion,
      especialidadId,
      estado,
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