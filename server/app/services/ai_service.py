from typing import AsyncIterator, Optional
from app.core.config import settings


class AIService:
    """Provider-agnostic AI service interface."""

    def __init__(self):
        self.api_key = settings.AI_API_KEY
        self.model = settings.AI_MODEL
        self.base_url = getattr(settings, "AI_BASE_URL", "https://api.openai.com/v1")

    async def chat(
        self, messages: list[dict], context: Optional[dict] = None
    ) -> AsyncIterator[str]:
        """Stream chat response from LLM."""
        if not self.api_key:
            # Offline fallback
            yield self._offline_chat_response(messages, context)
            return

        # Online mode - OpenAI compatible
        import httpx

        system_prompt = "You are BidSense AI, a helpful assistant for procurement and RFP management."
        if context:
            rfp_context = context.get("rfp_titles", [])
            if rfp_context:
                system_prompt += f"\n\nUser's active RFPs: {', '.join(rfp_context)}"

        api_messages = [{"role": "system", "content": system_prompt}] + messages

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "messages": api_messages,
                        "stream": True,
                    },
                    timeout=30.0,
                )
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        import json
                        chunk = json.loads(data)
                        content = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                        if content:
                            yield content
            except Exception:
                yield self._offline_chat_response(messages, context)

    def _offline_chat_response(self, messages: list[dict], context: Optional[dict]) -> str:
        """Fallback response when AI is unavailable."""
        last_msg = messages[-1]["content"] if messages else ""
        return f"[Offline Mode] I received your message: '{last_msg[:50]}...'. Configure AI_API_KEY for full responses."

    async def score_proposal(
        self, rfp_title: str, proposal_content: str
    ) -> dict:
        """Score a proposal using AI."""
        if not self.api_key:
            # Deterministic fallback scores
            import hashlib
            hash_val = int(hashlib.md5(proposal_content.encode()).hexdigest(), 16)
            return {
                "ai_score": 70 + (hash_val % 25),
                "technical_score": 65 + (hash_val % 30),
                "pricing_score": 60 + (hash_val % 35),
                "experience_score": 70 + (hash_val % 25),
                "ai_summary": "[Offline Mode] Proposal scored using deterministic algorithm. Configure AI_API_KEY for AI scoring.",
            }

        import httpx
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": "You are an expert proposal evaluator. Return ONLY valid JSON with keys: ai_score, technical_score, pricing_score, experience_score (all 0-100), and ai_summary (string)."},
                            {"role": "user", "content": f"RFP: {rfp_title}\n\nProposal: {proposal_content[:2000]}"},
                        ],
                        "temperature": 0.3,
                    },
                    timeout=30.0,
                )
                response.raise_for_status()
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                import json
                return json.loads(content)
        except Exception:
            return {
                "ai_score": 75.0,
                "technical_score": 70.0,
                "pricing_score": 75.0,
                "experience_score": 80.0,
                "ai_summary": "AI scoring failed. Please try again.",
            }

    async def draft_rfp_section(self, rfp_title: str, section: str) -> str:
        """Draft an RFP section using AI."""
        if not self.api_key:
            return f"[Offline Mode] Draft for '{section}' in '{rfp_title}'. Configure AI_API_KEY for AI-generated content."

        import httpx
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": "You are an expert RFP writer. Write professional, clear RFP content."},
                            {"role": "user", "content": f"Write the '{section}' section for an RFP titled '{rfp_title}'."},
                        ],
                        "temperature": 0.7,
                    },
                    timeout=30.0,
                )
                response.raise_for_status()
                result = response.json()
                return result["choices"][0]["message"]["content"]
        except Exception:
            return f"[Offline Mode] Could not generate section. Configure AI_API_KEY."

    async def summarize_activity(self, items: list[dict]) -> str:
        """Summarize recent activity for dashboard insights."""
        if not self.api_key:
            return f"[Offline Mode] {len(items)} recent activities. No AI summary available."

        import httpx
        try:
            activity_text = "\n".join([f"- {item['action']}: {item['target']}" for item in items[:10]])
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": "Summarize procurement activity concisely in 2-3 sentences."},
                            {"role": "user", "content": activity_text},
                        ],
                        "temperature": 0.5,
                    },
                    timeout=30.0,
                )
                response.raise_for_status()
                result = response.json()
                return result["choices"][0]["message"]["content"]
        except Exception:
            return f"[Offline Mode] Activity summary unavailable."


ai_service = AIService()
