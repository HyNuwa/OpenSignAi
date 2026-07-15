# OpenSign Enterprise

Monorepositorio Turborepo + pnpm para la plataforma de accesibilidad LSA del sector bancario.

## Stack

- `apps/kiosk-web`: Next.js 14 App Router + TailwindCSS
- `apps/api-core`: NestJS + Socket.io
- `apps/ai-core`: Python (FastAPI placeholder para inferencia gRPC)
- `packages/shared-types`: DTOs TS con class-validator/class-transformer
- `packages/ui`: Componentes React compartidos

## Comunicación

- `kiosk-web` ↔ `api-core`: WebSocket vía Socket.io (canal principal en tiempo real).
- `api-core` ↔ `ai-core`: gRPC (placeholder listo para inferencia pesada).

## Arranque

```bash
pnpm install
pnpm run dev
```

- Kiosco: http://localhost:3000
- API Core: http://localhost:4000
- AI Core: http://localhost:5000
