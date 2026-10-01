"""Local setup contract. A saved credential is not verified or dispatch permission."""
import re

MAX_PROVIDER_BODY_BYTES = 2048


def validate_tavily_key(value: object) -> str:
    # Accept an opaque printable ASCII token; do not assume a provider prefix/length.
    if (not isinstance(value, dict) or set(value) != {"key"}
            or not isinstance(value["key"], str)
            or re.fullmatch(r"[\x21-\x7e]{1,512}", value["key"]) is None):
        raise ValueError("invalid_provider_key")
    return value["key"]


def provider_status(saved: bool) -> dict:
    return {"provider": "tavily", "key_saved": saved, "connection_verified": False,
            "dispatch_available": False, "secret_store": "windows-credential-manager"}
