"""
Shared LLM client for the Astrophage KB pipeline.

All agents (ingestor, compiler, gatekeeper, rollup) import from here
instead of duplicating the httpx / google-generativeai boilerplate.

Key design points:
- Singleton: one instance shared across the process.
- Gemini GenerativeModel is initialised once and reused (no repeated genai.configure).
- httpx.AsyncClient for Ollama is kept alive with connection pooling.
- `force_mode` lets hybrid routing override the global AI_MODE per call:
    None          -> use settings.AI_MODE
    "local"       -> always Gemma / Ollama
    "remote"      -> always Gemini Flash
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
        self._gemini_model = None
        self._ollama_client: Optional[httpx.AsyncClient] = None

    def _effective_mode(self, force_mode: ForceMode) -> Literal["local", "remote"]:
        """Resolve the effective mode for a single call.

        hybrid + no force  -> defaults to remote for safety
        hybrid + force     -> honour force_mode
        local/remote       -> honour settings, force_mode can override
        """
        if force_mode is not None:
            return force_mode
        if settings.AI_MODE in ("local", "remote"):
            return settings.AI_MODE
        return "remote"

    def _get_gemini(self):
        """Return a cached GenerativeModel, initialising once if needed."""
        if self._gemini_model is None:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)
                self._gemini_model = genai.GenerativeModel(settings.GEMINI_MODEL)
            except Exception as e:
                logger.error(f"Failed to initialise Gemini model: {e}")
                raise
        return self._gemini_model

    async def _get_ollama_client(self) -> httpx.AsyncClient:
        """Return a long-lived httpx client for Ollama (connection pooling)."""
        if self._ollama_client is None or self._ollama_client.is_closed:
            self._ollama_client = httpx.AsyncClient(
                base_url=settings.GEMMA_OLLAMA_URL,
                timeout=None,
                limits=httpx.Limits(max_connections=4, max_keepalive_connections=2),
            )
        return self._ollama_client

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
            prompt:           The user/task prompt.
            system:           System instruction (prepended inline for Ollama,
                              used as system_instruction for Gemini).
            force_json:       Request structured JSON output.
            force_mode:       Override the global AI_MODE for this call.
                              Pass "local" or "remote" for hybrid task routing.
            num_ctx_override: Override the Ollama num_ctx for this specific call.
        """
        mode = self._effective_mode(force_mode)
        if mode == "local":
            return await self._generate_local(prompt, system, force_json, num_ctx_override)
        else:
            return await self._generate_remote(prompt, system, force_json)

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
                logger.error(f"Ollama API error {response.status_code}: {response.text}")
                return ""
            except (httpx.ReadTimeout, httpx.ConnectError) as e:
                if attempt < 2:
                    wait = 2 ** attempt
                    logger.warning(
                        f"Ollama connection error (attempt {attempt+1}), "
                        f"retrying in {wait}s: {e}"
                    )
                    await asyncio.sleep(wait)
                else:
                    logger.error(f"Ollama failed after 3 attempts: {e}")
                    return ""
        return ""

    async def _generate_remote(
        self,
        prompt: str,
        system: str,
        force_json: bool,
    ) -> str:
        try:
            import google.generativeai as genai
            if system:
                model = genai.GenerativeModel(
                    settings.GEMINI_MODEL,
                    system_instruction=system,
                )
            else:
                model = self._get_gemini()

            kwargs = {}
            if force_json:
                kwargs["generation_config"] = genai.GenerationConfig(
                    response_mime_type="application/json"
                )

            for attempt in range(4):
                try:
                    res = model.generate_content(prompt, **kwargs)
                    return res.text
                except Exception as e:
                    is_rate_limit = any(
                        tok in str(e) for tok in ("429", "ResourceExhausted", "quota")
                    )
                    if is_rate_limit and attempt < 3:
                        wait = 15 * (attempt + 1)
                        logger.warning(
                            f"Gemini rate limited (attempt {attempt+1}), waiting {wait}s"
                        )
                        await asyncio.sleep(wait)
                    else:
                        raise
            return ""
        except Exception as e:
            logger.error(f"Gemini generation failed: {e}")
            raise

    async def generate_batch(
        self,
        items: list,
        semaphore_limit: int = 8,
        force_mode: ForceMode = None,
    ) -> list:
        """Run multiple generate() calls concurrently with a semaphore cap.

        Args:
            items:           List of dicts with keys: "prompt" (required),
                             "system", "force_json", "num_ctx_override" (optional).
            semaphore_limit: Max concurrent LLM calls (prevents 429 storms).
            force_mode:      Passed through to each generate() call.
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
        """Close long-lived connections. Call on application shutdown."""
        if self._ollama_client and not self._ollama_client.is_closed:
            await self._ollama_client.aclose()


# Module-level singleton - import this everywhere
llm_client = LLMClient()
