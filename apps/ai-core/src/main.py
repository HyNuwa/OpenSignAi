from fastapi import FastAPI

app = FastAPI(title="OpenSign AI Core")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-core"}


@app.post("/interpret")
async def interpret_stub():
    return {
        "text": "Interpretación remota (stub)",
        "confidence": 0.75,
        "gloss": "STUB-INTERPRETACION",
    }
