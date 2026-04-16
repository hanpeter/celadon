from typing import Annotated

from pydantic import BeforeValidator


def _coerce_null_text(v: object) -> str:
    """SQL/JSON null and strings only; reject numbers, dicts, lists, etc."""
    if v is None:
        return ''
    if isinstance(v, str):
        return v
    raise ValueError('Value must be a string or null')


OptionalText = Annotated[str, BeforeValidator(_coerce_null_text)]
