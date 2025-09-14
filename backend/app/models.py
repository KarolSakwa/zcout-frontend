from pydantic import BaseModel

class VoteRequest(BaseModel):
    playerA_id: str
    playerB_id: str
    attribute: str
    winner_id: str
