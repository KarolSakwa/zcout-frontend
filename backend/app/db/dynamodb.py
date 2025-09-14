import os
import boto3

TABLE_NAME = os.environ.get("VOTES_TABLE_NAME")
if not TABLE_NAME:
    raise RuntimeError("VOTES_TABLE_NAME env var is not set")

dynamodb = boto3.resource("dynamodb")
votes_table = dynamodb.Table(TABLE_NAME)
