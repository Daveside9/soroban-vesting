# Deployment Guide

## Prerequisites

1. Install Rust and the WASM target:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown
```

2. Install Soroban CLI:
```bash
cargo install --locked soroban-cli --features opt
```

3. Generate a deployer identity:
```bash
soroban keys generate deployer --network testnet
soroban keys address deployer   # copy this address
```

4. Fund the deployer on testnet via [Stellar Friendbot](https://friendbot.stellar.org/?addr=YOUR_ADDRESS).

---

## Build

```bash
cd contract
cargo build --target wasm32-unknown-unknown --release
```

Optimise the WASM binary:
```bash
soroban contract optimize \
  --wasm target/wasm32-unknown-unknown/release/soroban_vesting.wasm
```

---

## Deploy to Testnet

```bash
cd scripts
chmod +x deploy.sh
./deploy.sh
```

Or manually:
```bash
soroban contract deploy \
  --wasm contract/target/wasm32-unknown-unknown/release/soroban_vesting.optimized.wasm \
  --source deployer \
  --network testnet
```

Copy the returned Contract ID and add it to `frontend/.env`:
```
VITE_CONTRACT_ID=C...
```

---

## Initialize the Contract

```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- initialize \
  --owner $(soroban keys address deployer) \
  --token $TOKEN_CONTRACT_ID
```

---

## Create a Vesting Schedule (CLI)

```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- create_schedule \
  --beneficiary GBENEFICIARY... \
  --start_time 1700000000 \
  --cliff_duration 7776000 \
  --total_duration 31104000 \
  --total_amount 12000 \
  --revocable true
```

---

## Run the Frontend

```bash
cd frontend
cp .env.example .env
# Fill in VITE_CONTRACT_ID and VITE_TOKEN_ID
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and connect Freighter.

---

## Verify on Stellar Explorer

View your contract on [Stellar Expert (Testnet)](https://stellar.expert/explorer/testnet).
