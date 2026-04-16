from typing import Annotated

from pydantic import BeforeValidator


def _coerce_null_text(v: object) -> object:
    return '' if v is None else v


OptionalText = Annotated[str, BeforeValidator(_coerce_null_text)]
