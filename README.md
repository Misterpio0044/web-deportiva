# web-deportiva

Web orientada a la importanción de datos de la plataforma Strava y su análisis.

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React + TypeScript (Vite) |
| Backend | Node.js + TypeScript (Express) |
| Base de datos | PostgreSQL |
| Arquitectura | Hexagonal + DDD |
| Metodología UI | Atomic Design |

## Estructura del proyecto

```
web-deportiva/
├── frontend/          # React + TypeScript (Vite)
│   └── src/
│       ├── domain/          # Modelos e interfaces (puertos)
│       ├── application/     # Casos de uso
│       ├── infrastructure/  # Adaptadores HTTP
│       └── ui/              # Componentes (Atomic Design)
│           ├── atoms/
│           ├── molecules/
│           ├── organisms/
│           ├── templates/
│           └── pages/
├── backend/           # Node.js + TypeScript (Express)
│   └── src/
│       ├── domain/          # Modelos y repositorios (puertos)
│       ├── application/     # Casos de uso
│       ├── infrastructure/  # Adaptadores (PostgreSQL, HTTP, Strava)
│       └── shared/          # Tipos compartidos
├── docker-compose.yml # Entorno de desarrollo (PostgreSQL)
└── README.md
```

## Inicio rápido

### Requisitos

- Node.js 20+
- Docker & Docker Compose

### 1. Base de datos

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # Edita con tus credenciales de Strava y BD
npm install
npm run dev
```

El servidor arranca en `http://localhost:3000`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

La app arranca en `http://localhost:5173`.

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Estado del servidor |
| GET | `/api/activities?athleteId=<id>` | Lista de actividades de un atleta |
| GET | `/api/activities/:id` | Detalle de una actividad |

## Arquitectura hexagonal

La lógica de negocio (`domain`) no depende de frameworks ni de la base de datos.
Los adaptadores (`infrastructure`) implementan los puertos (`domain/repositories`)
definidos en el núcleo, siguiendo el principio de inversión de dependencias (SOLID).
