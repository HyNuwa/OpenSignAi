import asyncio
import logging
import os
import sys

import grpc
from fastapi import FastAPI

_SRC_DIR = os.path.dirname(os.path.abspath(__file__))
if _SRC_DIR not in sys.path:
    sys.path.insert(0, _SRC_DIR)

from protos import sign_interpreter_pb2, sign_interpreter_pb2_grpc  # noqa: E402

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-core")

app = FastAPI(title="OpenSign AI Core")

GRPC_PORT = 50051


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-core"}


class SignInterpreterServicer(sign_interpreter_pb2_grpc.SignInterpreterServicer):
    async def Interpret(self, request, context):
        left = request.left_hand
        right = request.right_hand
        total_lm = len(left.landmarks) + len(right.landmarks)
        confidence = (left.confidence + right.confidence) / 2.0

        logger.info(
            f"Interpret → L:{len(left.landmarks)}pts R:{len(right.landmarks)}pts "
            f"conf:{confidence:.2f} ts:{request.timestamp}"
        )

        return sign_interpreter_pb2.Interpretation(
            text="Interpretación remota (gRPC)",
            confidence=confidence or 0.5,
            gloss="GRPC-INTERPRETACION",
        )


async def serve_grpc():
    server = grpc.aio.server()
    sign_interpreter_pb2_grpc.add_SignInterpreterServicer_to_server(
        SignInterpreterServicer(), server
    )
    server.add_insecure_port(f"[::]:{GRPC_PORT}")
    await server.start()
    logger.info(f"gRPC server listening on :{GRPC_PORT}")
    await server.wait_for_termination()


@app.on_event("startup")
async def start_grpc():
    asyncio.create_task(serve_grpc())
