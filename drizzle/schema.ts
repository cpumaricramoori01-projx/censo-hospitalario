import { mysqlTable, mysqlSchema, AnyMySqlColumn, foreignKey, primaryKey, int, varchar, unique, tinyint, datetime, text, char, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const camas = mysqlTable("camas", {
	id: int().autoincrement().notNull(),
	numero: varchar({ length: 10 }).notNull(),
	estado: varchar({ length: 20 }).default('libre').notNull(),
	especialidadId: int("especialidad_id").notNull().references(() => especialidades.id),
	ubicacion: varchar({ length: 80 }),
},
(table) => [
	primaryKey({ columns: [table.id], name: "camas_id"}),
]);

export const diagnosticos = mysqlTable("diagnosticos", {
	id: int().autoincrement().notNull(),
	codigo: varchar({ length: 10 }).notNull(),
	descripcion: varchar({ length: 500 }).notNull(),
	activo: tinyint().default(1).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "diagnosticos_id"}),
	unique("codigo").on(table.codigo),
]);

export const diagnosticosIngreso = mysqlTable("diagnosticos_ingreso", {
	id: int().autoincrement().notNull(),
	ingresoId: int("ingreso_id").notNull().references(() => ingresos.id),
	orden: int().default(1).notNull(),
	cie10Codigo: varchar("cie10_codigo", { length: 15 }),
	cie10Descripcion: varchar("cie10_descripcion", { length: 250 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "diagnosticos_ingreso_id"}),
]);

export const egresos = mysqlTable("egresos", {
	id: int().autoincrement().notNull(),
	ingresoId: int("ingreso_id").notNull().references(() => ingresos.id),
	fechaEgreso: datetime("fecha_egreso", { mode: 'string'}).notNull(),
	tipoEgreso: varchar("tipo_egreso", { length: 30 }).notNull(),
	diagnosticoFinal: varchar("diagnostico_final", { length: 250 }),
	codigoEgresoOriginal: varchar("codigo_egreso_original", { length: 10 }),
	servicioDestinoId: int("servicio_destino_id").references(() => servicios.id),
	medicoAlta: varchar("medico_alta", { length: 100 }),
	notas: text(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "egresos_id"}),
	unique("egresos_ingreso_id_unique").on(table.ingresoId),
]);

export const especialidades = mysqlTable("especialidades", {
	id: int().autoincrement().notNull(),
	nombre: varchar({ length: 80 }).notNull(),
	servicioId: int("servicio_id").notNull().references(() => servicios.id),
},
(table) => [
	primaryKey({ columns: [table.id], name: "especialidades_id"}),
]);

export const ingresos = mysqlTable("ingresos", {
	id: int().autoincrement().notNull(),
	hc: varchar({ length: 20 }).notNull().references(() => pacientesRef.hc),
	camaId: int("cama_id").notNull().references(() => camas.id),
	fechaIngreso: datetime("fecha_ingreso", { mode: 'string'}).notNull(),
	medico: varchar({ length: 100 }),
	medicoId: int("medico_id").references(() => medicos.id),
	tipoIngreso: varchar("tipo_ingreso", { length: 20 }).default('normal').notNull(),
	servicioOrigenId: int("servicio_origen_id").references(() => servicios.id),
	financiamiento: varchar({ length: 40 }),
	usaVentilador: tinyint("usa_ventilador").default(0).notNull(),
	usaOxigeno: tinyint("usa_oxigeno").default(0).notNull(),
	tieneProblemaJudicial: tinyint("tiene_problema_judicial").default(0).notNull(),
	tieneProblemaSocial: tinyint("tiene_problema_social").default(0).notNull(),
	notasEstancia: text("notas_estancia"),
},
(table) => [
	primaryKey({ columns: [table.id], name: "ingresos_id"}),
]);

export const medicos = mysqlTable("medicos", {
	id: int().autoincrement().notNull(),
	cmp: varchar({ length: 20 }).notNull(),
	nombres: varchar({ length: 100 }).notNull(),
	apellidoPaterno: varchar("apellido_paterno", { length: 100 }).notNull(),
	apellidoMaterno: varchar("apellido_materno", { length: 100 }),
	especialidad: varchar({ length: 150 }).notNull(),
	servicioId: int("servicio_id").notNull(),
	activo: tinyint().default(1).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "medicos_id"}),
	unique("cmp").on(table.cmp),
]);

export const movimientos = mysqlTable("movimientos", {
	id: int().autoincrement().notNull(),
	ingresoId: int("ingreso_id").notNull(),
	camaOrigenId: int("cama_origen_id"),
	camaDestinoId: int("cama_destino_id"),
	fecha: datetime({ mode: 'string'}).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "movimientos_id"}),
]);

export const pacientesRef = mysqlTable("pacientes_ref", {
	hc: varchar({ length: 20 }).notNull(),
	nombres: varchar({ length: 100 }).notNull(),
	sexo: char({ length: 1 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	fechaNacimiento: date("fecha_nacimiento", { mode: 'string' }),
	correo: varchar({ length: 120 }),
	telefono: varchar({ length: 20 }),
	direccion: varchar({ length: 200 }),
	origenDato: varchar("origen_dato", { length: 20 }).default('manual').notNull(),
	fechaActualizacion: datetime("fecha_actualizacion", { mode: 'string'}).notNull(),
	dni: varchar({ length: 15 }),
	apellidoPaterno: varchar("apellido_paterno", { length: 100 }).notNull(),
	apellidoMaterno: varchar("apellido_materno", { length: 100 }),
},
(table) => [
	primaryKey({ columns: [table.hc], name: "pacientes_ref_hc"}),
]);

export const servicios = mysqlTable("servicios", {
	id: int().autoincrement().notNull(),
	nombre: varchar({ length: 60 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "servicios_id"}),
]);
