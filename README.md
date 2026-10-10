# Censo Hospitalario · HEGB

Sistema de gestión de hospitalizaciones del **Hospital Regional Eleazar Guzmán Barrón**. La marca incluida identifica la aplicación; no sustituye el emblema oficial del hospital.

## Operación

- El censo abre la ficha del paciente: ubicación, diagnósticos, recursos, notas y recorrido.
- Un paciente tiene una hospitalización activa y una cama tiene una asignación activa. Las restricciones únicas en MySQL y las transacciones protegen solicitudes simultáneas.
- Cambiar de cama o servicio es un **traslado interno**, no un egreso y nuevo ingreso. Conserva la fecha inicial y registra un período de ubicación por cada movimiento.
- El egreso cierra la hospitalización, termina la ubicación y libera la cama. No se permite modificar una estancia cerrada.
- Fechas de eventos y fechas de registro son independientes; el responsable proviene de la sesión. Los registros atrasados deben respetar el recorrido y no solapar otra estancia en la cama.
- MySQL almacena UTC; pantallas y filtros usan `America/Lima`. Estancia significa días completos de 24 horas, no pacientes-día. El promedio principal de estancia usa solo egresadas; las activas se muestran aparte.
- Reporte de ingresos: servicio inicial. Egresos: servicio al egreso. Estancia: servicio actual para activas, servicio de egreso para cerradas; sus fechas filtran la fecha de ingreso.

## Preparación

Requiere Node 24 y MySQL 8. Instala con `npm ci`. Configura `DATABASE_URL`, `DATABASE_SSL`, `DATABASE_CA` y `SESSION_SECRET` como secretos protegidos de Vercel y del repositorio en Codespaces. No se necesitan archivos `.env` con credenciales; los scripts admiten variables del entorno. `.env.example` documenta los nombres con valores ficticios. SSL valida el certificado; añade `DATABASE_CA` si el proveedor necesita una CA propia. `DATABASE_SSL=false` se reserva para MySQL local.

Genera `SESSION_SECRET` con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. No compartas ni subas este valor.

Para crear un hash de contraseña sin incluirla en el historial de comandos:

```bash
read -rs -p 'Contraseña: ' HEGB_PASSWORD
printf '%s' "$HEGB_PASSWORD" | npm run auth:hash --silent
unset HEGB_PASSWORD
```

Las cuentas se almacenan en la tabla `usuarios`. Para crear el primer administrador, entrega por entrada estándar una lista JSON con `usuario`, `nombre`, `rol` y `passwordHash` a `npm run auth:install -- --stdin`. Usa el hash generado anteriormente; nunca almacenes contraseñas en texto plano. Este comando importa cuentas sin reemplazar sus hashes existentes y registra la migración 0005.

Después, un administrador puede crear cuentas, cambiar contraseña y rol, y desactivar usuarios desde **Usuarios**. No se permite desactivar ni quitar el rol al último administrador activo.

Cada persona debe tener su propia cuenta. Roles:

| Rol           | Permisos                                                           |
| ------------- | ------------------------------------------------------------------ |
| administrador | Consulta, operaciones y estructura hospitalaria                    |
| operador      | Consulta, ingresos, actualización de estancia, traslados y egresos |
| consulta      | Censo, fichas y reportes                                           |

Sin cuentas y secreto válidos, el sistema no habilita el acceso. Sesiones firmadas de ocho horas, cookies HttpOnly y SameSite, control de origen en escrituras y límite compartido de cinco intentos por usuario cada quince minutos. Retirar una cuenta, cambiar su hash/rol o rotar el secreto invalida sus sesiones. Las cuentas se administran en la base de datos; no hay registro público de usuarios.

## Actualización de una base existente

**No ejecutar la migración sobre producción sin probar primero una copia respaldada.** MySQL hace commits implícitos en DDL: una migración fallida requiere restauración, no se revierte automáticamente. Detén escrituras durante el proceso.

