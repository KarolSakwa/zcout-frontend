import os
import uuid
import time
import random
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, constr
from math import sqrt, log, exp

from app.domain.matrix import seed_for

MAX_RETRIES = 3

router = APIRouter(prefix="/vote", tags=["vote"])

# --- Dynamo env ---
VOTES_TABLE_NAME = os.getenv("VOTES_TABLE_NAME")
ACCUM_TABLE_NAME = os.getenv("ACCUMULATORS_TABLE_NAME")
RATINGS_TABLE_NAME = os.getenv("RATINGS_TABLE_NAME")
if not VOTES_TABLE_NAME or not ACCUM_TABLE_NAME or not RATINGS_TABLE_NAME:
    raise RuntimeError("VOTES_TABLE_NAME, ACCUMULATORS_TABLE_NAME and RATINGS_TABLE_NAME must be set")

dynamodb = boto3.resource("dynamodb")
ddb_client = boto3.client("dynamodb")
votes_table = dynamodb.Table(VOTES_TABLE_NAME)
accum_table = dynamodb.Table(ACCUM_TABLE_NAME)
ratings_table = dynamodb.Table(RATINGS_TABLE_NAME)

# ---------- Algorytm / helpers ----------
POS_RANGE = {
    "LW": (50, 99), "RW": (50, 99), "ST": (40, 95),
    "CM": (35, 92), "CB": (10, 80), "GK": (5, 70),
}

def _clamp(x: float, L: float, U: float) -> float:
    return min(U, max(L, x))

def _sigmoid(z: float) -> float:
    return 1.0 / (1.0 + exp(-z))

def _expected_prob(rA: float, rB: float, S_exp: float = 14.0) -> float:
    return _sigmoid((rA - rB) / S_exp)

def _k_factor(rA: float, rB: float) -> float:
    gap = abs(rA - rB)
    base = 18.0 if gap < 4 else 14.0 if gap < 8 else 10.0
    opp = min(rA, rB)
    qual_boost = 1.10 if opp >= 70 else 1.00 if opp >= 55 else 0.90
    return base * qual_boost

def compute_new_ratings_simple(
    rA: float, rB: float, posA: str, posB: str, winner_is_A: bool
) -> Tuple[float, float]:
    expA = _expected_prob(rA, rB, S_exp=14.0)
    scoreA = 1.0 if winner_is_A else 0.0
    K = _k_factor(rA, rB)

    newA = rA + K * (scoreA - expA)
    newB = rB + K * ((1.0 - scoreA) - (1.0 - expA))
    newA = _clamp(newA, *POS_RANGE.get(posA, (0, 99)))
    newB = _clamp(newB, *POS_RANGE.get(posB, (0, 99)))
    return newA, newB

# ----------------- I/O modele -----------------
class VoteIn(BaseModel):
    attribute: constr(strip_whitespace=True, min_length=1, max_length=32)
    playerA_id: constr(strip_whitespace=True, min_length=1, max_length=64)
    playerB_id: constr(strip_whitespace=True, min_length=1, max_length=64)
    winner_id: constr(strip_whitespace=True, min_length=1, max_length=64)
    ratingA: float = Field(..., ge=0, le=99)
    ratingB: float = Field(..., ge=0, le=99)
    posA: constr(strip_whitespace=True, min_length=1, max_length=3)
    posB: constr(strip_whitespace=True, min_length=1, max_length=3)
    duel_id: Optional[constr(strip_whitespace=True, min_length=1, max_length=64)] = None
    user_id: Optional[constr(strip_whitespace=True, min_length=1, max_length=128)] = None
    meta: Optional[Dict[str, Any]] = None
    vote_token: Optional[constr(strip_whitespace=True, min_length=8, max_length=64)] = None

def _sorted_pair(a: str, b: str) -> str:
    x, y = sorted([a, b])
    return f"{x}#{y}"

def _gsi_pair_pk(attribute: str, a: str, b: str) -> str:
    return f"{attribute}#pair#{_sorted_pair(a, b)}"

def _gsi_player_pk(attribute: str, player_id: str) -> str:
    return f"{attribute}#player#{player_id}"

def _acc_key(attribute: str, a: str, b: str) -> str:
    return f"{attribute}#pair#{_sorted_pair(a, b)}"

# ----------------- Ratings helpers -----------------
def _ratings_key(player_id: str, attr: str) -> Dict[str, Any]:
    return {"player_id": player_id, "attr": attr}

