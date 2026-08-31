import asyncio
from typing import AsyncGenerator, Dict, List, Optional
import json

class SSEManager:
    def __init__(self):
        self.connections: Dict[str, List[asyncio.Queue]] = {}

    async def subscribe(self, kb_id: str) -> asyncio.Queue:
        if kb_id not in self.connections:
            self.connections[kb_id] = []
        queue = asyncio.Queue()
        self.connections[kb_id].append(queue)
        return queue

    async def unsubscribe(self, kb_id: str, queue: asyncio.Queue):
        if kb_id in self.connections and queue in self.connections[kb_id]:
            self.connections[kb_id].remove(queue)
            if not self.connections[kb_id]:
                del self.connections[kb_id]

    async def broadcast(self, kb_id: str, event: dict):
        if kb_id in self.connections:
            for queue in self.connections[kb_id]:
                await queue.put(event)

    async def event_generator(self, kb_id: str, queue: asyncio.Queue) -> AsyncGenerator[str, None]:
        try:
            while True:
                event = await queue.get()
                yield f"data: {json.dumps(event)}\n\n"
        except asyncio.CancelledError:
            await self.unsubscribe(kb_id, queue)


_global_sse_manager: Optional[SSEManager] = None


def get_sse_manager() -> SSEManager:
    """Get or create the global singleton SSEManager."""
    global _global_sse_manager
    if _global_sse_manager is None:
        _global_sse_manager = SSEManager()
    return _global_sse_manager
