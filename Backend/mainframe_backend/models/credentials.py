from pydantic import BaseModel

class Credentials(BaseModel):
    host: str
    port: str
    username: str
    password: str 