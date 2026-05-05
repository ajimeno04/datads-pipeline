# datads-pipeline

DatAds take-home: pipeline de métricas de anuncios (ingestión mock + API Express + SQLite).

## Requisitos

- Node.js 20+

## Instalación

```bash
cd datads-pipeline
npm install
```

## Ingestión on-demand

Últimos 30 días hacia `./data.db`:

```bash
npm run fetch
```

## Servidor de desarrollo (API en puerto 3000)

```bash
npm run dev
```

## Scripts

| Script        | Descripción                          |
| ------------- | ------------------------------------ |
| `npm run dev` | `tsx watch src/main.ts`              |
| `npm run build` | Compila TypeScript a `dist/`      |
| `npm start`   | Ejecuta `node dist/main.js`          |
| `npm run fetch` | Ingesta y sale (`tsx src/main.ts fetch`) |
| `npm test`    | Vitest en modo run                   |
| `npm run test:watch` | Vitest watch                  |

## Endpoints

- `GET /api/performance` — query opcional: `platform`, `date_from`, `date_to`, `campaign_id`
- `GET /api/top-performing` — query requerido: `metric` (`ctr` \| `cpc` \| `roas` \| `clicks` \| `revenue`); opcional: `order`, `limit`, mismos filtros que performance
