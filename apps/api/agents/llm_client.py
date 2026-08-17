"""
Shared LLM client for the Astrophage KB pipeline.

All agents (ingestor, compiler, gatekeeper, rollup) import from here
instead of duplicating LLM boilerplate.

Key design points:
- Singleton: one instance shared across the process.
- google-genai: uses the new google.genai SDK (replaces deprecated google-generativeai).
  A single genai.Client is created once and reused — no repeated configure() calls.
  client.aio.models.generate_content() is natively async.
- httpx.AsyncClient for Ollama is kept alive with connection pooling.
- `force_mode` lets hybrid routing override the global AI_MODE per call:
    None      -> use settings.AI_MODE (or "remote" if AI_MODE == "hybrid" and no override)
    "local"   -> always Gemma / Ollama
    "remote"  -> always Gemini Flash
"""

import asyncio
import logging
from typing import Literal, Optional

import httpx

from ..core.config import settings

logger = logging.getLogger(__name__)

ForceMode = Optional[Literal["local", "remote"]]


class LLMClient:
    """Thread-safe (asyncio) singleton that wraps both local and remote LLMs."""

    def __init__(self) -> None:
        self._gemini_client = None                       # google.genai.Client — created once
        self._ollama_client: Optional[httpx.AsyncClient] = None  # keepalive

    # ── Mode resolution ─────────────────────────────────────────────────────

    def _effective_mode(self, force_mode: ForceMode) -> Literal["local", "remote"]:
        """Resolve the effective mode for a single call.

        - hybrid + no force_mode  → "remote" (safe default)
        - hybrid + force_mode     → honour force_mode
        - local / remote          → use settings.AI_MODE unless force_mode overrides
        """
        if force_mode is not None:
            return force_mode
        if settings.AI_MODE in ("local", "remote"):
            return settings.AI_MODE
        return "remote"   # hybrid default

    # ── Client accessors ────────────────────────────────────────────────────

    def _get_gemini_client(self):
        """Return the cached google.genai.Client, creating it once."""
        if self._gemini_client is None:
            try:
                from google import genai
                self._gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
                logger.debug("Gemini client initialised (google-genai SDK)")
            except Exception as e:
                logger.error(f"Failed to initialise Gemini client: {e}")
                raise
        return self._gemini_client

    async def _get_ollama_client(self) -> httpx.AsyncClient:
        """Return the long-lived httpx client for Ollama."""
        if self._ollama_client is None or self._ollama_client.is_closed:
            self._ollama_client = httpx.AsyncClient(
                base_url=settings.GEMMA_OLLAMA_URL,
                timeout=None,
                limits=httpx.Limits(max_connections=4, max_keepalive_connections=2),
            )
        return self._ollama_client

    # ── Public interface ────────────────────────────────────────────────────

    async def generate(
        self,
        prompt: str,
        system: str = "",
        force_json: bool = False,
        force_mode: ForceMode = None,
        num_ctx_override: Optional[int] = None,
    ) -> str:
        """Generate a response from the appropriate LLM.

        Args:
            prompt:           User/task prompt.
            system:           System instruction. Prepended inline for Ollama;
                              passed as system_instruction in GenerateContentConfig
                              for Gemini.
            force_json:       Request structured JSON output.
            force_mode:       Override AI_MODE for this call ("local" or "remote").
                              Essential for hybrid per-task routing.
            num_ctx_override: Ollama-only — override num_ctx for this call.
        """
        mode = self._effective_mode(force_mode)
        if mode == "local":
            return await self._generate_local(prompt, system, force_json, num_ctx_override)
        return await self._generate_remote(prompt, system, force_json)

    async def generate_batch(
        self,
        items: list,
        semaphore_limit: int = 8,
        force_mode: ForceMode = None,
    ) -> list:
        """Run multiple generate() calls concurrently with a semaphore cap.

        Args:
            items:           List of dicts. Required key: "prompt".
                             Optional keys: "system", "force_json", "num_ctx_override".
            semaphore_limit: Max concurrent LLM calls (prevents 429 storms for Gemini).
            force_mode:      Passed through to every generate() call.
        """
        sem = asyncio.Semaphore(semaphore_limit)

        async def _guarded(item: dict) -> str:
            async with sem:
                return await self.generate(
                    prompt=item["prompt"],
                    system=item.get("system", ""),
                    force_json=item.get("force_json", False),
                    force_mode=force_mode,
                    num_ctx_override=item.get("num_ctx_override"),
                )

        return list(await asyncio.gather(*[_guarded(item) for item in items]))

    async def close(self) -> None:
        """Close long-lived connections (call on application shutdown)."""
        if self._ollama_client and not self._ollama_client.is_closed:
            await self._ollama_client.aclose()

    # ── Private: Ollama ─────────────────────────────────────────────────────

    async def _generate_local(
        self,
        prompt: str,
        system: str,
        force_json: bool,
        num_ctx_override: Optional[int],
    ) -> str:
        client = await self._get_ollama_client()
        full_prompt = f"{system}\n\n{prompt}" if system else prompt
        num_ctx = num_ctx_override or 16384

        payload: dict = {
            "model": settings.GEMMA_MODEL,
            "prompt": full_prompt,
            "stream": False,
            "options": {"num_ctx": num_ctx},
        }
        if force_json:
            payload["format"] = "json"

        for attempt in range(3):
            try:
                response = await client.post("/api/generate", json=payload)
                if response.status_code == 200:
                    return response.json().get("response", "")
                logger.error(f"Ollama error {response.status_code}: {response.text}")
                return ""
            except (httpx.ReadTimeout, httpx.ConnectError) as e:
                if attempt < 2:
                    wait = 2 ** attempt
                    logger.warning(f"Ollama connection error (attempt {attempt+1}), retrying in {wait}s: {e}")
                    await asyncio.sleep(wait)
                else:
                    logger.error(f"Ollama failed after 3 attempts: {e}")
                    return ""
        return ""

    # ── Private: Gemini (google-genai SDK) ──────────────────────────────────

    async def _generate_remote(
        self,
        prompt: str,
        system: str,
        force_json: bool,
    ) -> str:
        """Call Gemini using the google-genai SDK via the natively-async client.aio interface."""
        from google.genai import types

        client = self._get_gemini_client()

        # Both system_instruction and response_mime_type live in GenerateContentConfig
        config_kwargs: dict = {}
        if system:
            config_kwargs["system_instruction"] = system
        if force_json:
            config_kwargs["response_mime_type"] = "application/json"
        config = types.GenerateContentConfig(**config_kwargs) if config_kwargs else None

        for attempt in range(4):
            try:
                response = await client.aio.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                    config=config,
                )
                return response.text or ""
            except Exception as e:
                err_str = str(e)
                is_rate_limit = any(tok in err_str for tok in ("429", "RESOURCE_EXHAUSTED", "quota"))
                is_transient  = any(tok in err_str for tok in ("503", "UNAVAILABLE", "DNS", "timeout"))
                if (is_rate_limit or is_transient) and attempt < 3:
                    wait = 15 * (attempt + 1)
                    logger.warning(f"Gemini transient error (attempt {attempt+1}), waiting {wait}s: {e}")
                    await asyncio.sleep(wait)
                else:
                    logger.error(f"Gemini generation failed: {e}")
                    raise
        return ""


# Module-level singleton — import this everywhere
llm_client = LLMClient()
