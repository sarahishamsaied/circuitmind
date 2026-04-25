from __future__ import annotations

import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.circuit_agent import CircuitAgent
from app.db.session import AsyncSessionLocal
from app.services.circuit_service import CircuitService
import redis.asyncio as aioredis
from app.config import settings

router = APIRouter()


@router.websocket("/ws/projects/{project_id}")
async def circuit_websocket(websocket: WebSocket, project_id: str) -> None:
    await websocket.accept()

    async def send(msg: dict) -> None:
        try:
            await websocket.send_json(msg)
        except Exception:
            pass

    async with AsyncSessionLocal() as db:
        redis = aioredis.from_url(settings.redis_url, decode_responses=True)
        circuit_service = CircuitService(db, redis)
        ir = await circuit_service.get_or_create_ir(project_id)

        agent = CircuitAgent(
            project_id=project_id,
            initial_ir=ir,
            ws_sender=send,
        )

        # Send current state immediately on connect
        await send({"type": "ir_complete", "circuit": ir.model_dump(by_alias=True)})

        try:
            while True:
                raw = await websocket.receive_text()
                try:
                    data = json.loads(raw)
                except json.JSONDecodeError:
                    await send({"type": "error", "message": "Invalid JSON"})
                    continue

                msg_type = data.get("type")

                if msg_type == "generate":
                    prompt = data.get("prompt", "").strip()
                    if prompt:
                        await agent.run(prompt)
                    else:
                        await send({"type": "error", "message": "Prompt cannot be empty"})

                elif msg_type == "undo":
                    await agent.undo()

                elif msg_type == "reset":
                    await agent.reset()

                elif msg_type == "save":
                    saved = await circuit_service.save_ir(
                        project_id,
                        agent.get_ir(),
                        agent.get_conversation_history(),
                    )
                    await send({"type": "agent_message", "text": f"Circuit saved (version {saved.version})."})

                else:
                    await send({"type": "error", "message": f"Unknown message type: {msg_type}"})

        except WebSocketDisconnect:
            # Auto-save on disconnect
            try:
                await circuit_service.save_ir(
                    project_id,
                    agent.get_ir(),
                    agent.get_conversation_history(),
                )
            except Exception:
                pass
        finally:
            await redis.aclose()
