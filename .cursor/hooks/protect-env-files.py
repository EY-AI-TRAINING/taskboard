#!/usr/bin/env python3
"""beforeReadFile: deny .env* except .env.example (Task Board secrets rule)."""

import json
import os
import sys


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        print(json.dumps({"permission": "deny", "user_message": "protect-env-files: invalid hook input"}))
        return

    file_path = payload.get("file_path") or ""
    name = os.path.basename(file_path)

    allowed_example = name == ".env.example"
    is_env = name == ".env" or name.startswith(".env.")

    if is_env and not allowed_example:
        message = (
            f"Blocked read of {name}. Use framework config or .env.example; "
            "do not send secrets to the model."
        )
        print(
            json.dumps(
                {
                    "permission": "deny",
                    "user_message": message,
                    "agent_message": message,
                }
            )
        )
        return

    print(json.dumps({"permission": "allow"}))


if __name__ == "__main__":
    main()
