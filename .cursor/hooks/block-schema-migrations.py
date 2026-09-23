#!/usr/bin/env python3
"""beforeShellExecution: deny runtime schema/migration generators.

Schema is owned only by database/schema.sql.
"""

import json
import re
import sys

PATTERNS = [
    (r"dotnet\s+ef\s+migrations", "EF Core migrations"),
    (r"Add-Migration\b", "EF Core Add-Migration"),
    (r"\balembic\b", "Alembic migrations"),
    (r"Base\.metadata\.create_all", "SQLAlchemy create_all"),
    (r"ddl-auto\s*[=:]\s*(?!none\b)", "Hibernate ddl-auto other than none"),
    (r"hibernate\.hbm2ddl", "Hibernate hbm2ddl"),
    (r"EnsureCreated\s*\(", "EF EnsureCreated"),
]


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        print(json.dumps({"permission": "deny", "user_message": "block-schema-migrations: invalid hook input"}))
        return

    command = payload.get("command") or ""

    for pattern, label in PATTERNS:
        if re.search(pattern, command, flags=re.IGNORECASE):
            message = (
                f"Blocked ({label}). Schema is owned by database/schema.sql; "
                "do not generate or apply ORM migrations at runtime."
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
