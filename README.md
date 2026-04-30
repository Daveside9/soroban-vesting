# Soroban Token Vesting

A decentralized token vesting platform built on the **Stellar blockchain** using **Soroban smart contracts**. Supports cliff + linear vesting schedules with a React dashboard for managing and visualizing vesting positions.

> Built for the [Stellar Wave Program](https://www.drips.network/wave/stellar) on Drips.

---

## Features

- 🔒 **Cliff + Linear Vesting** — tokens are locked until a cliff date, then release linearly over time
- 👥 **Multi-Beneficiary** — one contract manages multiple vesting schedules
- ❌ **Revocable Schedules** — owner can revoke unvested tokens from any beneficiary
- 📊 **Dashboard UI** — visualize vesting timelines, claimable amounts, and history
- 🔗 **Freighter Wallet** — connect and interact directly from the browser
- ⛓️ **On-chain** — all vesting logic enforced by Soroban smart contract

---

## Project Structure

```
soroban-vesting/
├── contract/               # Soroban smart contract (Rust)
│   ├── src/
│   │   ├── lib.rs          # Contract entry point
│   │   ├── vesting.rs      # Core vesting logic
│   │   ├── storage.rs      # Storage keys and helpers
│   │   ├── events.rs       # Contract events
│   │   ├── errors.rs       # Custom error types
│   │   └── types.rs        # Shared data types
│   ├── Cargo.toml
│   └── Cargo.lock
├── frontend/               # React + TypeScript dashboard
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # App pages
│   │   ├── services/       # Stellar SDK integration
│   │   ├── store/          # State management
│   │   └── types/          # TypeScript types
│   ├── package.json
│   └── vite.config.ts
├── scripts/                # Deployment and utility scripts
│   ├── deploy.sh
│   └── invoke.sh
├── tests/                  # Integration tests
│   └── vesting.test.ts
└── docs/                   # Documentation
    ├── CONTRACT.md
    ├── DEPLOYMENT.md
    └── CONTRIBUTING.md
```

---

## Getting Started

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) + `wasm32-unknown-unknown` target
- [Soroban CLI](https://developers.stellar.org/docs/smart-contracts/getting-started/setup)
- [Node.js](https://nodejs.org/) v18+
- [Freighter Wallet](https://www.freighter.app/) browser extension

### Install Soroban CLI

```bash
cargo install --locked soroban-cli --features opt
```

### Build the Contract

```bash
cd contract
cargo build --target wasm32-unknown-unknown --release
```

### Run Contract Tests

```bash
cd contract
cargo test
```

### Deploy to Testnet

```bash
cd scripts
./deploy.sh
```

### Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## How Vesting Works

1. **Owner** deploys the contract and sets the token address
2. **Owner** creates a vesting schedule for a beneficiary:
   - `start_time` — when vesting begins
   - `cliff_duration` — how long before any tokens unlock
   - `total_duration` — total vesting period
   - `total_amount` — total tokens to vest
3. **Beneficiary** can call `claim()` at any time to receive their vested tokens
4. **Owner** can call `revoke()` to cancel a schedule and reclaim unvested tokens

### Example

```
Total: 12,000 tokens
Cliff: 3 months
Duration: 12 months

Month 0-3:   0 tokens claimable (cliff period)
Month 3:     3,000 tokens claimable (cliff unlock)
Month 6:     6,000 tokens claimable
Month 9:     9,000 tokens claimable
Month 12:    12,000 tokens claimable (fully vested)
```

---

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for how to contribute to this project.

Open issues are tagged and ready for contributors on the [Stellar Wave Program](https://www.drips.network/wave/stellar).

---

## License

MIT
