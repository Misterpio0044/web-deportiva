# Plan: Exportación de actividades a GPX (issue #44)

Rama: `44-exportacion-de-actividades-a-archivo-gpx`

## 1. Resumen funcional

En `ActivitiesPage` añadir un flujo de **exportación a GPX**:

1. Botón **"Exportar"** en la cabecera de la página (junto al selector de atleta).
2. Al pulsarlo se entra en **modo selección**:
   - Aparece una columna de **checkboxes** al inicio de cada fila de la tabla.
   - Se muestra una barra de acciones con: **"Seleccionar todas"**, **"Limpiar"**, contador de seleccionadas, **"Descargar GPX"** y **"Cancelar"**.
3. **"Descargar GPX"**:
   - Si hay **1** seleccionada → descarga un archivo `.gpx`.
   - Si hay **N > 1** → descarga un `.zip` con un `.gpx` por actividad.
4. **"Cancelar"** sale del modo selección y limpia la selección.

## 2. Estado actual del dominio (importante)

- `activities.streams_json` (JSONB) **existe en el esquema pero está vacío**: ni el importador de GPX ([gpxParser.ts](frontend/src/lib/gpxParser.ts)) ni la sincronización Strava ([SyncStravaUseCase.ts](backend/src/application/strava/SyncStravaUseCase.ts)) lo escriben.
- Solo persistimos `start_latitude/longitude` y `end_latitude/longitude` y agregados (distancia, ritmo, FC media, etc.).
- Conclusión: hoy **no podemos reconstruir un track real**. El plan se divide en dos fases.

## 3. Fase 1 — MVP de exportación (solo metadatos + 2 waypoints)

Permite cerrar el issue rápido y dejar todo el cableado UI listo. El `.gpx` generado contiene:

- `<metadata>` con `name`, `time`, `desc` (sport, distancia, tiempo, FC, ritmo).
- Un único `<trk>/<trkseg>` con dos `<trkpt>`: inicio (`start_lat/lon`, `time = start_date`) y fin (`end_lat/lon`, `time = start_date + elapsed_time`).
- Si no hay coordenadas, exportar solo `<metadata>` (válido como GPX 1.1).

### Backend

1. **Nuevo caso de uso** `backend/src/application/activity/ExportActivityGpxUseCase.ts`:
   - Input: `activityId`, `requester { sub, role }`.
   - Permisos: usuario solo puede exportar las suyas (mismo patrón que `GET /activities/:id`); admin puede cualquiera.
   - Output: `{ filename: string, xml: string }`.
2. **Builder** `backend/src/infrastructure/gpx/buildGpxFromActivity.ts`:
   - Función pura `buildGpx(activity: Activity): string`.
   - Namespaces estándar (`http://www.topografix.com/GPX/1/1` + `gpxtpx` por compatibilidad futura).
   - Escapado XML correcto de `name` / `description`.
   - Nombre de fichero: `${YYYY-MM-DD}_${slug(name)}.gpx` (helper `slugify`).
3. **Rutas** en [activityRoutes.ts](backend/src/infrastructure/http/routes/activityRoutes.ts):
   - `GET /activities/:id/gpx` → un solo archivo, `Content-Type: application/gpx+xml`, `Content-Disposition: attachment; filename="..."`.
   - `POST /activities/export/gpx` con body `{ ids: number[] }` (máx 200 ids, validar con zod) → responde `application/zip` con `Content-Disposition: attachment; filename="actividades.zip"`. Implementación con `archiver` (añadir dependencia) o, alternativa sin deps, generar zip en streaming con `yazl`. Recomendado: **`archiver`** (mejor mantenido). Internamente itera los ids, comprueba permisos uno a uno y descarta los no permitidos.
4. **Tests** en `backend/tests/`:
   - Unit: `unit/activity/exportActivityGpxUseCase.test.ts` (genera XML válido, lanza `ForbiddenError`, fallback sin coords).
   - Endpoint: `endpoints/activities.routes.test.ts` (añadir tests para `/gpx` y `/export/gpx`, comprobando headers y status).
   - Validar XML con un parser ligero (`fast-xml-parser` ya o nuevo dep dev).

### Frontend

1. **API** en [activitiesApi.ts](frontend/src/infrastructure/api/activitiesApi.ts):
   - `exportOne(id): Promise<Blob>` → `GET /activities/${id}/gpx` con `responseType: 'blob'`.
   - `exportMany(ids: number[]): Promise<Blob>` → `POST /activities/export/gpx` con `responseType: 'blob'`.
2. **Helper** `frontend/src/lib/downloadBlob.ts`:
   - `downloadBlob(blob: Blob, filename: string)` usando `URL.createObjectURL` + `<a download>` (extraer del header `Content-Disposition` si viene; si no, usar fallback).
3. **Estado en `ActivitiesPage`**:
   - `selectionMode: boolean`, `selectedIds: Set<number>`, `exporting: boolean`, `exportError: string`.
   - Handlers: `enterSelection`, `cancelSelection`, `toggleOne(id)`, `selectAll(visibleIds)`, `clearSelection`, `exportSelected()`.
