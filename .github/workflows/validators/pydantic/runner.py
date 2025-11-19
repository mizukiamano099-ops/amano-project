# validators/pydantic/runner.py
#
# Pydantic Validator Runner
#

import sys
import json
from pydantic import BaseModel, Field, ValidationError
from uuid import UUID
from datetime import datetime

class StructuralConfig(BaseModel):
    id: UUID
    timestamp: datetime
    temperature: float = Field(ge=-50, le=150)
    pressure: float = Field(ge=800, le=1200)
    mode: str = Field(pattern="^(AUTO|MANUAL)$")

def main():
    raw = sys.stdin.read()
    data = json.loads(raw)

    try:
        StructuralConfig(**data)
        print(json.dumps({"ok": True, "errors": []}))
    except ValidationError as e:
        print(json.dumps({
            "ok": False,
            "errors": e.errors()
        }))

if __name__ == "__main__":
    main()

