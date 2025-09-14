import os
import boto3

PLAYERS_TABLE_NAME = os.environ.get("PLAYERS_TABLE_NAME")
if not PLAYERS_TABLE_NAME:
    raise RuntimeError("PLAYERS_TABLE_NAME env var is not set")

dynamodb = boto3.resource("dynamodb")
players_table = dynamodb.Table(PLAYERS_TABLE_NAME)
