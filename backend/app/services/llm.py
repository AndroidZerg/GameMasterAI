"""LLM client — supports OpenAI direct, OpenClaw Gateway, and Anthropic APIs."""

import json
from urllib.request import Request, urlopen
from urllib.error import URLError

from app.core.config import (
    LLM_MODE,
    OPENAI_API_KEY, OPENAI_MODEL,
    LLM_BASE_URL, LLM_AUTH_TOKEN, LLM_MODEL,
    ANTHROPIC_API_KEY, ANTHROPIC_MODEL,
)


def _call_openai_direct(system_prompt: str, user_message: str) -> dict:
    """Call OpenAI API directly (production mode)."""
    url = "https://api.openai.com/v1/chat/completions"
    model = OPENAI_MODEL

    payload = json.dumps({
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "temperature": 0.7,
        "max_tokens": 1024,
    }).encode("utf-8")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENAI_API_KEY}",
    }

    req = Request(url, data=payload, headers=headers, method="POST")

    with urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        return {
            "success": True,
            "content": data["choices"][0]["message"]["content"],
            "model": data.get("model", model),
        }


def _call_gateway(system_prompt: str, user_message: str) -> dict:
    """Call OpenAI-compatible endpoint (OpenClaw Gateway, local dev)."""
    url = f"{LLM_BASE_URL}/chat/completions"
    model = LLM_MODEL

    payload = json.dumps({
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "temperature": 0.7,
        "max_tokens": 1024,
    }).encode("utf-8")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {LLM_AUTH_TOKEN}",
    }

    req = Request(url, data=payload, headers=headers, method="POST")

    with urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        return {
            "success": True,
            "content": data["choices"][0]["message"]["content"],
            "model": data.get("model", model),
        }


def _call_anthropic(system_prompt: str, user_message: str) -> dict:
    """Call Anthropic Messages API directly."""
    url = "https://api.anthropic.com/v1/messages"
    model = ANTHROPIC_MODEL

    payload = json.dumps({
        "model": model,
        "max_tokens": 1024,
        "system": system_prompt,
        "messages": [
            {"role": "user", "content": user_message},
        ],
    }).encode("utf-8")

    headers = {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
    }

    req = Request(url, data=payload, headers=headers, method="POST")

    with urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        return {
            "success": True,
            "content": data["content"][0]["text"],
            "model": data.get("model", model),
        }


_DISPATCH = {
    "openai-direct": _call_openai_direct,
    "gateway": _call_gateway,
    "anthropic": _call_anthropic,
}


def chat_completion(system_prompt: str, user_message: str) -> dict:
    """Send a chat completion request using the configured LLM mode."""
    handler = _DISPATCH.get(LLM_MODE, _call_gateway)
    try:
        return handler(system_prompt, user_message)
    except URLError as e:
        return {
            "success": False,
            "content": f"LLM gateway is unreachable: {e}",
            "model": LLM_MODE,
        }
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        return {
            "success": False,
            "content": f"Unexpected LLM response format: {e}",
            "model": LLM_MODE,
        }
