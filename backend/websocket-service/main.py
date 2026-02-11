"""
WebSocket Service - Handles real-time connections.
This is a basic placeholder - you'll build the full implementation.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="WebSocket Service", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active connections
active_connections: list[WebSocket] = []


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "websocket"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time communication.
    TODO: Add authentication, room management, and event broadcasting.
    """
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            # Broadcast to all connected clients (simple echo for now)
            for connection in active_connections:
                await connection.send_text(f"Echo: {data}")
    
    except WebSocketDisconnect:
        active_connections.remove(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
