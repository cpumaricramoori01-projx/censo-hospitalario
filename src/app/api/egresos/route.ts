// src/app/api/egresos/route.ts
// Crea un egreso para un ingreso activo y libera la cama
// dentro de una misma transaccion.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { egresos, ingresos, camas } from "@/db/schema";
import { eq } from "drizzle-orm";

class EgresoError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "EgresoError";
    this.status = status;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      ingresoId,
      tipoEgreso,
      codigoEgresoOriginal,
      servicioDestinoId,
      medicoAlta,
      diagnosticoFinal,
    }: {
      ingresoId: number;
      tipoEgreso: string;
      codigoEgresoOriginal?: string;
      servicioDestinoId?: number;
      medicoAlta?: string;
      diagnosticoFinal?: string;
    } = body;

    if (!ingresoId || !tipoEgreso) {
      return NextResponse.json(
        {
          error:
            "Faltan campos obligatorios: ingresoId y tipoEgreso",
        },
        { status: 400 }
      );
    }

    if (tipoEgreso === "transferencia" && !servicioDestinoId) {
      return NextResponse.json(
        {
          error:
            "Un egreso por transferencia debe indicar el servicio de destino",
        },
        { status: 400 }
      );
    }

    const egresoId = await db.transaction(async (tx) => {
      // 1. Verificar que el ingreso exista.
      const ingresoExistente = await tx
        .select()
        .from(ingresos)
        .where(eq(ingresos.id, ingresoId))
        .limit(1);

      if (ingresoExistente.length === 0) {
        throw new EgresoError(
          "Ingreso no encontrado",
          404
        );
      }

      // 2. Verificar que el ingreso no tenga ya un egreso.
      const egresoExistente = await tx
        .select()
        .from(egresos)
        .where(eq(egresos.ingresoId, ingresoId))
        .limit(1);

      if (egresoExistente.length > 0) {
        throw new EgresoError(
          "Este ingreso ya tiene un egreso registrado",
          409
        );
      }

      const camaId = ingresoExistente[0].camaId;

      // 3. Verificar que la cama exista.
      const camaExistente = await tx
        .select()
        .from(camas)
        .where(eq(camas.id, camaId))
        .limit(1);

      if (camaExistente.length === 0) {
        throw new EgresoError(
          "La cama asociada al ingreso no existe",
          409
        );
      }

      // 4. Crear el egreso.
      const resultEgreso = await tx.insert(egresos).values({
        ingresoId,
        fechaEgreso: new Date(),
        tipoEgreso,
        codigoEgresoOriginal,
        servicioDestinoId:
          tipoEgreso === "transferencia"
            ? servicioDestinoId
            : null,
        medicoAlta,
        diagnosticoFinal,
      });

      // 5. Liberar la cama dentro de la misma transaccion.
      await tx
        .update(camas)
        .set({ estado: "libre" })
        .where(eq(camas.id, camaId));

      // Si cualquiera de las operaciones anteriores falla,
      // toda la transaccion se revierte automaticamente.

      return resultEgreso[0].insertId;
    });

    return NextResponse.json(
      { id: egresoId },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);

    if (err instanceof EgresoError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status }
      );
    }

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
