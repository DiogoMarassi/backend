# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src ./src/

RUN npm run build && npx prisma generate

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:22-slim AS production

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Piper TTS (Linux glibc binary) ────────────────────────────────────────────
# Os binários da pasta local são para Windows (.exe/.dll); aqui baixamos a versão Linux.
# Os arquivos de modelo (.onnx) são cross-platform e são copiados da pasta local.
RUN curl -fsSL https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz \
    | tar -xz -C /tmp \
    && mkdir -p /app/piper-bin \
    && mv /tmp/piper/piper /app/piper-bin/piper \
    && mv /tmp/piper/espeak-ng-data /app/piper-bin/espeak-ng-data \
    && rm -rf /tmp/piper \
    && chmod +x /app/piper-bin/piper

COPY piper/fr_FR-upmc-medium.onnx     /app/piper-bin/
COPY piper/fr_FR-upmc-medium.onnx.json /app/piper-bin/

# ── Node deps (produção) ──────────────────────────────────────────────────────
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Copia Prisma client gerado no builder (mesmo SO, linux-debian-openssl)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# ── App ────────────────────────────────────────────────────────────────────────
COPY --from=builder /app/dist ./dist

RUN mkdir -p public/audios

ENV PORT=8080
ENV NODE_ENV=production
ENV PIPER_PATH=/app/piper-bin/piper
ENV PIPER_MODEL=/app/piper-bin/fr_FR-upmc-medium.onnx

EXPOSE 8080

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
