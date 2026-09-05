// =====================================================================
// src/db/schema.ts (v2)
// Esquema actualizado tras revisar las fichas fisicas reales y los
// reportes del sistema hospitalario (HIS) de abril 2026.
//
// Cambios principales respecto a la v1:
// - pacientesRef: se agrega dni, se separan apellidos en paterno/materno
// - camas: se agrega "ubicacion" (un mismo servicio puede tener camas en
//   mas de un piso, ej. Gineco-Obstetricia)
// - ingresos: se agregan tipoIngreso, servicioOrigenId, financiamiento,
//   usaVentilador, usaOxigeno, tieneProblemaJudicial, tieneProblemaSocial,
//   notasEstancia
// - diagnosticosIngreso: tabla NUEVA (antes "diagnostico" era 1 campo de
//   texto en ingresos; el HIS real maneja varios diagnosticos con codigo
//   CIE-10 por evento)
// - egresos: se agregan servicioDestinoId, medicoAlta, y
//   codigoEgresoOriginal (para guardar el codigo crudo del HIS: AH, AL,
//   FA, AV, RE, 00 -- el significado exacto de cada uno queda pendiente
//   de confirmar, pero no perdemos el dato mientras tanto)
// =====================================================================

import {
  mysqlTable,
  varchar,
  char,
  date,
  datetime,
  int,
  boolean,
  text,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------
// Pacientes (manual por ahora, luego sincronizado del HIS)
// ---------------------------------------------------------------------
export const pacientesRef = mysqlTable("pacientes_ref", {
  hc: varchar("hc", { length: 20 }).primaryKey(),
  dni: varchar("dni", { length: 15 }),
  nombres: varchar("nombres", { length: 100 }).notNull(),
  apellidoPaterno: varchar("apellido_paterno", { length: 100 }).notNull(),
  apellidoMaterno: varchar("apellido_materno", { length: 100 }),
  sexo: char("sexo", { length: 1 }),
  fechaNacimiento: date("fecha_nacimiento"),
  correo: varchar("correo", { length: 120 }),
  telefono: varchar("telefono", { length: 20 }),
  direccion: varchar("direccion", { length: 200 }),
  origenDato: varchar("origen_dato", { length: 20 }).notNull().default("manual"),
  fechaActualizacion: datetime("fecha_actualizacion").notNull(),
});

export const servicios = mysqlTable("servicios", {
  id: int("id").primaryKey().autoincrement(),
  nombre: varchar("nombre", { length: 60 }).notNull(),
});

export const especialidades = mysqlTable("especialidades", {
  id: int("id").primaryKey().autoincrement(),
  nombre: varchar("nombre", { length: 80 }).notNull(),
  servicioId: int("servicio_id").notNull(),
});

// estado: 'libre' | 'ocupada' | 'inoperativa'
// ubicacion: piso/ambiente fisico real (ej. "3er piso", "Salud Mental",
// "2do piso - ala norte") -- permite que un mismo servicio tenga camas
// repartidas en mas de un lugar (caso Gineco-Obstetricia)
export const camas = mysqlTable("camas", {
  id: int("id").primaryKey().autoincrement(),
  numero: varchar("numero", { length: 10 }).notNull(),
  estado: varchar("estado", { length: 20 }).notNull().default("libre"),
  ubicacion: varchar("ubicacion", { length: 80 }),
  especialidadId: int("especialidad_id").notNull(),
});

// tipoIngreso: 'normal' | 'transferencia'
// financiamiento: SIS Gratuito, SIS Para Todos, Particular, Fondo Salud, etc.
export const ingresos = mysqlTable("ingresos", {
  id: int("id").primaryKey().autoincrement(),
  hc: varchar("hc", { length: 20 }).notNull(),
  camaId: int("cama_id").notNull(),
  fechaIngreso: datetime("fecha_ingreso").notNull(),
  medico: varchar("medico", { length: 100 }),
  tipoIngreso: varchar("tipo_ingreso", { length: 20 }).notNull().default("normal"),
  servicioOrigenId: int("servicio_origen_id"), // solo si tipoIngreso = transferencia
  financiamiento: varchar("financiamiento", { length: 40 }),
  usaVentilador: boolean("usa_ventilador").notNull().default(false),
  usaOxigeno: boolean("usa_oxigeno").notNull().default(false),
  tieneProblemaJudicial: boolean("tiene_problema_judicial").notNull().default(false),
  tieneProblemaSocial: boolean("tiene_problema_social").notNull().default(false),
  notasEstancia: text("notas_estancia"),
});

// Un ingreso puede tener varios diagnosticos (principal, secundarios)
export const diagnosticosIngreso = mysqlTable("diagnosticos_ingreso", {
  id: int("id").primaryKey().autoincrement(),
  ingresoId: int("ingreso_id").notNull(),
  orden: int("orden").notNull().default(1),
  cie10Codigo: varchar("cie10_codigo", { length: 15 }),
  cie10Descripcion: varchar("cie10_descripcion", { length: 250 }).notNull(),
});

export const movimientos = mysqlTable("movimientos", {
  id: int("id").primaryKey().autoincrement(),
  ingresoId: int("ingreso_id").notNull(),
  camaOrigenId: int("cama_origen_id"),
  camaDestinoId: int("cama_destino_id"),
  fecha: datetime("fecha").notNull(),
});

// tipoEgreso: catalogo propio simplificado -- 'alta_medica' | 'alta_voluntaria'
// | 'fallecido' | 'transferencia' | 'retiro' | 'otro'
// codigoEgresoOriginal: el codigo crudo tal como viene del HIS (AH, AL,
// FA, AV, RE, 00) -- se guarda sin traducir hasta confirmar el mapeo exacto
export const egresos = mysqlTable("egresos", {
  id: int("id").primaryKey().autoincrement(),
  ingresoId: int("ingreso_id").notNull().unique(),
  fechaEgreso: datetime("fecha_egreso").notNull(),
  tipoEgreso: varchar("tipo_egreso", { length: 30 }).notNull(),
  codigoEgresoOriginal: varchar("codigo_egreso_original", { length: 10 }),
  servicioDestinoId: int("servicio_destino_id"), // solo si tipoEgreso = transferencia
  medicoAlta: varchar("medico_alta", { length: 100 }),
  diagnosticoFinal: varchar("diagnostico_final", { length: 250 }),
});

// ---------------------------------------------------------------------
// Relaciones
// ---------------------------------------------------------------------
export const serviciosRelations = relations(servicios, ({ many }) => ({
  especialidades: many(especialidades),
}));

export const especialidadesRelations = relations(especialidades, ({ one, many }) => ({
  servicio: one(servicios, {
    fields: [especialidades.servicioId],
    references: [servicios.id],
  }),
  camas: many(camas),
}));

export const camasRelations = relations(camas, ({ one, many }) => ({
  especialidad: one(especialidades, {
    fields: [camas.especialidadId],
    references: [especialidades.id],
  }),
  ingresos: many(ingresos),
}));

export const ingresosRelations = relations(ingresos, ({ one, many }) => ({
  paciente: one(pacientesRef, {
    fields: [ingresos.hc],
    references: [pacientesRef.hc],
  }),
  cama: one(camas, {
    fields: [ingresos.camaId],
    references: [camas.id],
  }),
  servicioOrigen: one(servicios, {
    fields: [ingresos.servicioOrigenId],
    references: [servicios.id],
  }),
  diagnosticos: many(diagnosticosIngreso),
  movimientos: many(movimientos),
  egreso: one(egresos),
}));

export const diagnosticosIngresoRelations = relations(diagnosticosIngreso, ({ one }) => ({
  ingreso: one(ingresos, {
    fields: [diagnosticosIngreso.ingresoId],
    references: [ingresos.id],
  }),
}));

export const movimientosRelations = relations(movimientos, ({ one }) => ({
  ingreso: one(ingresos, {
    fields: [movimientos.ingresoId],
    references: [ingresos.id],
  }),
}));

export const egresosRelations = relations(egresos, ({ one }) => ({
  ingreso: one(ingresos, {
    fields: [egresos.ingresoId],
    references: [ingresos.id],
  }),
  servicioDestino: one(servicios, {
    fields: [egresos.servicioDestinoId],
    references: [servicios.id],
  }),
}));