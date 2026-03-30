#!/bin/sh
set -e

echo "→ Aplicando migrations do banco..."
npx prisma migrate deploy

echo "→ Iniciando servidor NestJS..."
exec node dist/main
