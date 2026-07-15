from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI(title="OpenSign Enterprise - API Core")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "api-core"}


@app.websocket("/ws/kiosk")
async def kiosk_websocket(websocket: WebSocket):
    await websocket.accept()
    try:
        await websocket.send_text(
            json.dumps({"type": "welcome", "payload": "Conexión establecida con api-core"})
        )
        while True:
            message = await websocket.receive_text()
            data = json.loads(message)
            await websocket.send_text(
                json.dumps({"type": "ack", "payload": data})
            )
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.close(code=1011, reason=str(e))
