# Contributing to Soroban Vesting

Thank you for your interest in contributing! This project is part of the **Stellar Wave Program** on [Drips](https://www.drips.network/wave/stellar), where contributors earn rewards for resolving issues.

---

## How to Contribute

1. Browse open issues on GitHub — look for the **`Stellar Wave`** label
2. Apply to an issue via the [Drips Wave App](https://www.drips.network/wave/stellar)
3. Fork the repo and create a branch: `git checkout -b feature/your-issue`
4. Make your changes, write tests, and ensure everything passes
5. Open a Pull Request referencing the issue: `Closes #<issue_id>`
6. Wait for review — the maintainer will merge and mark the issue resolved

---

## Development Setup

### Contract (Rust)
```bash
cd contract
cargo test          # run all tests
cargo clippy        # lint
cargo fmt           # format
```

### Frontend (TypeScript)
```bash
cd frontend
npm install
npm run dev         # start dev server
npm run lint        # lint
npm run build       # production build
```

---

## Code Standards

- **Rust:** follow `rustfmt` and `clippy` — no warnings allowed
- **TypeScript:** follow ESLint config — no `any` types without justification
- **Tests:** all new contract functions must have unit tests
- **Commits:** use conventional commits — `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
- **PRs:** must include a description of what was changed and how it was tested

---

## Issue Complexity Guide

Issues are tagged with complexity levels that map to Wave points:

| Complexity | Points | Examples |
|------------|--------|---------|
| Trivial    | 100    | Fix typo in docs, add missing comment |
| Medium     | 150    | Add a new query function, improve UI component |
| High       | 200    | New contract feature, major refactor, integration |

---

## Questions?

Open a GitHub Discussion or reach out via the [Drips Wave Discord](https://discord.gg/drips).
