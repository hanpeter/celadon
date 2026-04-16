from typing import ClassVar

from pydantic import BaseModel, ConfigDict

from celadon.models.validator import OptionalText


class Purchaser(BaseModel):
    model_config = ConfigDict(extra='forbid')
    SELECT_ALL: ClassVar[str] = 'SELECT id, name, is_active FROM purchasers'
    SELECT_ONE: ClassVar[str] = SELECT_ALL + ' WHERE purchasers.id = %s'
    INSERT: ClassVar[str] = 'INSERT INTO purchasers (name) VALUES (%(name)s) RETURNING id'
    UPDATE: ClassVar[str] = 'UPDATE purchasers SET name = %(name)s, is_active = %(is_active)s WHERE id = %(id)s'

    id: int | None = None
    name: OptionalText = ''
    is_active: bool = True
