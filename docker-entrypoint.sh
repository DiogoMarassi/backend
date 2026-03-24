#!/bin/sh
set -e

echo "→ Sincronizando schema com o banco..."
./node_modules/.bin/prisma db push --accept-data-loss

echo "→ Iniciando servidor NestJS..."
exec node dist/main