def _get_rating_item(player_id: str, attr: str) -> Optional[Dict[str, Any]]:
    try:
        resp = ratings_table.get_item(
            Key=_ratings_key(player_id, attr),
            ConsistentRead=True
        )
        return resp.get("Item")
    except Exception:
        return None

def _seed_rating_if_absent(player_id: str, attr: str, seed_rating: float, pos: str) -> Dict[str, Any]:
    now_iso = datetime.now(timezone.utc).isoformat()
    item = {
        "player_id": player_id,
        "attr": attr,
        "rating": Decimal(str(seed_rating)),
        "n_votes": Decimal(0),
        "version": Decimal(1),
        "updated_at": now_iso,
        "pos": pos,
        "rating_neg": Decimal(str(-seed_rating)),
    }
    try:
        ratings_table.put_item(
            Item=item,
            ConditionExpression="attribute_not_exists(player_id) AND attribute_not_exists(attr)"
        )
        return item
    except ClientError as e:
        if e.response["Error"]["Code"] != "ConditionalCheckFailedException":
            raise
        existing = _get_rating_item(player_id, attr)
        if not existing:
            ratings_table.put_item(Item=item)
            return item
        return existing

def _get_or_seed_rating(player_id: str, attr: str, pos: str, seed_rating: float) -> Dict[str, Any]:
    it = _get_rating_item(player_id, attr)
    if it:
        return it
    return _seed_rating_if_absent(player_id, attr, seed_rating, pos)

