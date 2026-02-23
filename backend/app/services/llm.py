"""LLM client — supports OpenAI-compatible gateway and Anthropic Messages API."""

import json
from urllib.request import Request, urlopen
from urllib.error import URLError

from app.core.config import LLM_BASE_URL, LLM_AUTH_TOKEN, LLM_MODEL


def _call_anthropic(system_prompt: str, user_message: str) -> dict:
    """Call Anthropic Messages API directly."""
    url = "https://api.anthropic.com/v1/messages"

    payload = json.dumps({
        "model": LLM_MODEL.replace("anthropic/", ""),
        "max_tokens": 1024,
        "system": system_prompt,
        "messages": [
            {"role": "user", "content": user_message},
        ],
    }).encode("utf-8")

    headers = {
        "Content-Type": "application/json",
        "x-api-key": LLM_AUTH_TOKEN,
        "anthropic-version": "2023-06-01",
    }

    req = Request(url, data=payload, headers=headers, method="POST")

    with urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        return {
            "success": True,
            "content": data["content"][0]["text"],
            "model": data.get("model", LLM_MODEL),
        }


def _call_openai_compat(system_prompt: str, user_message: str) -> dict:
    """Call OpenAI-compatible endpoint (OpenClaw gateway, etc.)."""
    url = f"{LLM_BASE_URL}/chat/completions"

    payload = json.dumps({
        "model": LLM_MODEL,
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
            "model": data.get("model", LLM_MODEL),
        }


def chat_completion(system_prompt: str, user_message: str) -> dict:
    """Send a chat completion request and return the parsed response."""
    try:
        if LLM_MODEL.startswith("anthropic/"):
            return _call_anthropic(system_prompt, user_message)
        else:
            return _call_openai_compat(system_prompt, user_message)
    except URLError as e:
        return {
            "success": False,
            "content": f"LLM gateway is unreachable: {e}",
            "model": LLM_MODEL,
        }
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        return {
            "success": False,
            "content": f"Unexpected LLM response format: {e}",
            "model": LLM_MODEL,
        }
