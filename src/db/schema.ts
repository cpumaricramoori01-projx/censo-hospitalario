import {
  mysqlTable,
  varchar,
  char,
  date,
  datetime,
  int,
  boolean,
  text,
  foreignKey,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

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

export const diagnosticos = mysqlTable("diagnosticos", {
  id: int("id").primaryKey().autoincrement(),
  codigo: varchar("codigo", { length: 10 }).notNull().unique(),
  descripcion: varchar("descripcion", { length: 500 }).notNull(),
  activo: boolean("activo").notNull().default(true),
});

export const servicios = mysqlTable("servicios", {
  id: int("id").primaryKey().autoincrement(),
  nombre: varchar("nombre", { length: 60 }).notNull(),
});

export const medicos = mysqlTable("medicos", {
  id: int("id").primaryKey().autoincrement(),
  cmp: varchar("cmp", { length: 20 }).notNull().unique(),
  nombres: varchar("nombres", { length: 100 }).notNull(),
  apellidoPaterno: varchar("apellido_paterno", { length: 100 }).notNull(),
  apellidoMaterno: varchar("apellido_materno", { length: 100 }),
  especialidad: varchar("especialidad", { length: 150 }).notNull(),
  servicioId: int("servicio_id").notNull(),
  activo: boolean("activo").notNull().default(true),
});

export const especialidades = mysqlTable(
  "especialidades",
  {
    id: int("id").primaryKey().autoincrement(),
    nombre: varchar("nombre", { length: 80 }).notNull(),
    servicioId: int("servicio_id").notNull(),
  },
  (table) => ({
    servicioFk: foreignKey({
      columns: [table.servicioId],
      foreignColumns: [servicios.id],
      name: "especialidades_servicio_fk",
    }),
  }),
);

export const camas = mysqlTable(
  "camas",
  {
    id: int("id").primaryKey().autoincrement(),
    numero: varchar("numero", { length: 10 }).notNull(),
    estado: varchar("estado", { length: 20 }).notNull().default("libre"),
    ubicacion: varchar("ubicacion", { length: 80 }),
    especialidadId: int("especialidad_id").notNull(),
  },
  (table) => ({
    especialidadFk: foreignKey({
      columns: [table.especialidadId],
      foreignColumns: [especialidades.id],
      name: "camas_especialidad_fk",
    }),
  }),
);

export const ingresos = mysqlTable(
  "ingresos",
  {
    id: int("id").primaryKey().autoincrement(),
    hc: varchar("hc", { length: 20 }).notNull(),
    camaId: int("cama_id").notNull(),
    fechaIngreso: datetime("fecha_ingreso").notNull(),

    // Se conserva para compatibilidad con los registros antiguos.
    medico: varchar("medico", { length: 100 }),

    // Nueva relación con el maestro de médicos.
    medicoId: int("medico_id"),

    tipoIngreso: varchar("tipo_ingreso", { length: 20 })
      .notNull()
      .default("normal"),

    servicioOrigenId: int("servicio_origen_id"),
    financiamiento: varchar("financiamiento", { length: 40 }),
    usaVentilador: boolean("usa_ventilador").notNull().default(false),
    usaOxigeno: boolean("usa_oxigeno").notNull().default(false),
    tieneProblemaJudicial: boolean("tiene_problema_judicial")
      .notNull()
      .default(false),
    tieneProblemaSocial: boolean("tiene_problema_social")
      .notNull()
      .default(false),
    notasEstancia: text("notas_estancia"),
  },
  (table) => ({
    pacienteFk: foreignKey({
      columns: [table.hc],
      foreignColumns: [pacientesRef.hc],
      name: "ingresos_paciente_fk",
    }),

    camaFk: foreignKey({
      columns: [table.camaId],
      foreignColumns: [camas.id],
      name: "ingresos_cama_fk",
    }),

    servicioOrigenFk: foreignKey({
      columns: [table.servicioOrigenId],
      foreignColumns: [servicios.id],
      name: "ingresos_servicio_origen_fk",
    }),

    medicoFk: foreignKey({
      columns: [table.medicoId],
      foreignColumns: [medicos.id],
      name: "ingresos_medico_fk",
    }),
  }),
);

export const diagnosticosIngreso = mysqlTable(
  "diagnosticos_ingreso",
  {
    id: int("id").primaryKey().autoincrement(),
    ingresoId: int("ingreso_id").notNull(),
    orden: int("orden").notNull().default(1),
    cie10Codigo: varchar("cie10_codigo", { length: 15 }),
    cie10Descripcion: varchar("cie10_descripcion", {
      length: 250,
    }).notNull(),
  },
  (table) => ({
    ingresoFk: foreignKey({
      columns: [table.ingresoId],
      foreignColumns: [ingresos.id],
      name: "diagnosticos_ingreso_fk",
    }),
  }),
);

export const movimientos = mysqlTable("movimientos", {
  id: int("id").primaryKey().autoincrement(),
  ingresoId: int("ingreso_id").notNull(),
  camaOrigenId: int("cama_origen_id"),
  camaDestinoId: int("cama_destino_id"),
  fecha: datetime("fecha").notNull(),
});

export const egresos = mysqlTable(
  "egresos",
  {
    id: int("id").primaryKey().autoincrement(),
    ingresoId: int("ingreso_id").notNull().unique(),
    fechaEgreso: datetime("fecha_egreso").notNull(),
    tipoEgreso: varchar("tipo_egreso", { length: 30 }).notNull(),
    codigoEgresoOriginal: varchar("codigo_egreso_original", {
      length: 10,
    }),
    servicioDestinoId: int("servicio_destino_id"),
    medicoAlta: varchar("medico_alta", { length: 100 }),
    diagnosticoFinal: varchar("diagnostico_final", { length: 250 }),
  },
  (table) => ({
    ingresoFk: foreignKey({
      columns: [table.ingresoId],
      foreignColumns: [ingresos.id],
      name: "egresos_ingreso_fk",
    }),

    servicioDestinoFk: foreignKey({
      columns: [table.servicioDestinoId],
      foreignColumns: [servicios.id],
      name: "egresos_servicio_destino_fk",
    }),
  }),
);

export const serviciosRelations = relations(servicios, ({ many }) => ({
  especialidades: many(especialidades),
}));

export const especialidadesRelations = relations(
  especialidades,
  ({ one, many }) => ({
    servicio: one(servicios, {
      fields: [especialidades.servicioId],
      references: [servicios.id],
    }),

    camas: many(camas),
  }),
);

export const camasRelations = relations(camas, ({ one, many }) => ({
  especialidad: one(especialidades, {
    fields: [camas.especialidadId],
    references: [especialidades.id],
  }),

  ingresos: many(ingresos),
}));

export const ingresosRelations = relations(
  ingresos,
  ({ one, many }) => ({
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

    medico: one(medicos, {
      fields: [ingresos.medicoId],
      references: [medicos.id],
    }),

    diagnosticos: many(diagnosticosIngreso),

    movimientos: many(movimientos),

    egreso: one(egresos),
  }),
);

export const diagnosticosIngresoRelations = relations(
  diagnosticosIngreso,
  ({ one }) => ({
    ingreso: one(ingresos, {
      fields: [diagnosticosIngreso.ingresoId],
      references: [ingresos.id],
    }),
  }),
);

export const movimientosRelations = relations(
  movimientos,
  ({ one }) => ({
    ingreso: one(ingresos, {
      fields: [movimientos.ingresoId],
      references: [ingresos.id],
    }),
  }),
);

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
