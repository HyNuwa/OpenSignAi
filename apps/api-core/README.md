# API Core - OpenSign Enterprise

Backend en Python + FastAPI.

## Comunicación principal

- **WebSockets** en `/ws/kiosk` para el canal de tiempo real con el kiosco.
- **REST** limitado a health checks y operaciones de configuración.

## Arranque

```bash
# Instalar dependencias
pip install -r requirements.txt

# Desarrollo con recarga
pnpm run dev
```

El servicio se expone en `http://localhost:8000`.
