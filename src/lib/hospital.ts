export const HOSPITAL = "Hospital Regional Eleazar Guzmán Barrón";
export const TIME_ZONE = "America/Lima";
export const TIPOS_EGRESO = [
  "alta_medica",
  "alta_voluntaria",
  "fallecido",
  "transferencia",
  "retiro",
  "otro",
] as const;
export function fechaHospital(value: string | Date, hora = false) {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: TIME_ZONE,
    dateStyle: "short",
    ...(hora ? { timeStyle: "short" as const } : {}),
  }).format(new Date(value));
}
export function fechaLocalInput(value = new Date()) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(value);
  return parts.replace(" ", "T");
}
// Duración en días completos; no es el indicador de pacientes-día de un censo diario.
export function diasEstancia(
  inicio: string | Date,
  fin: string | Date = new Date(),
) {
  return Math.max(
    0,
    Math.floor(
      (new Date(fin).getTime() - new Date(inicio).getTime()) / 86400000,
    ),
  );
}
export function fechaEvento(value: unknown, nombre: string, minimum?: Date) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)
  )
    throw new Error(`${nombre}: indica fecha y hora válidas`);
  const d = new Date(`${value}-05:00`);
  if (
    !Number.isFinite(d.getTime()) ||
    fechaLocalInput(d) !== value.slice(0, 16)
  )
    throw new Error(`${nombre}: fecha inválida`);
  if (d.getTime() > Date.now() + 60000)
    throw new Error(`${nombre}: no puede estar en el futuro`);
  if (minimum && d < minimum)
    throw new Error(`${nombre}: no puede ser anterior al último movimiento`);
  return d;
}
export function periodoReporte(desde: string | null, hasta: string | null) {
  function parse(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
      throw new Error("Fecha de filtro inválida");
    const date = new Date(`${value}T00:00:00-05:00`);
    if (
      !Number.isFinite(date.getTime()) ||
      fechaLocalInput(date).slice(0, 10) !== value
    )
      throw new Error("Fecha de filtro inválida");
    return date;
  }
  const inicio = desde ? parse(desde) : undefined;
  const fin = hasta ? new Date(parse(hasta).getTime() + 86400000) : undefined;
  if (inicio && fin && inicio >= fin)
    throw new Error("El inicio debe ser anterior o igual al fin del período");
  return { inicio, fin };
}
