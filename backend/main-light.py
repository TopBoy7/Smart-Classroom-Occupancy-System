import os
import logging
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import List

from fastapi import (
    FastAPI, HTTPException,
    UploadFile, File, Form,
    WebSocket, WebSocketDisconnect
)
from fastapi.middleware.cors import CORSMiddleware

import httpx
from dotenv import load_dotenv

# your existing modules (same as in your main app)
import database, models, schemas, env

# load .env (optional)
load_dotenv()

# -------------------------------------------------------
# CONFIG
# -------------------------------------------------------
HEAVY_BACKEND_URL = os.getenv("HEAVY_BACKEND_URL", "http://51.107.0.26").rstrip("/")
# e.g. "http://51.107.0.26"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smart-classroom-proxy")


# -------------------------------------------------------
# HELPERS
# -------------------------------------------------------
def serialize(obj):
    """Serialize datetimes and nested structures for JSON broadcasting."""
    if isinstance(obj, dict):
        return {k: serialize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [serialize(v) for v in obj]
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj


class ConnectionManager:
    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)
        logger.info("WS connected: total=%d", len(self.active))

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)
            logger.info("WS disconnected: total=%d", len(self.active))

    async def broadcast(self, data: dict):
        logger.info("Broadcasting %s to %d clients", data.get("event"), len(self.active))
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(data)
            except Exception as e:
                logger.exception("WS send failed: %s", e)
                dead.append(ws)

        for ws in dead:
            self.disconnect(ws)
        logger.info("Broadcast complete. active=%d dead=%d", len(self.active), len(dead))


manager = ConnectionManager()


# -------------------------------------------------------
# APP
# -------------------------------------------------------
app = FastAPI(title="Smart Classroom (lightweight proxy)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------------------------------------
# WEBSOCKET ENDPOINT
# -------------------------------------------------------
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            try:
                text = await ws.receive_text()
                logger.info("Received from client WS: %s", text)
            except WebSocketDisconnect:
                raise
            except Exception as e:
                logger.exception("Error receiving from WS: %s", e)
                break
    except WebSocketDisconnect:
        manager.disconnect(ws)
    except Exception:
        logger.exception("WS handler error")
        manager.disconnect(ws)


# -------------------------------------------------------
# CRUD ENDPOINTS (same behavior as your main app)
# -------------------------------------------------------
@app.post("/classrooms", response_model=schemas.ResponseModel)
async def create_classroom(req: schemas.CreateClassroomRequest):
    existing = await database.get_classroom_by_classId(req.classId)
    if existing:
        raise HTTPException(409, "classId already exists")

    classroom = models.Classroom(**req.model_dump())
    inserted_id = await database.add_classroom(classroom)

    return {
        "success": True,
        "message": "classroom created",
        "data": {"id": inserted_id}
    }


@app.get("/classrooms", response_model=schemas.ResponseModel)
async def get_classrooms():
    docs = await database.list_classrooms()
    return {
        "success": True,
        "message": "ok",
        "data": {"classrooms": [d.model_dump() for d in docs]}
    }


@app.get("/classrooms/{classId}", response_model=schemas.ResponseModel)
async def get_classroom(classId: str):
    doc = await database.get_classroom_by_classId(classId)
    if not doc:
        raise HTTPException(404, "classroom not found")

    return {
        "success": True,
        "message": "ok",
        "data": {"classroom": doc.model_dump()}
    }


@app.put("/classrooms/{classId}", response_model=schemas.ResponseModel)
async def update_classroom(classId: str, req: schemas.UpdateClassroomRequest):
    payload = {k: v for k, v in req.model_dump().items() if v is not None}
    existing = await database.get_classroom_by_classId(classId)
    if not existing:
        raise HTTPException(404, "classroom not found")

    if payload.get("classId") != classId:
        # Check for classId uniqueness
        other = await database.get_classroom_by_classId(payload["classId"])
        if other:
            raise HTTPException(409, "new classId already exists")

    updated = await database.update_classroom_by_classId(classId, payload)

    updated_dict = updated.model_dump()
    if "_id" in updated_dict:
        updated_dict["_id"] = str(updated_dict["_id"])
    for dt_key in ("createdAt", "updatedAt"):
        if dt_key in updated_dict and updated_dict[dt_key] is not None:
            try:
                updated_dict[dt_key] = updated_dict[dt_key].isoformat()
            except Exception:
                pass

    # WebSocket push
    await manager.broadcast(serialize({"event": "classroom_updated", "classroom": updated_dict}))

    return {
        "success": True,
        "message": "updated",
        "data": {"classroom": updated.model_dump()}
    }


@app.delete("/classrooms/{classId}", response_model=schemas.ResponseModel)
async def delete_classroom(classId: str):
    ok = await database.delete_classroom_by_classId(classId)
    if not ok:
        raise HTTPException(404, "classroom not found")

    return {
        "success": True,
        "message": "deleted",
        "data": None
    }


# -------------------------------------------------------
# IMAGE ENDPOINT (FORWARD to HEAVY BACKEND)
# -------------------------------------------------------
@app.post("/classrooms/{classId}/image", response_model=schemas.ResponseModel)
async def upload_image(classId: str, deviceId: str = Form(...), file: UploadFile = File(...)):
    """
    Forward the received image to the heavy backend (HEAVY_BACKEND_URL).
    Only broadcast classroom updates; errors do not trigger broadcast.
    """
    classroom = await database.get_classroom_by_classId(classId)
    if not classroom:
        raise HTTPException(404, "classroom not found")

    if classroom.deviceId != deviceId:
        raise HTTPException(400, "deviceId mismatch")

    contents = await file.read()
    forward_url = f"{HEAVY_BACKEND_URL}/classrooms/{classId}/image"
    logger.info("Forwarding image to heavy backend %s", forward_url)

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            files = {"file": (file.filename or "upload.jpg", contents, file.content_type)}
            data = {"deviceId": deviceId}
            resp = await client.post(forward_url, data=data, files=files)

        resp.raise_for_status()
        resp_json = resp.json()

        # Extract classroom update if present
        classroom_payload = resp_json.get("data", {}).get("classroom")
        if classroom_payload:
            # normalize _id and datetimes
            if "_id" in classroom_payload:
                classroom_payload["_id"] = str(classroom_payload["_id"])
            for dt_key in ("createdAt", "updatedAt"):
                if dt_key in classroom_payload and classroom_payload[dt_key] is not None:
                    if isinstance(classroom_payload[dt_key], datetime):
                        classroom_payload[dt_key] = classroom_payload[dt_key].isoformat()

            # Broadcast only the classroom update
            await manager.broadcast(serialize({
                "event": "classroom_image_update",
                "classroom": classroom_payload
            }))

        return resp_json

    except Exception as e:
        logger.exception("Heavy backend unavailable or error occurred: %s", e)
        # Do NOT broadcast, just return a response indicating the image service is down
        return schemas.ResponseModel(
            success=False,
            message="image analytics server currently unavailable",
            data=None
        ).model_dump()
