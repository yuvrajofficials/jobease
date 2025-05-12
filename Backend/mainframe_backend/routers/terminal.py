# terminal_router.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio

router = APIRouter(prefix="/api/terminal", tags=["Terminal"])

@router.websocket("/ws")
async def terminal_websocket(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Receive the command from the frontend
            command = await websocket.receive_text()

            # Prefix the command with 'zowe ' to ensure it's sent to z/OS
            full_command = f"{command}"

            # Execute the Zowe CLI command
            process = await asyncio.create_subprocess_shell(
                full_command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            stdout, stderr = await process.communicate()

            # Send stdout and stderr back to the client
            if stdout:
                await websocket.send_text(stdout.decode())
            if stderr:
                await websocket.send_text(stderr.decode())

    except WebSocketDisconnect:
        print("🔌 WebSocket disconnected")

    except Exception as e:
        await websocket.send_text(f"❌ Error: {str(e)}")
