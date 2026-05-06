#!/usr/bin/env sh
set -eu

docker compose down -v --remove-orphans
docker compose up -d --build
docker compose ps
