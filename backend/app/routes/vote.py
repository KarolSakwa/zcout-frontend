from fastapi import APIRouter, HTTPException
from uuid import uuid4
from time import time
from app.models import VoteRequest
from app.db.dynamodb import votes_table
import logging

router = APIRouter()
log = logging.getLogger(__name__)

@router.post("/vote")
def vote(data: VoteRequest):
    try:
        vote_id = str(uuid4())
        ts_ms = int(time() * 1000)

        item = {
            "player_id": data.winner_id,
            "ts": ts_ms,

            "vote_id": vote_id,
            "playerA_id": data.playerA_id,
            "playerB_id": data.playerB_id,
            "attribute": data.attribute,
            "winner_id": data.winner_id,
        }

        resp = votes_table.put_item(Item=item)
        log.info("PutItem resp: %s", resp)

        return {"status": "success", "vote_id": vote_id, "ts": ts_ms}

    except Exception as e:
        log.exception("Vote failed")
        raise HTTPException(status_code=500, detail=f"Vote exploded: {e}")
