from fastapi import APIRouter, HTTPException
from app.db.players import players_table

router = APIRouter()

print(">>> PLAYER ROUTER: module imported")

@router.get("/player/{player_id}")
def get_player(player_id: str):
    resp = players_table.get_item(Key={"player_id": player_id})
    item = resp.get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Player not found")
    return item
