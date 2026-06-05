# web-deportiva

Plataforma web para importar tus actividades de **Strava** y analizarlas: dashboards,
estadísticas de material (gear), detalle de actividades y exportación a GPX.

## Stack tecnológico

| Capa           | Tecnología                     |
| -------------- | ------------------------------ |
| Frontend       | React + TypeScript (Vite)      |
| Backend        | Node.js + TypeScript (Express) |
| Base de datos  | PostgreSQL                     |
| Arquitectura   | Hexagonal + DDD                |
| Metodología UI | Atomic Design                  |

## Requisitos

- Node.js 20+
- Docker y Docker Compose
- Una aplicación de Strava (para el login con Strava): https://www.strava.com/settings/api
  - **Authorization Callback Domain**: `localhost`

## Puesta en marcha (local)

### 1. Base de datos

Levanta PostgreSQL con Docker. Las migraciones de `backend/src/infrastructure/database/migrations`
se ejecutan automáticamente al crear el contenedor.

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # Rellena JWT_SECRET y tus credenciales de Strava
npm install
npm run dev
```

El servidor arranca en `http://localhost:3000`.

> Variables principales del `.env` (ver `backend/.env.example`):
> `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`,
> `STRAVA_REDIRECT_URI`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

La app arranca en `http://localhost:5173`.

> El frontend apunta al backend en `http://localhost:3000/api`
> (definido en `src/infrastructure/api/client.ts`). Si cambias el puerto del backend,
> actualiza esa URL.

## Scripts útiles

Desde la raíz del repositorio:

```bash
npm test       # Tests de backend y frontend
npm run lint   # ESLint en backend y frontend
npm run format # Prettier sobre todo el repo
```

En `backend/` y `frontend/` también dispones de `npm test`, `npm run test:watch`
y `npm run test:cov`. El frontend añade `npm run build` para generar la versión de producción.

## API

Base: `http://localhost:3000`

| Método | Ruta                   | Descripción                                  |
| ------ | ---------------------- | -------------------------------------------- |
| GET    | `/`                    | Estado del servidor                          |
| POST   | `/api/auth/register`   | Registro de usuario                          |
| POST   | `/api/auth/login`      | Login (devuelve JWT)                         |
| GET    | `/api/auth/strava/...` | Flujo OAuth de Strava                        |
| GET    | `/api/me`              | Perfil propio (actualizar, cambiar password) |
| GET    | `/api/activities`      | Listar/crear actividades y exportar a GPX    |
| GET    | `/api/dashboard`       | Dashboard del atleta / global (admin)        |
| GET    | `/api/gear`            | Estadísticas de material                     |
| GET    | `/api/athletes`        | Gestión de atletas (solo admin)              |
| POST   | `/api/strava/sync`     | Sincronizar actividades desde Strava         |

La mayoría de rutas requieren la cabecera `Authorization: Bearer <token>`.

## Arquitectura

La lógica de negocio (`domain`) no depende de frameworks ni de la base de datos.
Los adaptadores (`infrastructure`) implementan los puertos (`domain/repositories`)
definidos en el núcleo, siguiendo la inversión de dependencias (SOLID).

```
web-deportiva/
├── frontend/   # React + TypeScript (Vite) · Atomic Design
│   └── src/
│       ├── application/     # Casos de uso de UI
│       ├── infrastructure/  # Cliente HTTP (axios)
│       ├── lib/             # Utilidades (GPX, formatos, descargas)
│       └── ui/              # atoms · molecules · organisms · templates · pages
├── backend/    # Node.js + TypeScript (Express)
│   └── src/
│       ├── domain/          # Modelos y puertos (repositorios)
│       ├── application/     # Casos de uso
│       └── infrastructure/  # Adaptadores: PostgreSQL, HTTP, Strava, GPX
├── docker-compose.yml       # PostgreSQL para desarrollo
└── README.md
```