# ----------------- Główna ścieżka -----------------
@router.post("", summary="Zapis głosu -> atomowa aktualizacja ratingów -> log + akumulatory")
def post_vote(payload: VoteIn):
    if os.getenv("DEBUGPY_ENABLED") == "1":
        import debugpy
        debugpy.breakpoint()  # <— wymusi zatrzymanie w trybie debug

    if payload.winner_id not in {payload.playerA_id, payload.playerB_id}:
        raise HTTPException(status_code=400, detail="winner_id must be one of playerA_id or playerB_id")

    base_id = payload.vote_token or uuid.uuid4().hex
    now = datetime.now(timezone.utc)
    ts_iso = now.isoformat()
    ts_ms = int(now.timestamp() * 1000)

    a_id, b_id = payload.playerA_id, payload.playerB_id
    cA, cB = sorted([a_id, b_id])

    if cA == a_id:
        posA0, posB0 = payload.posA, payload.posB
    else:
        posA0, posB0 = payload.posB, payload.posA

    # --- SEED: z matrix.py, nie z payloadu ---
    seedA = seed_for(posA0, payload.attribute)
    seedB = seed_for(posB0, payload.attribute)

    itemA = _get_or_seed_rating(cA, payload.attribute, posA0, seedA)
    itemB = _get_or_seed_rating(cB, payload.attribute, posB0, seedB)

    try:
        rA = float(itemA["rating"])
        rB = float(itemB["rating"])
        vA = int(itemA["version"])
        vB = int(itemB["version"])
    except KeyError:
        raise HTTPException(status_code=500, detail="Ratings items are malformed")

    winner_is_A = (payload.winner_id == cA)
    newA, newB = compute_new_ratings_simple(rA, rB, posA0, posB0, winner_is_A)

    max_attempts = 6
    for attempt in range(max_attempts):
        try:
            ddb_client.transact_write_items(
                TransactItems=[
                    {
                        "Update": {
                            "TableName": RATINGS_TABLE_NAME,
                            "Key": {
                                "player_id": {"S": cA},
                                "attr": {"S": payload.attribute},
                            },
                            "UpdateExpression": "SET rating=:r, n_votes = if_not_exists(n_votes,:z) + :one, "
                                                "version = :vnext, updated_at=:ts, rating_neg=:rn",
                            "ConditionExpression": "version = :vcur",
                            "ExpressionAttributeValues": {
                                ":r": {"N": str(round(newA, 6))},
                                ":rn": {"N": str(round(-newA, 6))},
                                ":z": {"N": "0"},
                                ":one": {"N": "1"},
                                ":vcur": {"N": str(vA)},
                                ":vnext": {"N": str(vA + 1)},
                                ":ts": {"S": ts_iso},
                            },
                        }
                    },
                    {
                        "Update": {
                            "TableName": RATINGS_TABLE_NAME,
                            "Key": {
                                "player_id": {"S": cB},
                                "attr": {"S": payload.attribute},
                            },
                            "UpdateExpression": "SET rating=:r, n_votes = if_not_exists(n_votes,:z) + :one, "
                                                "version = :vnext, updated_at=:ts, rating_neg=:rn",
                            "ConditionExpression": "version = :vcur",
                            "ExpressionAttributeValues": {
                                ":r": {"N": str(round(newB, 6))},
                                ":rn": {"N": str(round(-newB, 6))},
                                ":z": {"N": "0"},
                                ":one": {"N": "1"},
                                ":vcur": {"N": str(vB)},
                                ":vnext": {"N": str(vB + 1)},
                                ":ts": {"S": ts_iso},
                            },
                        }
                    },
                ]
            )
            break
        except ClientError as e:
            code = e.response["Error"]["Code"]
            if code in ("TransactionCanceledException", "ConditionalCheckFailedException"):
                freshA = _get_rating_item(cA, payload.attribute)
                freshB = _get_rating_item(cB, payload.attribute)
                if not freshA or not freshB:
                    raise HTTPException(status_code=500, detail="Ratings missing during retry")
                rA = float(freshA["rating"]); vA = int(freshA["version"])
                rB = float(freshB["rating"]); vB = int(freshB["version"])
                newA, newB = compute_new_ratings_simple(rA, rB, posA0, posB0, winner_is_A)
                time.sleep((0.03 * (attempt + 1)) + random.random() * 0.02)
                continue
            else:
                raise HTTPException(status_code=500, detail=f"TransactWrite error: {code}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"TransactWrite failed: {e}")
    else:
        raise HTTPException(status_code=503, detail="Busy: could not update ratings, try again")

    winA = "win" if winner_is_A else "loss"
    winB = "loss" if winner_is_A else "win"
    for side, me, opp, res in (("A", cA, cB, winA), ("B", cB, cA, winB)):
        vote_id = f"{base_id}#{side}"
        item = {
            "player_id": me,
            "ts": ts_ms,
            "vote_id": vote_id,
            "ts_iso": ts_iso,
            "attribute": payload.attribute,
            "opponent_id": opp,
            "winner_id": payload.winner_id,
            "duel_id": payload.duel_id or "",
            "user_id": payload.user_id or "",
            "result": res,
            "meta": payload.meta or {},
            "gsiPairPK": _gsi_pair_pk(payload.attribute, payload.playerA_id, payload.playerB_id),
            "gsiPlayerPK": _gsi_player_pk(payload.attribute, me),
            "ver": "v2",
        }
        try:
            votes_table.put_item(
                Item=item,
                ConditionExpression="attribute_not_exists(vote_id)"
            )
        except ClientError as e:
            if e.response["Error"]["Code"] != "ConditionalCheckFailedException":
                raise HTTPException(status_code=500, detail=f"Failed to write vote log: {e.response['Error']['Code']}")

    try:
        acc_key = _acc_key(payload.attribute, cA, cB)
        addWinsA = Decimal(1) if winner_is_A else Decimal(0)
        addWinsB = Decimal(1) if not winner_is_A else Decimal(0)
        accum_table.update_item(
            Key={"acc_key": acc_key},
            UpdateExpression=(
                "SET window_from_ts = if_not_exists(window_from_ts, :ts_iso), "
                "window_to_ts = :ts_iso "
                "ADD winsA :addA, winsB :addB, n :addN"
            ),
            ExpressionAttributeValues={
                ":ts_iso": ts_iso,
                ":addA": addWinsA,
                ":addB": addWinsB,
                ":addN": Decimal(1),
            },
            ReturnValues="NONE",
        )
    except Exception:
        pass

    freshA = _get_rating_item(cA, payload.attribute)
    freshB = _get_rating_item(cB, payload.attribute)
    if not freshA or not freshB:
        raise HTTPException(status_code=500, detail="Ratings readback failed")

    deltaA = float(freshA["rating"]) - rA
    deltaB = float(freshB["rating"]) - rB

    return {
        "ok": True,
        "ts": ts_iso,
        "pair": f"{cA}#{cB}",
        "attribute": payload.attribute,
        "vote_token": base_id,
        "ratings": {
            cA: {
                "rating": float(freshA["rating"]),
                "version": int(freshA["version"]),
                "n_votes": int(freshA.get("n_votes", 0)),
                "delta": round(deltaA, 3),
            },
            cB: {
                "rating": float(freshB["rating"]),
                "version": int(freshB["version"]),
                "n_votes": int(freshB.get("n_votes", 0)),
                "delta": round(deltaB, 3),
            },
        },
        "winner_id": payload.winner_id,
    }
