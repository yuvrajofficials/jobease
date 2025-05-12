from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import subprocess
import asyncio
from fastapi import APIRouter



router = APIRouter(prefix="/api/terminal", tags=["Terminal"])


@router.websocket("/ws/terminal")
async def terminal_websocket(websocket: WebSocket):
    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_text()

            # You may sanitize or validate allowed Zowe commands here
            process = await asyncio.create_subprocess_shell(
                data,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            stdout, stderr = await process.communicate()

            if stdout:
                await websocket.send_text(stdout.decode())
            if stderr:
                await websocket.send_text(stderr.decode())

    except WebSocketDisconnect:
        print("WebSocket disconnected")

    except Exception as e:
        await websocket.send_text(f"Error: {str(e)}")
