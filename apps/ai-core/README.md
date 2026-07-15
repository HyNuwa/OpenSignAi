# AI Core - OpenSign Enterprise

Servicio Python para inferencia de visión/LSA.

## Comunicación

- `api-core` se comunicará con este servicio mediante **gRPC**.
- El frontend (`kiosk-web`) **nunca** se conecta directamente aquí.

## Arranque

```bash
pip install -r requirements.txt
pnpm run dev
```

El servicio se expone en `http://localhost:5000`.
