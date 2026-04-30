#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Build and deploy the Soroban Vesting contract to Stellar Testnet
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

NETWORK="testnet"
CONTRACT_NAME="soroban_vesting"
WASM_PATH="../contract/target/wasm32-unknown-unknown/release/${CONTRACT_NAME}.wasm"
IDENTITY="deployer"   # soroban identity name — run: soroban keys generate deployer

echo "🔨 Building contract..."
cd ../contract
cargo build --target wasm32-unknown-unknown --release
cd ../scripts

echo "✅ Build complete: $WASM_PATH"

echo "📦 Optimising WASM..."
soroban contract optimize --wasm "$WASM_PATH"
OPTIMISED_WASM="${WASM_PATH%.wasm}.optimized.wasm"

echo "🚀 Deploying to $NETWORK..."
CONTRACT_ID=$(soroban contract deploy \
  --wasm "$OPTIMISED_WASM" \
  --source "$IDENTITY" \
  --network "$NETWORK")

echo ""
echo "✅ Contract deployed!"
echo "   Contract ID : $CONTRACT_ID"
echo "   Network     : $NETWORK"
echo ""
echo "👉 Add this to your frontend/.env:"
echo "   VITE_CONTRACT_ID=$CONTRACT_ID"
