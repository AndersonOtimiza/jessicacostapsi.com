#!/usr/bin/env bash
# Deploy local para Cloudflare Pages usando 1Password CLI para resolver segredos.
# Pre-requisitos:
#   - 1Password CLI (op) autenticado: `op signin`
#   - Item criado no cofre, ex.: "Cloudflare - jessicacostapsi"
#       Campos: api_token, account_id
#   - Ajustar OP_VAULT / OP_ITEM abaixo conforme seu cofre.

set -euo pipefail

OP_VAULT="${OP_VAULT:-Private}"
OP_ITEM="${OP_ITEM:-Cloudflare - jessicacostapsi}"
PROJECT_NAME="${PROJECT_NAME:-jessicacostapsi}"
BRANCH="${BRANCH:-master}"

if ! command -v op >/dev/null 2>&1; then
  echo "ERRO: 1Password CLI (op) nao encontrado no PATH." >&2
  exit 1
fi

if ! op account list >/dev/null 2>&1; then
  echo "ERRO: nao autenticado no 1Password. Rode 'op signin' antes." >&2
  exit 1
fi

CLOUDFLARE_API_TOKEN="$(op read "op://${OP_VAULT}/${OP_ITEM}/api_token")"
CLOUDFLARE_ACCOUNT_ID="$(op read "op://${OP_VAULT}/${OP_ITEM}/account_id")"
export CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID

echo "Iniciando deploy para Cloudflare Pages (${PROJECT_NAME} / ${BRANCH})..."
npx --yes wrangler pages deploy . \
  --project-name="${PROJECT_NAME}" \
  --branch="${BRANCH}" \
  --commit-dirty=true

echo "Deploy concluido. Producao: https://jessicacostapsi.com"