1. Haz respaldo y restaura una copia aislada; configura las variables del entorno para esa copia.
2. Comprueba si las fechas antiguas eran UTC o locales. Configura `LEGACY_TIME_ZONE=UTC` o `LEGACY_TIME_ZONE=America/Lima`; la segunda opción convierte las fechas existentes a UTC. El script se niega a adivinar.
3. Ejecuta `npm run db:check`. Revisa y resuelve duplicados, estancias solapadas, referencias inválidas o egresos anteriores al ingreso. El script no corrige ni borra pacientes.
4. Ejecuta `npm run db:upgrade`. Admite las tablas de médicos/diagnósticos y la columna `medico_id` creadas manualmente en la versión anterior. Registra la actualización en el historial de Drizzle.
5. Compara censo y reportes; prueba ingreso, traslado y egreso. Si todo es correcto, repite sobre la base respaldada del hospital en una ventana de mantenimiento.

Las ubicaciones antiguas se reconstruyen desde la cama y estructura disponibles, se marcan `legacy` y **no recuperan movimientos que nunca se registraron**. Antes de migrar, comprueba el historial con los registros del hospital. Una migración parcial debe restaurarse desde el respaldo antes de repetirla.

Tras actualizar una base existente, ejecuta `npm run auth:install -- --stdin` con el administrador inicial. Para una base nueva vacía, `npm run db:migrate` aplica la secuencia completa; después importa el administrador con el mismo comando. `src/db/schema.ts` es la única fuente del esquema; las migraciones generadas están en `drizzle/`.

## Validación y desarrollo

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
npm run dev
```

La integración se prueba únicamente en MySQL temporal `127.0.0.1:33306/censo_test`, nunca en producción:

1. Crea un MySQL vacío y configura `.env.local` con las cuentas ficticias `admin.test`, `operador.test`, `consulta.test`, contraseña `local-test-password-123`, secreto de prueba y `LEGACY_TIME_ZONE=UTC`.
2. Ejecuta `node --env-file=.env.local tests/prepare-db.mjs` y `npm run db:upgrade`, luego `npm run auth:install` para importar las tres cuentas de prueba y `npm run db:census` para preparar configuración e historial de camas.
3. Inicia la aplicación en el puerto 3100: `npm run start -- -p 3100` después de compilar.
4. Ejecuta `npm run test:integration`. Verifica permisos, origen, concurrencia, rollback, traslados, egresos, reportes históricos y límite de intentos. La base de prueba queda con datos ficticios; debe recrearse para repetir la suite.

Los scripts de prueba verifican host, puerto y nombre de base antes de operar. `scripts/seed-demo.mjs` solo prepara catálogos en la base local de prueba.

## Credenciales del repositorio anterior

Las credenciales se mantienen en secretos protegidos del hosting y Codespaces, fuera de los archivos `.env` del proyecto. Si tuvo credenciales válidas, **reemplázalas en el proveedor y en el hosting**, porque retirarlo del commit actual no las elimina del historial público. No se ha reescrito el historial ni cambiado credenciales de servicios externos.

## Censo histórico, cierres e indicadores

Consulta la [guía de operación](docs/operacion-del-censo.md) para las pantallas nuevas, reglas de conteo y correcciones con versiones. Después de la migración de usuarios, `npm run db:census` instala la migración 0006 e inicia el historial de capacidad sin modificar pacientes. En la BD temporal, ejecuta también `npm run test:operations` después de la integración anterior.

## Identidad visual

Azul petróleo y turquesa para navegación y acciones; verde para libre, azul para ocupada, gris para inoperativa, ámbar para atención y rojo para error. Los estados incluyen texto, además del color. Marca e iconos vectoriales y fuente Geist local en `public/brand`; licencia de fuente incluida. Los reportes imprimen el nombre del hospital y la marca del sistema.

Las dependencias de producción se actualizaron a Next.js 16.4.0 y versiones compatibles; la auditoría de producción no reportó vulnerabilidades al validar esta versión. Quedan nueve avisos en herramientas de desarrollo (ESLint/Drizzle y dependencias transitivas), cuya corrección automática propone versiones anteriores incompatibles; no se forzó esa degradación.
