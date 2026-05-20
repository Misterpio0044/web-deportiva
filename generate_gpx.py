"""
Generador de archivos GPX realistas para perfil Strava falso.
Simula las actividades de un corredor promedio en Madrid durante ~1 año.
"""

import math
import random
import os
from datetime import datetime, timedelta

random.seed(42)

# ─── Parámetros generales ─────────────────────────────────────────────────────
OUTPUT_DIR = "strava_gpx_data"
FOLDER_1 = os.path.join(OUTPUT_DIR, "temporada_1_ene_jun_2024")
FOLDER_2 = os.path.join(OUTPUT_DIR, "temporada_2_jul_dic_2024")

# Zonas de Madrid con coordenadas base para variar rutas
ZONES = [
    {"name": "retiro",      "lat": 40.4153, "lon": -3.6844, "elev_base": 655},
    {"name": "casa_campo",  "lat": 40.4200, "lon": -3.7475, "elev_base": 640},
    {"name": "madrid_rio",  "lat": 40.4060, "lon": -3.7150, "elev_base": 590},
    {"name": "el_pardo",    "lat": 40.5100, "lon": -3.7800, "elev_base": 700},
    {"name": "dehesa_villa","lat": 40.4650, "lon": -3.7350, "elev_base": 690},
    {"name": "moratalaz",   "lat": 40.4020, "lon": -3.6430, "elev_base": 660},
]

# Plantillas de entrenamiento con probabilidades
WORKOUT_TYPES = [
    {"label": "rodaje_suave",     "dist_range": (5, 8),    "pace_range": (5.8, 7.0),  "weight": 35},
    {"label": "rodaje_medio",     "dist_range": (8, 12),   "pace_range": (5.2, 6.2),  "weight": 25},
    {"label": "tirada_larga",     "dist_range": (14, 21),  "pace_range": (5.5, 6.5),  "weight": 15},
    {"label": "series",           "dist_range": (6, 9),    "pace_range": (4.5, 5.5),  "weight": 15},
    {"label": "regenerativo",     "dist_range": (4, 6),    "pace_range": (6.5, 8.0),  "weight": 10},
]


def weighted_choice(options):
    weights = [o["weight"] for o in options]
    return random.choices(options, weights=weights, k=1)[0]


def generate_activity_dates(start: datetime, n: int, rest_days_avg: int = 2) -> list:
    """Genera n fechas de actividad con descansos realistas entre ellas."""
    dates = []
    current = start
    while len(dates) < n:
        # Hora de salida: mañana temprano o tarde
        if random.random() < 0.65:
            hour = random.randint(7, 9)     # mañana
        else:
            hour = random.randint(18, 20)   # tarde
        minute = random.randint(0, 59)
        run_date = current.replace(hour=hour, minute=minute, second=0, microsecond=0)
        dates.append(run_date)
        # Días hasta la siguiente salida (1-4 días, con tendencia a 2)
        gap = random.choices([1, 2, 3, 4], weights=[20, 40, 30, 10])[0]
        current += timedelta(days=gap)
    return dates


def haversine_bearing(lat1, lon1, lat2, lon2):
    """Bearing inicial entre dos puntos."""
    dlon = math.radians(lon2 - lon1)
    lat1_r = math.radians(lat1)
    lat2_r = math.radians(lat2)
    x = math.sin(dlon) * math.cos(lat2_r)
    y = math.cos(lat1_r) * math.sin(lat2_r) - math.sin(lat1_r) * math.cos(lat2_r) * math.cos(dlon)
    return math.atan2(x, y)


def move_point(lat, lon, bearing_rad, distance_m):
    """Desplaza un punto dado bearing y distancia en metros."""
    R = 6371000.0
    d_over_r = distance_m / R
    lat1 = math.radians(lat)
    lon1 = math.radians(lon)
    lat2 = math.asin(
        math.sin(lat1) * math.cos(d_over_r)
        + math.cos(lat1) * math.sin(d_over_r) * math.cos(bearing_rad)
    )
    lon2 = lon1 + math.atan2(
        math.sin(bearing_rad) * math.sin(d_over_r) * math.cos(lat1),
        math.cos(d_over_r) - math.sin(lat1) * math.sin(lat2),
    )
    return math.degrees(lat2), math.degrees(lon2)


