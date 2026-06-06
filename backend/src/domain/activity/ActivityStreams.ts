/**
 * Traza GPS y series temporales de una actividad, reconstruidas a partir de los
 * streams de Strava (GET /activities/{id}/streams).
 *
 * Se almacena en la columna `streams_json` de la tabla `activities` y se usa para
 * generar un GPX completo y reimportable en el momento de la exportación.
 *
 * `time` son offsets en segundos desde el inicio de la actividad; el tiempo
 * absoluto de cada punto se calcula como `startDate + time[i]`.
 *
 * Cuando una actividad no tiene GPS (cinta, indoor) se guarda un centinela con
 * `hasGps: false` para no volver a pedir los streams a Strava en cada exportación.
 */
export interface ActivityStreams {
  /** ISO timestamp del momento en que se descargaron/cachearon los streams. */
  fetchedAt: string;
  /** Indica si la actividad tiene traza GPS utilizable. */
  hasGps: boolean;
  /** Offsets en segundos desde el inicio, alineados por índice con el resto. */
  time?: number[];
  /** Pares [lat, lon] por punto. */
  latlng?: [number, number][];
  /** Altitud en metros por punto. */
  altitude?: number[];
  /** Frecuencia cardíaca en bpm por punto. */
  heartrate?: number[];
  /** Cadencia (una pierna) por punto. */
  cadence?: number[];
}
