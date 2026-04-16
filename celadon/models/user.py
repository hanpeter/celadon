from typing import ClassVar

from pydantic import BaseModel, ConfigDict

from celadon.models.validator import OptionalText


class User(BaseModel):
    model_config = ConfigDict(extra='forbid')
    SELECT_ONE_BY_EMAIL: ClassVar[str] = (
        'SELECT id, email, name, organization_id FROM users WHERE email = %s'
    )

    id: int
    email: str
    name: OptionalText = ''
    organization_id: int
