"""
Python bridge for notebooklm-py — called by the Next.js API route via subprocess.
Usage: python3 notebooklm_client.py '<json_payload>'
Payload: {"action": "<action>", "params": {...}}
Output: JSON to stdout
"""

import asyncio
import json
import sys

from notebooklm import (
    AuthError,
    NotebookLMClient,
)


async def run(action: str, params: dict) -> dict:
    try:
        async with await NotebookLMClient.from_storage() as client:
            if action == "list_notebooks":
                notebooks = await client.notebooks.list()
                return {
                    "notebooks": [
                        {"id": nb.id, "title": nb.title}
                        for nb in notebooks
                    ]
                }

            if action == "create_notebook":
                nb = await client.notebooks.create(params["name"])
                return {"id": nb.id, "title": nb.title}

            if action == "add_source":
                await client.sources.add_url(
                    params["notebook_id"], params["url"], wait=True
                )
                return {"success": True}

            if action == "ask":
                result = await client.chat.ask(
                    params["notebook_id"], params["question"]
                )
                return {"answer": result.answer}

            return {"error": f"Unknown action: {action}"}

    except AuthError:
        return {
            "auth_required": True,
            "error": "Not authenticated. Run: notebooklm login",
        }
    except Exception as exc:
        return {"error": str(exc)}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No payload provided"}))
        sys.exit(1)

    try:
        payload = json.loads(sys.argv[1])
    except json.JSONDecodeError as exc:
        print(json.dumps({"error": f"Invalid JSON: {exc}"}))
        sys.exit(1)

    result = asyncio.run(run(payload.get("action", ""), payload.get("params", {})))
    print(json.dumps(result))
