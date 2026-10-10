CREATE TABLE IF NOT EXISTS `diagnosticos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(10) NOT NULL,
	`descripcion` varchar(500) NOT NULL,
	`activo` boolean NOT NULL DEFAULT true,
	CONSTRAINT `diagnosticos_id` PRIMARY KEY(`id`),
	CONSTRAINT `diagnosticos_codigo_unique` UNIQUE(`codigo`)
);
--> statement-breakpoint
CREATE TABLE `intentos_acceso` (
	`clave` varchar(64) NOT NULL,
	`intentos` int NOT NULL,
	`ventana` datetime NOT NULL,
	CONSTRAINT `intentos_acceso_clave` PRIMARY KEY(`clave`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `medicos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cmp` varchar(20) NOT NULL,
	`nombres` varchar(100) NOT NULL,
	`apellido_paterno` varchar(100) NOT NULL,
	`apellido_materno` varchar(100),
	`especialidad` varchar(150) NOT NULL,
	`servicio_id` int NOT NULL,
	`activo` boolean NOT NULL DEFAULT true,
	CONSTRAINT `medicos_id` PRIMARY KEY(`id`),
	CONSTRAINT `medicos_cmp_unique` UNIQUE(`cmp`)
);
--> statement-breakpoint
CREATE TABLE `ocupaciones_activas` (
	`ingreso_id` int NOT NULL,
	`hc` varchar(20) NOT NULL,
	`cama_id` int NOT NULL,
	CONSTRAINT `ocupaciones_activas_ingreso_id` PRIMARY KEY(`ingreso_id`),
	CONSTRAINT `ocupaciones_activas_hc_unique` UNIQUE(`hc`),
	CONSTRAINT `ocupaciones_activas_cama_id_unique` UNIQUE(`cama_id`)
);
--> statement-breakpoint
CREATE TABLE `ubicaciones_ingreso` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ingreso_id` int NOT NULL,
	`cama_id` int NOT NULL,
	`servicio_id` int NOT NULL,
	`servicio` varchar(60) NOT NULL,
	`especialidad` varchar(80) NOT NULL,
	`cama` varchar(10) NOT NULL,
	`desde` datetime NOT NULL,
	`hasta` datetime,
	CONSTRAINT `ubicaciones_ingreso_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `egresos` ADD `fecha_registro` datetime;--> statement-breakpoint
ALTER TABLE `egresos` ADD `registrado_por` varchar(100);--> statement-breakpoint
ALTER TABLE `egresos` ADD `servicio_egreso_id` int;--> statement-breakpoint
ALTER TABLE `egresos` ADD `servicio_egreso` varchar(60);--> statement-breakpoint
ALTER TABLE `egresos` ADD `especialidad_egreso` varchar(80);--> statement-breakpoint
ALTER TABLE `egresos` ADD `cama_egreso` varchar(10);--> statement-breakpoint
ALTER TABLE `ingresos` ADD `fecha_registro` datetime;--> statement-breakpoint
ALTER TABLE `ingresos` ADD `registrado_por` varchar(100);--> statement-breakpoint
ALTER TABLE `ingresos` ADD `servicio_ingreso_id` int;--> statement-breakpoint
ALTER TABLE `ingresos` ADD `servicio_ingreso` varchar(60);--> statement-breakpoint
ALTER TABLE `ingresos` ADD `especialidad_ingreso` varchar(80);--> statement-breakpoint
ALTER TABLE `ingresos` ADD `cama_ingreso` varchar(10);--> statement-breakpoint
ALTER TABLE `ingresos` ADD `medico_id` int;--> statement-breakpoint
ALTER TABLE `movimientos` ADD `fecha_registro` datetime;--> statement-breakpoint
ALTER TABLE `movimientos` ADD `tipo` varchar(20) DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `movimientos` ADD `motivo` text;--> statement-breakpoint
ALTER TABLE `movimientos` ADD `responsable` varchar(100);--> statement-breakpoint
ALTER TABLE `movimientos` ADD `detalle` text;--> statement-breakpoint
ALTER TABLE `camas` ADD CONSTRAINT `camas_numero_especialidad_uq` UNIQUE(`especialidad_id`,`numero`);--> statement-breakpoint
ALTER TABLE `ocupaciones_activas` ADD CONSTRAINT `ocupaciones_activas_ingreso_id_ingresos_id_fk` FOREIGN KEY (`ingreso_id`) REFERENCES `ingresos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ocupaciones_activas` ADD CONSTRAINT `ocupaciones_activas_hc_pacientes_ref_hc_fk` FOREIGN KEY (`hc`) REFERENCES `pacientes_ref`(`hc`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ocupaciones_activas` ADD CONSTRAINT `ocupaciones_activas_cama_id_camas_id_fk` FOREIGN KEY (`cama_id`) REFERENCES `camas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ubicaciones_ingreso` ADD CONSTRAINT `ubicaciones_ingreso_ingreso_id_ingresos_id_fk` FOREIGN KEY (`ingreso_id`) REFERENCES `ingresos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ubicaciones_ingreso` ADD CONSTRAINT `ubicaciones_ingreso_cama_id_camas_id_fk` FOREIGN KEY (`cama_id`) REFERENCES `camas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ubicaciones_ingreso_idx` ON `ubicaciones_ingreso` (`ingreso_id`,`desde`);--> statement-breakpoint
ALTER TABLE `ingresos` ADD CONSTRAINT `ingresos_medico_fk` FOREIGN KEY (`medico_id`) REFERENCES `medicos`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
UPDATE ingresos i JOIN camas c ON c.id=i.cama_id JOIN especialidades e ON e.id=c.especialidad_id JOIN servicios s ON s.id=e.servicio_id SET i.fecha_registro=i.fecha_ingreso,i.registrado_por='legacy',i.servicio_ingreso_id=s.id,i.servicio_ingreso=s.nombre,i.especialidad_ingreso=e.nombre,i.cama_ingreso=c.numero WHERE i.fecha_registro IS NULL;
--> statement-breakpoint
UPDATE egresos x JOIN ingresos i ON i.id=x.ingreso_id JOIN camas c ON c.id=i.cama_id JOIN especialidades e ON e.id=c.especialidad_id JOIN servicios s ON s.id=e.servicio_id SET x.fecha_registro=x.fecha_egreso,x.registrado_por='legacy',x.servicio_egreso_id=s.id,x.servicio_egreso=s.nombre,x.especialidad_egreso=e.nombre,x.cama_egreso=c.numero WHERE x.fecha_registro IS NULL;
--> statement-breakpoint
UPDATE movimientos SET fecha_registro=fecha,responsable='legacy' WHERE fecha_registro IS NULL;
--> statement-breakpoint
ALTER TABLE ingresos MODIFY fecha_registro datetime NOT NULL, MODIFY registrado_por varchar(100) NOT NULL;
--> statement-breakpoint
ALTER TABLE egresos MODIFY fecha_registro datetime NOT NULL, MODIFY registrado_por varchar(100) NOT NULL;
--> statement-breakpoint
ALTER TABLE movimientos MODIFY fecha_registro datetime NOT NULL, MODIFY responsable varchar(100) NOT NULL, MODIFY tipo varchar(20) NOT NULL DEFAULT 'traslado';
--> statement-breakpoint
INSERT INTO ocupaciones_activas (ingreso_id,hc,cama_id) SELECT i.id,i.hc,i.cama_id FROM ingresos i LEFT JOIN egresos e ON e.ingreso_id=i.id WHERE e.id IS NULL;
--> statement-breakpoint
INSERT INTO ubicaciones_ingreso (ingreso_id,cama_id,servicio_id,servicio,especialidad,cama,desde,hasta) SELECT i.id,i.cama_id,i.servicio_ingreso_id,i.servicio_ingreso,i.especialidad_ingreso,i.cama_ingreso,i.fecha_ingreso,e.fecha_egreso FROM ingresos i LEFT JOIN egresos e ON e.ingreso_id=i.id;
--> statement-breakpoint
INSERT INTO movimientos (ingreso_id,cama_destino_id,fecha,fecha_registro,tipo,responsable,detalle) SELECT id,cama_id,fecha_ingreso,fecha_registro,'ingreso','legacy','Registro importado; ubicación reconstruida desde los datos disponibles' FROM ingresos;
--> statement-breakpoint
INSERT INTO movimientos (ingreso_id,cama_origen_id,fecha,fecha_registro,tipo,responsable,detalle) SELECT e.ingreso_id,i.cama_id,e.fecha_egreso,e.fecha_registro,'egreso','legacy','Registro importado' FROM egresos e JOIN ingresos i ON i.id=e.ingreso_id;
--> statement-breakpoint
UPDATE camas c LEFT JOIN ocupaciones_activas a ON a.cama_id=c.id SET c.estado=CASE WHEN a.ingreso_id IS NOT NULL THEN 'ocupada' WHEN c.estado='inoperativa' THEN 'inoperativa' ELSE 'libre' END;
