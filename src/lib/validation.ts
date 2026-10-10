import { NextResponse } from "next/server";
export class HttpError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function texto(
  value: unknown,
  name: string,
  max: number,
  required = true,
) {
  if (value == null && !required) return "";
  if (
    typeof value !== "string" ||
    value.trim().length > max ||
    (required && !value.trim())
  )
    throw new HttpError(`${name}: valor inválido (máximo ${max} caracteres)`);
  return value.trim();
}
export function identificador(value: unknown, name = "ID") {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1)
    throw new HttpError(`${name}: identificador inválido`);
  return n;
}
export function bandera(value: unknown) {
  if (typeof value !== "boolean")
    throw new HttpError("Los indicadores deben ser booleanos");
  return value;
}
export function fallo(error: unknown) {
  if (error instanceof HttpError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof SyntaxError)
    return NextResponse.json(
      { error: "Solicitud JSON inválida" },
      { status: 400 },
    );
  const cause = error as { code?: string; cause?: { code?: string } };
  if ([cause?.code, cause?.cause?.code].includes("ER_DUP_ENTRY"))
    return NextResponse.json(
      {
        error:
          "La operación entra en conflicto con un registro existente. Actualiza los datos.",
      },
      { status: 409 },
    );
  if (
    [cause?.code, cause?.cause?.code].some(
      (c) => c === "ER_LOCK_DEADLOCK" || c === "ER_LOCK_WAIT_TIMEOUT",
    )
  )
    return NextResponse.json(
      {
        error:
          "Otra operación está modificando estos datos. Actualiza y vuelve a intentarlo.",
      },
      { status: 409 },
    );
  // No registrar SQL con parámetros ni devolver detalles de conexión o de pacientes.
  console.error("Operación fallida", {
    tipo: error instanceof Error ? error.name : "desconocido",
    codigo: cause?.cause?.code ?? cause?.code,
  });
  return NextResponse.json(
    { error: "No se pudo completar la operación. Inténtalo de nuevo." },
    { status: 500 },
  );
}

export async function jsonObject(
  request: Request,
): Promise<Record<string, unknown>> {
  const value: unknown = await request.json();
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new HttpError("La solicitud debe contener un objeto JSON");
  return value as Record<string, unknown>;
}
