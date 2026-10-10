export type Instant = string | Date;
export type Admission = {
  id: number;
  hc: string;
  fechaIngreso: Instant;
  servicioIngresoId: number | null;
  servicioIngreso: string | null;
};
export type Discharge = {
  ingresoId: number;
  fechaEgreso: Instant;
  servicioEgresoId: number | null;
  servicioEgreso: string | null;
  tipoEgreso: string;
};
export type Location = {
  id: number;
  ingresoId: number;
  camaId: number;
  servicioId: number;
  servicio: string;
  especialidad: string;
  cama: string;
  desde: Instant;
  hasta: Instant | null;
};
export type Capacity = {
  camaId: number;
  servicioId: number;
  servicio: string;
  especialidad: string;
  cama: string;
  habilitada: boolean;
  desde: Instant;
  hasta: Instant | null;
};
export type CensusData = {
  ingresos: Admission[];
  egresos: Discharge[];
  ubicaciones: Location[];
  capacidad: Capacity[];
  pacientes: {
    hc: string;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string | null;
  }[];
  servicios: { id: number; nombre: string }[];
  inicioCapacidad: Instant;
};
const DAY = 86400000;
export function localDay(value: Instant) {
  return new Date(new Date(value).getTime() - 5 * 3600000)
    .toISOString()
    .slice(0, 10);
}
export function dayWindow(fecha: string, corte = "00:00") {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(corte)
  )
    throw new Error("Fecha u hora de corte inválida");
  const inicio = new Date(`${fecha}T${corte}:00-05:00`);
  if (!Number.isFinite(+inicio) || localDay(inicio) !== fecha)
    throw new Error("Fecha inválida");
  return { inicio, fin: new Date(+inicio + DAY) };
}
export function statisticalStay(inicio: Instant, fin: Instant) {
  return Math.max(
    1,
    Math.round((+new Date(localDay(fin)) - +new Date(localDay(inicio))) / DAY),
  );
}
const time = (v: Instant) => +new Date(v);
function present(loc: Location | Capacity, point: number, before = false) {
  return (
    (before ? time(loc.desde) < point : time(loc.desde) <= point) &&
    (loc.hasta === null ||
      (before ? time(loc.hasta) >= point : time(loc.hasta) > point))
  );
}
export function historicalCensus(
  data: CensusData,
  instant: Instant,
  before = false,
) {
  const point = time(instant);
  const errors: string[] = [];
  const used = new Set<number>();
  const beds = new Set<number>();
  const histories = new Set<string>();
  const out = data.ubicaciones
    .filter((l) => present(l, point, before))
    .map((l) => {
      if (used.has(l.ingresoId))
        errors.push(
          `Hospitalización ${l.ingresoId}: varias ubicaciones al corte`,
        );
      if (beds.has(l.camaId))
        errors.push(`Cama ${l.cama}: varias hospitalizaciones al corte`);
      used.add(l.ingresoId);
      beds.add(l.camaId);
      const ingreso = data.ingresos.find((i) => i.id === l.ingresoId);
      const patient = data.pacientes.find((p) => p.hc === ingreso?.hc);
      if (ingreso && histories.has(ingreso.hc))
        errors.push(
          `Historia ${ingreso.hc}: varias hospitalizaciones al corte`,
        );
      if (ingreso) histories.add(ingreso.hc);
      return {
        ingresoId: l.ingresoId,
        hc: ingreso?.hc ?? "",
        paciente: patient
          ? [patient.apellidoPaterno, patient.apellidoMaterno, patient.nombres]
              .filter(Boolean)
              .join(" ")
          : "Paciente sin referencia",
        servicioId: l.servicioId,
        servicio: l.servicio,
        especialidad: l.especialidad,
        cama: l.cama,
        camaId: l.camaId,
        fechaIngreso: ingreso
          ? new Date(ingreso.fechaIngreso).toISOString()
          : null,
      };
    })
    .sort(
      (a, b) =>
        a.servicio.localeCompare(b.servicio) ||
        a.cama.localeCompare(b.cama, "es", { numeric: true }) ||
        a.ingresoId - b.ingresoId,
    );
  for (const i of data.ingresos) {
    const end = data.egresos.find((e) => e.ingresoId === i.id);
    if (
      (before ? time(i.fechaIngreso) < point : time(i.fechaIngreso) <= point) &&
      (!end ||
        (before
          ? time(end.fechaEgreso) >= point
          : time(end.fechaEgreso) > point)) &&
      !used.has(i.id)
    )
      errors.push(`Hospitalización ${i.id}: falta ubicación al corte`);
  }
  return { pacientes: out, inconsistencias: [...new Set(errors)] };
}
export function dailyReport(
  data: CensusData,
  fecha: string,
  corte = "00:00",
  now = new Date(),
) {
  const { inicio, fin } = dayWindow(fecha, corte);
  const a = +inicio,
    b = Math.min(+fin, +now);
  if (a > +now) throw new Error("El período todavía no comienza");
  const completo = +fin <= +now;
  const initial = historicalCensus(data, inicio, true);
  const final = historicalCensus(data, new Date(b), completo);
  const rows = new Map<
    number,
    {
      servicioId: number;
      servicio: string;
      inicial: number;
      ingresos: number;
      recibidos: number;
      enviados: number;
      egresos: number;
      fallecidos: number;
      final: number;
      esperado: number;
      diferencia: number;
      pacientesDia: number;
      camasDisponibles: number | null;
    }
  >();
  const row = (id: number, name: string) => {
    let r = rows.get(id);
    if (!r) {
      r = {
        servicioId: id,
        servicio: name,
        inicial: 0,
        ingresos: 0,
        recibidos: 0,
        enviados: 0,
        egresos: 0,
        fallecidos: 0,
        final: 0,
        esperado: 0,
        diferencia: 0,
        pacientesDia: 0,
        camasDisponibles: null,
      };
      rows.set(id, r);
    }
    return r;
  };
  for (const s of data.servicios) row(s.id, s.nombre);
  for (const p of initial.pacientes) row(p.servicioId, p.servicio).inicial++;
  for (const p of final.pacientes) {
    const r = row(p.servicioId, p.servicio);
    r.final++;
    r.pacientesDia++;
  }
  const inPeriod = (t: Instant) =>
    time(t) >= a && (completo ? time(t) < b : time(t) <= b);
  for (const i of data.ingresos.filter((i) => inPeriod(i.fechaIngreso))) {
    const loc = data.ubicaciones
      .filter((l) => l.ingresoId === i.id)
      .sort((x, y) => time(x.desde) - time(y.desde) || x.id - y.id)[0];
    row(
      i.servicioIngresoId ?? loc?.servicioId ?? 0,
      i.servicioIngreso ?? loc?.servicio ?? "Sin servicio",
    ).ingresos++;
  }
  for (const e of data.egresos.filter((e) => inPeriod(e.fechaEgreso))) {
    const loc = data.ubicaciones
      .filter((l) => l.ingresoId === e.ingresoId)
      .sort((x, y) => time(y.desde) - time(x.desde) || y.id - x.id)[0];
    const r = row(
      e.servicioEgresoId ?? loc?.servicioId ?? 0,
      e.servicioEgreso ?? loc?.servicio ?? "Sin servicio",
    );
    r.egresos++;
    if (e.tipoEgreso === "fallecido") r.fallecidos++;
    const i = data.ingresos.find((i) => i.id === e.ingresoId);
    if (i && inPeriod(i.fechaIngreso)) r.pacientesDia++;
  }
  for (const i of data.ingresos) {
    const locs = data.ubicaciones
      .filter((l) => l.ingresoId === i.id)
      .sort((x, y) => time(x.desde) - time(y.desde) || x.id - y.id);
    for (let n = 1; n < locs.length; n++) {
      const prev = locs[n - 1],
        next = locs[n];
      if (inPeriod(next.desde) && prev.servicioId !== next.servicioId) {
        row(prev.servicioId, prev.servicio).enviados++;
        row(next.servicioId, next.servicio).recibidos++;
      }
    }
  }
  const capacidadConocida = time(data.inicioCapacidad) <= a;
  if (capacidadConocida) {
    for (const r of rows.values()) r.camasDisponibles = 0;
    for (const c of data.capacidad.filter(
      (c) => c.habilitada && present(c, b, completo),
    )) {
      const r = row(c.servicioId, c.servicio);
      r.camasDisponibles = (r.camasDisponibles ?? 0) + 1;
    }
  }
  for (const r of rows.values()) {
    r.esperado = r.inicial + r.ingresos + r.recibidos - r.enviados - r.egresos;
    r.diferencia = r.final - r.esperado;
  }
  const servicios = [...rows.values()].sort((x, y) =>
    x.servicio.localeCompare(y.servicio),
  );
  const total = {
    inicial: 0,
    ingresos: 0,
    recibidos: 0,
    enviados: 0,
    egresos: 0,
    fallecidos: 0,
    final: 0,
    esperado: 0,
    diferencia: 0,
    pacientesDia: 0,
    camasDisponibles: capacidadConocida ? 0 : (null as number | null),
  };
  for (const r of servicios) {
    for (const k of [
      "inicial",
      "ingresos",
      "recibidos",
      "enviados",
      "egresos",
      "fallecidos",
      "final",
      "esperado",
      "diferencia",
      "pacientesDia",
    ] as const)
      total[k] += r[k];
    if (total.camasDisponibles !== null)
      total.camasDisponibles += r.camasDisponibles ?? 0;
  }
  const inconsistencias = [
    ...new Set([
      ...initial.inconsistencias,
      ...final.inconsistencias,
      ...servicios
        .filter((r) => r.diferencia)
        .map((r) => `${r.servicio}: diferencia ${r.diferencia}`),
    ]),
  ];
  return {
    fecha,
    horaCorte: corte,
    inicio: inicio.toISOString(),
    fin: fin.toISOString(),
    hastaCalculado: new Date(b).toISOString(),
    completo,
    capacidadConocida,
    servicios,
    total,
    pacientes: final.pacientes,
    inconsistencias,
    metodo:
      "Pacientes-día: existencia al cierre más ingresos y egresos dentro del mismo período. Días-cama: camas habilitadas al cierre; requiere cobertura desde el inicio del día.",
  };
}
export type DailyReport = ReturnType<typeof dailyReport>;
export function monthlyIndicators(
  data: CensusData,
  mes: string,
  corte = "00:00",
  now = new Date(),
) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) throw new Error("Mes inválido");
  const start = dayWindow(mes + "-01", corte).inicio;
  if (+start > +now) throw new Error("El mes todavía no comienza");
  const days: DailyReport[] = [];
  for (let n = 0; n < 31; n++) {
    const day = new Date(+start + n * DAY);
    const fecha = localDay(day);
    if (!fecha.startsWith(mes) || +day + DAY > +now) break;
    days.push(dailyReport(data, fecha, corte, now));
  }
  const ids = [
    ...new Set(days.flatMap((d) => d.servicios.map((s) => s.servicioId))),
  ];
  const calculate = (id: number | null) => {
    const rows = days
      .map((d) =>
        id === null ? d.total : d.servicios.find((s) => s.servicioId === id),
      )
      .filter((r): r is NonNullable<typeof r> => Boolean(r));
    const end = +start + days.length * DAY;
    const exits = data.egresos.filter(
      (e) =>
        time(e.fechaEgreso) >= +start &&
        time(e.fechaEgreso) < end &&
        (id === null ||
          e.servicioEgresoId === id ||
          (!e.servicioEgresoId &&
            data.ubicaciones.some(
              (l) =>
                l.ingresoId === e.ingresoId &&
                l.servicioId === id &&
                l.hasta &&
                time(l.hasta) === time(e.fechaEgreso),
            ))),
    );
    const pacientesDia = rows.reduce((n, r) => n + r.pacientesDia, 0);
    const diasConCapacidad = rows.filter(
      (r) => r.camasDisponibles !== null,
    ).length;
    const diasCama =
      rows.length && diasConCapacidad === rows.length
        ? rows.reduce((n, r) => n + (r.camasDisponibles ?? 0), 0)
        : null;
    const estancias = exits.reduce((n, e) => {
      const i = data.ingresos.find((i) => i.id === e.ingresoId);
      return n + (i ? statisticalStay(i.fechaIngreso, e.fechaEgreso) : 0);
    }, 0);
    const promedioCamas =
      diasCama !== null && days.length ? diasCama / days.length : null;
    return {
      servicioId: id,
      servicio:
        id === null
          ? "Total hospital"
          : (data.servicios.find((s) => s.id === id)?.nombre ??
            days.flatMap((d) => d.servicios).find((s) => s.servicioId === id)
              ?.servicio ??
            "Sin servicio"),
      dias: days.length,
      diasConCapacidad,
      pacientesDia,
      diasCama,
      egresos: exits.length,
      promedioPermanencia: exits.length ? estancias / exits.length : null,
      promedioCamas,
      ocupacion: diasCama ? (pacientesDia / diasCama) * 100 : null,
      rendimientoCama: promedioCamas ? exits.length / promedioCamas : null,
      intervaloSustitucion:
        diasCama !== null && exits.length
          ? (diasCama - pacientesDia) / exits.length
          : null,
    };
  };
  return {
    mes,
    horaCorte: corte,
    desde: start.toISOString(),
    hasta: new Date(+start + days.length * DAY).toISOString(),
    diasCerrados: days.length,
    total: calculate(null),
    servicios: ids.map((id) => calculate(id)),
    diario: days.map((d) => ({
      fecha: d.fecha,
      ...d.total,
      consistente: d.inconsistencias.length === 0,
    })),
    inconsistencias: days.flatMap((d) =>
      d.inconsistencias.map((i) => `${d.fecha}: ${i}`),
    ),
    metodo:
      "Solo días completos. Permanencia estadística: diferencia de fechas locales, mínimo un día por egreso. Ocupación = pacientes-día / días-cama × 100. Rendimiento = egresos / promedio de camas. Sustitución = (días-cama − pacientes-día) / egresos. Capacidad incompleta: indicadores dependientes no disponibles.",
  };
}
