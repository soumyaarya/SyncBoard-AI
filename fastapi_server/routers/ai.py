"""AI Chat router – uses Groq API (free, fast) to generate suggestions & Mermaid diagrams."""

import re
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from config import get_settings

settings = get_settings()

SYSTEM_PROMPT = """You are an intelligent whiteboard assistant called SyncBoard AI. 
Your role is to help users brainstorm, plan, and visualize ideas on a collaborative whiteboard.

RULES:
1. When a user asks for a concept map, architecture diagram, flowchart, mind map, or any visual diagram, 
   you MUST include a Mermaid diagram code block in your response.
2. Use ```mermaid to start the diagram code block.
3. Keep diagrams clean and well-structured with clear labels.
4. Use ONLY these reliable Mermaid diagram types:
   - graph TD/LR for ALL diagrams including concept maps, architecture, and database schemas
   - flowchart TD/LR for flowcharts and processes  
   - sequenceDiagram for sequence/interaction diagrams
   - NEVER use erDiagram — it has syntax issues. Use graph TD with table-style nodes instead.
   - NEVER use mindmap or classDiagram — they are unreliable.
5. For database schemas, use graph TD like this:
   ```
   graph TD
     USERS["USERS<br/>id, name, email"]
     ORDERS["ORDERS<br/>id, user_id, total"]
     USERS -->|has many| ORDERS
   ```
6. Always provide a brief text explanation alongside the diagram.
7. Be concise but helpful. Focus on actionable suggestions.
8. If the user describes a project, suggest relevant diagrams proactively.

CRITICAL MERMAID SYNTAX RULES (follow these exactly):
- Use simple node IDs like A, B, C or descriptive IDs like auth, db, api
- Node labels with brackets: A["My Label"] or B["Another Label"]
- Arrows: A --> B (plain), A -->|label| B (with label), A ==> B (thick)
- NEVER use -->|label|> — this is INVALID. Always use -->|label| (no trailing >)
- NEVER use special characters like <, >, &, # inside node labels
- For subgraphs use: subgraph Title ... end
- Keep labels short (2-4 words max per node)
- Do NOT use HTML in labels except <br/> for line breaks in node labels
"""

router = APIRouter(prefix="/api/ai", tags=["AI"])

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None
    history: Optional[List[dict]] = None


class ChatResponse(BaseModel):
    reply: str
    diagrams: List[str]


def extract_mermaid_diagrams(text: str) -> tuple[str, list[str]]:
    """Extract Mermaid code blocks from the AI response."""
    pattern = r"```mermaid\s*\n([\s\S]*?)```"
    diagrams = re.findall(pattern, text)
    clean_text = re.sub(pattern, "[DIAGRAM]", text).strip()
    return clean_text, [d.strip() for d in diagrams]


@router.post("/chat", response_model=ChatResponse)
async def ai_chat(request: ChatRequest):
    """Send a message to the AI and get a response with optional diagrams."""
    api_key = settings.groq_api_key
    if not api_key or api_key == "PASTE_YOUR_GROQ_API_KEY_HERE":
        raise HTTPException(
            status_code=503,
            detail="Groq API key not configured. Add GROQ_API_KEY to your .env file. Get a free key at console.groq.com"
        )

    try:
        # Build messages
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        if request.history:
            for msg in request.history:
                role = "user" if msg.get("role") == "user" else "assistant"
                messages.append({"role": role, "content": msg.get("content", "")})

        # Build user prompt
        prompt = request.message
        if request.context:
            prompt = f"Context about current work: {request.context}\n\nUser request: {prompt}"

        messages.append({"role": "user", "content": prompt})

        # Call Groq API (OpenAI-compatible)
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 2048,
                },
            )

        if response.status_code != 200:
            error_detail = response.json().get("error", {}).get("message", response.text)
            raise HTTPException(status_code=response.status_code, detail=f"AI error: {error_detail}")

        data = response.json()
        reply_text = data["choices"][0]["message"]["content"]

        # Extract diagrams
        clean_reply, diagrams = extract_mermaid_diagrams(reply_text)

        return ChatResponse(
            reply=clean_reply if diagrams else reply_text,
            diagrams=diagrams
        )

    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Network error: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")
