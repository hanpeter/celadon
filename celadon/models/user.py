class User:
    SELECT_ONE_BY_EMAIL = 'SELECT id, email, name, organization_id FROM users WHERE email = %s'

    def __init__(self, id, email, name, organization_id):
        self.id = id
        self.email = email
        self.name = name
        self.organization_id = organization_id

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'organization_id': self.organization_id,
        }