def generate_route_points(zone: dict, distance_km: float, avg_pace_min_km: float, start_time: datetime):
    """
    Genera la lista de trackpoints de una ruta en bucle.
    Devuelve lista de dicts {lat, lon, ele, time, hr, cadence}.
    """
    # Intervalo entre puntos: 5 segundos
    interval_sec = 5
    speed_m_s = 1000.0 / (avg_pace_min_km * 60.0)
    dist_per_interval = speed_m_s * interval_sec          # metros por punto
    total_points = int((distance_km * 1000) / dist_per_interval)

    lat = zone["lat"] + random.uniform(-0.002, 0.002)
    lon = zone["lon"] + random.uniform(-0.002, 0.002)
    elev = zone["elev_base"] + random.uniform(-10, 10)

    # Parámetros de la ruta en bucle (harmónicos superpuestos)
    amp1 = random.uniform(0.003, 0.008)   # amplitud del lazo principal
    amp2 = random.uniform(0.001, 0.003)   # ondulaciones secundarias
    freq2 = random.randint(3, 6)
    phase1 = random.uniform(0, 2 * math.pi)
    phase2 = random.uniform(0, 2 * math.pi)
    elev_amp = random.uniform(8, 25)      # variación de elevación
    elev_freq = random.uniform(2, 5)

    # FC base y variación
    hr_base = random.randint(140, 162)
    hr_noise = 0.0

    points = []
    current_time = start_time

    for i in range(total_points):
        t = i / total_points  # 0..1 (progreso de la ruta)
        angle = 2 * math.pi * t + phase1

        # Posición: bucle ovalado con irregularidades
        dlat = amp1 * math.sin(angle) + amp2 * math.sin(freq2 * angle + phase2)
        dlon = amp1 * 1.3 * math.cos(angle) + amp2 * math.cos(freq2 * angle + phase2)

        p_lat = lat + dlat
        p_lon = lon + dlon

        # Elevación: sube y baja suavemente
        ele = elev + elev_amp * math.sin(elev_freq * math.pi * t)
        ele += random.gauss(0, 1.2)   # ruido GPS realista

        # FC: correlaciona con esfuerzo (cuesta arriba → sube)
        elev_gradient = elev_amp * elev_freq * math.pi * math.cos(elev_freq * math.pi * t)
        hr_noise = hr_noise * 0.97 + random.gauss(0, 1.5) * 0.03
        hr = int(hr_base + elev_gradient * 0.15 + hr_noise + random.gauss(0, 2))
        hr = max(100, min(185, hr))

        # Cadencia: 160-180 spm con variación pequeña
        cadence = int(random.gauss(170, 4))
        cadence = max(155, min(185, cadence))

        points.append({
            "lat": round(p_lat, 6),
            "lon": round(p_lon, 6),
            "ele": round(ele, 1),
            "time": current_time,
            "hr": hr,
            "cadence": cadence,
        })
        current_time += timedelta(seconds=interval_sec)

    return points


def format_gpx_time(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def build_gpx(points: list, activity_name: str) -> str:
    """Construye el contenido XML del archivo GPX con extensiones Garmin."""
    lines = []
    lines.append('<?xml version="1.0" encoding="UTF-8"?>')
    lines.append('<gpx version="1.1" creator="Garmin Connect"')
    lines.append('  xmlns="http://www.topografix.com/GPX/1/1"')
    lines.append('  xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"')
    lines.append('  xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3">')
    lines.append(f'  <metadata><name>{activity_name}</name><time>{format_gpx_time(points[0]["time"])}</time></metadata>')
    lines.append('  <trk>')
    lines.append(f'    <name>{activity_name}</name>')
    lines.append('    <type>running</type>')
    lines.append('    <trkseg>')

    for p in points:
        lines.append(f'      <trkpt lat="{p["lat"]}" lon="{p["lon"]}">')
        lines.append(f'        <ele>{p["ele"]}</ele>')
        lines.append(f'        <time>{format_gpx_time(p["time"])}</time>')
        lines.append('        <extensions>')
        lines.append('          <gpxtpx:TrackPointExtension>')
        lines.append(f'            <gpxtpx:hr>{p["hr"]}</gpxtpx:hr>')
        lines.append(f'            <gpxtpx:cad>{p["cadence"]}</gpxtpx:cad>')
        lines.append('          </gpxtpx:TrackPointExtension>')
        lines.append('        </extensions>')
        lines.append('      </trkpt>')

    lines.append('    </trkseg>')
    lines.append('  </trk>')
    lines.append('</gpx>')
    return "\n".join(lines)


def generate_activities(folder: str, n: int, start_date: datetime):
    os.makedirs(folder, exist_ok=True)
    dates = generate_activity_dates(start_date, n)

    # Registrar resumen para referencia
    summary_lines = ["archivo,fecha,distancia_km,ritmo_min_km,duracion_min,zona,tipo"]

    for i, run_date in enumerate(dates, 1):
        workout = weighted_choice(WORKOUT_TYPES)
        zone = random.choice(ZONES)
        dist_km = round(random.uniform(*workout["dist_range"]), 2)
        # Ritmo varía un poco respecto al rango del tipo de entrenamiento
        avg_pace = round(random.uniform(*workout["pace_range"]), 2)
        duration_min = round(dist_km * avg_pace, 1)

        activity_name = (
            f"{workout['label'].replace('_', ' ').title()} "
            f"- {zone['name'].replace('_', ' ').title()} "
            f"({dist_km:.1f}km)"
        )

        points = generate_route_points(zone, dist_km, avg_pace, run_date)

        filename = f"{i:02d}_{run_date.strftime('%Y-%m-%d')}_{workout['label']}_{dist_km:.1f}km.gpx"
        filepath = os.path.join(folder, filename)

        gpx_content = build_gpx(points, activity_name)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(gpx_content)

        summary_lines.append(
            f"{filename},"
            f"{run_date.strftime('%Y-%m-%d %H:%M')},"
            f"{dist_km},"
            f"{avg_pace},"
            f"{duration_min},"
            f"{zone['name']},"
            f"{workout['label']}"
        )
        print(f"  [{i:02d}/25] {filename}")

    # Guardar CSV resumen
    summary_path = os.path.join(folder, "_resumen.csv")
    with open(summary_path, "w", encoding="utf-8") as f:
        f.write("\n".join(summary_lines))
    print(f"\n  Resumen guardado en: {summary_path}")


# ─── Main ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print(f"\n{'='*60}")
    print("  Generando TEMPORADA 1: Enero – Junio 2024")
    print(f"{'='*60}")
    generate_activities(FOLDER_1, 25, datetime(2024, 1, 8, 0, 0, 0))

    print(f"\n{'='*60}")
    print("  Generando TEMPORADA 2: Julio – Diciembre 2024")
    print(f"{'='*60}")
    generate_activities(FOLDER_2, 25, datetime(2024, 7, 3, 0, 0, 0))

    print(f"\n{'='*60}")
    total_files = 50
    print(f"  LISTO — {total_files} archivos GPX generados en: {OUTPUT_DIR}/")
    print(f"{'='*60}\n")