4. **UI**:
   - Botón "Exportar GPX" en `PageHeader` (siempre visible).
   - Cuando `selectionMode`: columna extra con `<input type="checkbox">` por fila + checkbox maestro en `<thead>` (estado `indeterminate` cuando hay selección parcial).
   - Barra inferior sticky o banda superior con acciones (Tailwind, mismo lenguaje visual que el resto: `rounded-xl border border-slate-200 bg-white shadow-sm`).
   - Filas son `<Link>`: al estar en modo selección, el click sobre la fila (no sobre el nombre) debe alternar la selección. Mantener accesibilidad: el `<Link>` del nombre sigue navegando.
5. **Componente extraído** opcional: `frontend/src/ui/organisms/ActivitiesTable.tsx` para no inflar la página (el archivo ya tiene 140+ líneas con la nueva lógica).
6. **Tests** en `frontend/src/components/__tests__/` o `ui/pages/__tests__/`:
   - Renderiza checkboxes solo en modo selección.
   - "Seleccionar todas" marca todas las visibles.
   - "Descargar GPX" llama a `exportOne` con 1 selección y a `exportMany` con N.
   - Mock de `downloadBlob` para verificar el filename.

### Criterios de aceptación Fase 1

- [ ] Botón "Exportar" visible en `ActivitiesPage` para todos los roles.
- [ ] Modo selección con checkboxes individuales + maestro "Seleccionar todas".
- [ ] Descarga `.gpx` para 1 actividad y `.zip` para varias.
- [ ] GPX validado contra el esquema GPX 1.1 (test con `fast-xml-parser` o validador online; al menos comprobar bien-formado y namespace correcto).
- [ ] Usuario `user` no puede exportar actividades ajenas (test endpoint con 403).
- [ ] El archivo descargado tiene `Content-Disposition` con nombre coherente.

## 4. Fase 2 — GPX fiel con trackpoints reales (opcional, recomendado)

Requiere persistir la ruta. Sugerencia mínima invasiva:

1. **Migración** `06_activity_streams.sql`:
   - Reutilizar `activities.streams_json JSONB` ya existente.
   - Estructura sugerida: `{ "time": number[], "latlng": [number,number][], "altitude": number[], "heartrate": number[], "cadence": number[] }` (formato compatible con la API de Strava).
2. **Importador GPX** (frontend, [gpxParser.ts](frontend/src/lib/gpxParser.ts)):
   - Extender `ParsedGpx` con `streams?: { time, latlng, altitude, heartrate, cadence }`.
   - Enviar al backend en el body de `POST /activities`.
3. **Endpoint `POST /activities`** ([activityRoutes.ts](backend/src/infrastructure/http/routes/activityRoutes.ts)):
   - Aceptar `streams` opcional, validar tamaño máximo (p. ej. 20 000 puntos) y persistirlo.
4. **Sync Strava** ([SyncStravaUseCase.ts](backend/src/application/strava/SyncStravaUseCase.ts)):
   - Llamar a `GET /activities/{id}/streams?keys=time,latlng,altitude,heartrate,cadence&key_by_type=true` y volcar a `streams_json`.
5. **Builder GPX**: si hay `streams_json`, emitir un `<trkpt>` por punto con `<ele>`, `<time>` y `<extensions><gpxtpx:TrackPointExtension>` (HR + cadencia).
6. **Backfill** opcional vía script para actividades ya sincronizadas.

### Criterios de aceptación Fase 2

- [ ] Una actividad importada vía GPX se exporta de vuelta a un GPX comparable (round-trip).
- [ ] Una actividad sincronizada de Strava se exporta con todos los trackpoints, HR y cadencia.

## 5. Orden de trabajo sugerido

1. Backend Fase 1: builder + caso de uso + tests unit.
2. Backend Fase 1: rutas + tests de endpoint + dep `archiver`.
3. Frontend Fase 1: API + helper de descarga.
4. Frontend Fase 1: refactor `ActivitiesPage` con modo selección + tests.
5. QA manual end-to-end (importar un GPX → exportarlo → comparar).
6. (Opcional, PR separado) Fase 2 — persistencia de streams.

## 6. Notas técnicas

- Limitar `ids.length` en el endpoint batch para evitar abuso (zod `.max(200)`).
- No exponer `athleteId` en la URL del export: derivar del JWT.
- Para el zip: stream a la respuesta (no buffer en memoria) → `archiver.pipe(res)`.
- Slugify simple: minúsculas, sin acentos (`String.prototype.normalize('NFD').replace(/[\u0300-\u036f]/g,'')`), reemplazar no `[a-z0-9]+` por `-`.
- Escapar XML: `& < > " '` (helper inline; evitar dep nueva si no hace falta).
- i18n: textos en español, coherentes con el resto de la app ("Exportar", "Seleccionar todas", "Descargar GPX", "Cancelar").
