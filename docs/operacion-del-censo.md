# Operación del censo y sus históricos

Todas las horas de las pantallas corresponden a America/Lima. MySQL conserva UTC. Se mantiene la cuenta administradora existente; instalar estas funciones no crea usuarios.

## Pantallas del panel

- **Censo histórico**: fecha y hora exactas, búsqueda por paciente/HC/servicio/cama, exportación CSV e impresión. La ubicación se reconstruye de ubicaciones_ingreso; no se inventan movimientos legacy. Los datos identificativos usan la referencia actual del paciente.
- **Parte diario**: existencia inicial, ingresos, traslados recibidos/enviados, egresos, fallecidos (incluidos en egresos), existencia final y diferencia. Solo los cambios entre servicios aumentan recibidos/enviados. Los cambios de cama en un servicio conservan el conteo del servicio.
- **Historial de camas**: períodos habilitados/bloqueados, motivos y responsables. Bloquear exige una cama sin paciente. Los cambios administrativos de servicio, especialidad y número conservan las etiquetas previas en los períodos históricos.
- **Indicadores mensuales**: días completos, pacientes-día, días-cama, egresos, camas promedio, ocupación, permanencia estadística, rendimiento e intervalo de sustitución; detalle diario, CSV e impresión.
- **Pendientes**: datos administrativos incompletos, médico/diagnóstico/financiamiento faltantes, seguimiento social/judicial, estancias prolongadas e integridad. Abre la ficha para revisar: el administrador puede completar nacimiento y financiamiento, y las operaciones existentes permiten actualizar diagnóstico, médico y seguimiento.
- **Auditoría**: movimientos clínicos y cambios administrativos; filtros por usuario, HC/referencia y fecha de registro, con antes/después cuando está disponible. Solo administradores.
- **Configuración**: corte diario inicial 00:00 y aviso operativo de estancia desde 14 días. El corte se cambia antes del primer cierre y queda fijo después; el aviso de estancia puede ajustarse posteriormente con motivo.

## Revisión, cierre y corrección

1. Consulta un día completo en Parte diario y verifica la conciliación. Los períodos en curso son provisionales y no se cierran.
2. El administrador cierra el día. Se guarda una versión inmutable con contenido, huella SHA-256, responsable, fecha y motivo.
3. Para corregir, reabre el día con motivo. Si un registro atrasado afecta otros días cerrados posteriores, reabre también esos días. El sistema bloquea el evento hasta hacerlo.
4. En la ficha, **Corrección administrativa de fechas** permite corregir ingreso, traslado o egreso. No cambia la cama asignada ni borra el evento. Valida orden del recorrido, solapamiento de camas/hospitalizaciones y conserva antes/después.
5. Revisa otra vez los partes y ciérralos con el motivo de la corrección. Se crea una nueva versión; la versión previa continúa disponible para consulta, impresión y exportación.

Los cierres y eventos fechados comparten un bloqueo transaccional de configuración. Dos cierres simultáneos o un cierre concurrente con una operación no generan revisiones contradictorias. La versión enviada por el panel protege frente a cambios de otra sesión.

## Metodología

El período va desde la hora de corte de la fecha seleccionada hasta la misma hora del día siguiente, con límite final exclusivo para eventos. La existencia inicial corresponde al instante anterior al corte inicial; la final al instante anterior al corte final. Un evento exactamente al corte pertenece al nuevo período.

Conciliación por servicio: inicial + ingresos + recibidos − enviados − egresos = final. A nivel hospital los traslados internos se compensan.

Pacientes-día: existencia final más los pacientes que ingresaron y egresaron dentro del mismo período. Las estancias intradiarias se atribuyen al servicio del egreso. Esta regla se basa en la referencia histórica del [MINSA, Módulo II de capacitación en estadística e informática](https://cdn.www.gob.pe/uploads/document/file/391005/M%C3%B3dulos_de_capacitaci%C3%B3n_para_t%C3%A9cnicos_en_estad%C3%ADstica_e_inform%C3%A1tica._M%C3%B3dulo_II__Intermedio20191017-26355-1pa91wo.pdf); las pantallas muestran el método aplicado.

Días-cama disponibles: suma de camas habilitadas al cierre de cada día con cobertura conocida desde el inicio del período. Se inicia el historial al instalar la función, con el estado real encontrado; no se reconstruye capacidad antigua usando las camas actuales. Un mes con días sin cobertura conserva pacientes-día y egresos, pero muestra N/D para indicadores dependientes de capacidad.

Permanencia estadística: diferencia de fechas locales entre ingreso y egreso, mínimo un día por egreso. Se atribuye toda la hospitalización al servicio del egreso. Las fichas y el reporte anterior mantienen su duración en días completos de 24 horas, explícitamente distinta de esta medida.

- Ocupación: pacientes-día / días-cama × 100.
- Promedio de camas: días-cama / días completos del período.
- Rendimiento cama: egresos / promedio de camas.
- Intervalo de sustitución: (días-cama − pacientes-día) / egresos.
- Promedio de permanencia: suma de permanencias estadísticas de egresados / egresos.

No se divide por cero: la razón correspondiente es N/D. Las inconsistencias aparecen visibles y bloquean el cierre. El aviso de estancia es un criterio operativo, no una decisión clínica ni un estándar uniforme para todos los servicios.

## Instalación y pruebas

Primero respalda y prueba una copia. Con las variables de conexión del entorno, ejecuta `npm run db:census`. Agrega las cinco tablas de la migración 0006, prepara la configuración e inicia los períodos de cama. Es idempotente, comprueba el hash de la migración y no actualiza tablas clínicas.

Para una base nueva, `npm run db:migrate` crea el esquema; después prepara el administrador con `auth:install -- --stdin` y ejecuta `db:census` para iniciar configuración/capacidad. No uses el script de actualización de una base legacy sobre una base nueva.

Pruebas: `npm test`, `npm run lint`, `npm run build`. En la BD temporal protegida 127.0.0.1:33306/censo_test, prepara datos legacy, ejecuta upgrade, auth:install y db:census; inicia la compilación en puerto 3100 y ejecuta las suites `test:integration` y `test:operations`. La segunda suite contiene capacidad histórica ficticia exclusivamente para esa BD aislada; nunca ejecuta escrituras en Aiven.
