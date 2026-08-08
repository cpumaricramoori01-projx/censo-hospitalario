CREATE TABLE `camas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numero` varchar(10) NOT NULL,
	`estado` varchar(20) NOT NULL DEFAULT 'libre',
	`especialidad_id` int NOT NULL,
	CONSTRAINT `camas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `egresos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ingreso_id` int NOT NULL,
	`fecha_egreso` datetime NOT NULL,
	`tipo_egreso` varchar(30) NOT NULL,
	`diagnostico_final` varchar(200),
	CONSTRAINT `egresos_id` PRIMARY KEY(`id`),
	CONSTRAINT `egresos_ingreso_id_unique` UNIQUE(`ingreso_id`)
);
--> statement-breakpoint
CREATE TABLE `especialidades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(80) NOT NULL,
	`servicio_id` int NOT NULL,
	CONSTRAINT `especialidades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ingresos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hc` varchar(20) NOT NULL,
	`cama_id` int NOT NULL,
	`fecha_ingreso` datetime NOT NULL,
	`diagnostico` varchar(200),
	`medico` varchar(100),
	CONSTRAINT `ingresos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `movimientos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ingreso_id` int NOT NULL,
	`cama_origen_id` int,
	`cama_destino_id` int,
	`fecha` datetime NOT NULL,
	CONSTRAINT `movimientos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pacientes_ref` (
	`hc` varchar(20) NOT NULL,
	`nombres` varchar(100) NOT NULL,
	`apellidos` varchar(100) NOT NULL,
	`sexo` char(1),
	`fecha_nacimiento` date,
	`correo` varchar(120),
	`telefono` varchar(20),
	`direccion` varchar(200),
	`origen_dato` varchar(20) NOT NULL DEFAULT 'manual',
	`fecha_actualizacion` datetime NOT NULL,
	CONSTRAINT `pacientes_ref_hc` PRIMARY KEY(`hc`)
);
--> statement-breakpoint
CREATE TABLE `servicios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(50) NOT NULL,
	CONSTRAINT `servicios_id` PRIMARY KEY(`id`)
);
