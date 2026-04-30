#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# invoke.sh — Helper to call contract functions from the CLI
# Usage: ./invoke.sh <function> [args...]
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

CONTRACT_ID="${VITE_CONTRACT_ID:-}"
NETWORK="testnet"
IDENTITY="deployer"

if [ -z "$CONTRACT_ID" ]; then
  echo "❌ VITE_CONTRACT_ID is not set. Export it or add it to your environment."
  exit 1
fi

FUNCTION="${1:-}"
if [ -z "$FUNCTION" ]; then
  echo "Usage: ./invoke.sh <function> [args...]"
  echo ""
  echo "Available functions:"
  echo "  initialize <owner> <token>"
  echo "  create_schedule <beneficiary> <start_time> <cliff_duration> <total_duration> <total_amount> <revocable>"
  echo "  claim <beneficiary>"
  echo "  revoke <beneficiary>"
  echo "  get_vesting_info <beneficiary>"
  echo "  get_beneficiaries"
  echo "  get_owner"
  echo "  get_token"
  exit 0
fi

shift
soroban contract invoke \
  --id "$CONTRACT_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- "$FUNCTION" "$@"
