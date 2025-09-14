import os
from uuid import uuid4

if not os.environ.get("PLAYERS_TABLE_NAME"):
    os.environ["PLAYERS_TABLE_NAME"] = f'zcout-players-{os.environ.get("STAGE", "dev")}'

from app.db.players import players_table

players = [
    {
        "player_id": "martinelli",
        "name": "Gabriel Martinelli",
        "position": "LW",
        "club": "Arsenal",
        "nation": "Brazil",
    },
    {
        "player_id": "mudryk",
        "name": "Mykhailo Mudryk",
        "position": "LW",
        "club": "Chelsea",
        "nation": "Ukraine",
    },
]

def main():
    with players_table.batch_writer() as batch:
        for p in players:
            batch.put_item(Item=p)
    print("Seed OK:", [p["player_id"] for p in players])

if __name__ == "__main__":
    main()
