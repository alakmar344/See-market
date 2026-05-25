import html
import re


SCRIPT_PATTERN = re.compile(r"<\s*script", re.IGNORECASE)


def sanitize_text(text: str) -> str:
    cleaned = SCRIPT_PATTERN.sub("", text)
    return html.escape(cleaned.strip())
