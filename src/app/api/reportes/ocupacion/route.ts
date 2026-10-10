import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fallo, identificador, HttpError } from "@/lib/validation";
import { ocupacionActual } from "@/lib/occupancy";
export async function GET(request: Request) {
  try {
    await requireUser();
    const p = new URL(request.url).searchParams;
    const servicio = p.get("servicioId"),
      especialidad = p.get("especialidadId"),
      estado = p.get("estado");
    const servicioId =
      servicio && servicio !== "todos" ? identificador(servicio) : null;
    const especialidadId =
      especialidad && especialidad !== "todos"
        ? identificador(especialidad)
        : null;
    if (
      estado &&
      !["todos", "libre", "ocupada", "inoperativa"].includes(estado)
    )
      throw new HttpError("Estado inválido");
    const datos = (await ocupacionActual()).filter(
      (r) =>
        (!servicioId || r.servicioId === servicioId) &&
        (!especialidadId || r.especialidadId === especialidadId) &&
        (!estado || estado === "todos" || r.estado === estado),
    );
    return NextResponse.json({
      datos,
      resumen: {
        total: datos.length,
        ocupadas: datos.filter((r) => r.estado === "ocupada").length,
        libres: datos.filter((r) => r.estado === "libre").length,
        inoperativas: datos.filter((r) => r.estado === "inoperativa").length,
      },
    });
  } catch (e) {
    return fallo(e);
  }
}
