# GitHub Issues — Ready to Post

These are pre-written issues ready to create on GitHub.
Each one is scoped for the Stellar Wave Program (completable in one week).
Tag each with the `Stellar Wave` label after posting.

---

## 🔴 HIGH Complexity (200 points each)

---

### Issue #1 — Add multi-beneficiary batch schedule creation

**Title:** `feat: add batch create_schedules function for multiple beneficiaries`

**Description:**
Currently, the contract only supports creating one vesting schedule at a time via `create_schedule`. For teams doing token launches, it's common to vest tokens for 10–50 team members at once.

**Task:**
Add a `create_schedules_batch` function that accepts a vector of schedule parameters and creates all of them in a single transaction.

**Requirements:**
- Accept a `Vec` of schedule params (beneficiary, start_time, cliff, duration, amount, revocable)
- Validate all entries before processing any (all-or-nothing)
- Transfer the total token amount in one operation
- Emit a `CREATED` event for each schedule
- Write unit tests covering: happy path, partial invalid input, duplicate beneficiary in batch

**Acceptance criteria:**
- [ ] Function compiles and passes all tests
- [ ] Handles up to 20 beneficiaries per batch
- [ ] PR includes updated `CONTRACT.md` docs

---

### Issue #2 — Implement vesting schedule with custom unlock intervals

**Title:** `feat: support periodic unlock intervals (e.g. monthly, quarterly)`

**Description:**
The current linear vesting releases tokens continuously. Some use cases require discrete periodic unlocks — e.g. unlock 25% every quarter rather than a smooth curve.

**Task:**
Add an optional `unlock_interval` parameter to `create_schedule`. When set, tokens unlock in discrete chunks at each interval boundary rather than continuously.

**Requirements:**
- New optional field `unlock_interval: Option<u64>` (seconds between unlocks)
- When `None`, behaves as current linear vesting
- When `Some(interval)`, tokens unlock in equal chunks at each interval
- Update `calculate_vested` in `vesting.rs` to handle both modes
- Write tests for quarterly, monthly, and annual unlock intervals

**Acceptance criteria:**
- [ ] Both vesting modes work correctly
- [ ] Existing tests still pass
- [ ] New tests cover interval edge cases

---

### Issue #3 — Build admin dashboard page for owner

**Title:** `feat: build owner admin dashboard with all schedules overview`

**Description:**
The current dashboard shows a user their own schedule. Owners need a dedicated admin view to manage all schedules across all beneficiaries.

**Task:**
Create a new `/admin` route in the frontend with a full admin dashboard.

**Requirements:**
- List all beneficiaries with their schedule status (active, fully vested, revoked)
- Show aggregate stats: total tokens locked, total claimed, total unvested
- Allow owner to revoke any revocable schedule from the UI
- Allow owner to create new schedules from the UI
- Protect the route — only show if connected wallet matches owner address

**Acceptance criteria:**
- [ ] Admin page renders correctly with mock data
- [ ] Revoke action calls contract and refreshes data
- [ ] Aggregate stats are calculated correctly
- [ ] Route is hidden for non-owners

---

### Issue #4 — Add token approval flow before creating a schedule

**Title:** `feat: implement token approval step in create schedule flow`

**Description:**
Before the owner can create a vesting schedule, they must approve the contract to spend their tokens. Currently this step is not handled in the frontend — users get a confusing error.

**Task:**
Add an approval step to the `CreateScheduleForm` flow that checks the current allowance and prompts the user to approve if needed.

**Requirements:**
- Check current token allowance for the contract before submitting
- If allowance is insufficient, show an "Approve Tokens" button first
- After approval transaction confirms, automatically proceed to create schedule
- Show clear status messages: "Approving...", "Approved ✓", "Creating schedule..."
- Handle approval errors gracefully

**Acceptance criteria:**
- [ ] Two-step flow works end-to-end on testnet
- [ ] UI clearly communicates each step
- [ ] No duplicate approval if allowance is already sufficient

---

## 🟡 MEDIUM Complexity (150 points each)

---

### Issue #5 — Add `get_vesting_summary` query returning aggregate stats

**Title:** `feat: add get_vesting_summary contract function`

**Description:**
Add a read-only contract function that returns aggregate statistics across all vesting schedules.

**Task:**
Implement `get_vesting_summary()` returning:
- `total_schedules: u32`
- `active_schedules: u32`
- `revoked_schedules: u32`
- `total_tokens_locked: i128`
- `total_tokens_claimed: i128`
- `total_tokens_vested: i128`

**Requirements:**
- Iterate over all beneficiaries and aggregate stats
- Write unit tests with multiple schedules in different states

**Acceptance criteria:**
- [ ] Function returns correct values
- [ ] Tests cover: all active, mix of revoked/active, all claimed

---

### Issue #6 — Add vesting progress notification banner to frontend

**Title:** `feat: add vesting milestone notification banners`

**Description:**
Users should be notified when they reach key vesting milestones: cliff reached, 50% vested, fully vested.

**Task:**
Add a notification system that shows banners when the user's schedule hits a milestone.

**Requirements:**
- Check milestones on page load and after each claim
- Show dismissible banner for: cliff reached, 50% vested, 100% vested
- Store dismissed state in `localStorage` so banners don't reappear
- Use the existing CSS variables for styling (no new dependencies)

**Acceptance criteria:**
- [ ] Banners appear at correct milestones
- [ ] Dismissed banners don't reappear on refresh
- [ ] Works correctly when no schedule exists

---

### Issue #7 — Add dark/light theme toggle

**Title:** `feat: add dark/light theme toggle to navbar`

**Description:**
The app currently only supports dark mode. Add a theme toggle so users can switch to light mode.

**Task:**
Implement a theme toggle button in the navbar that switches between dark and light CSS themes.

**Requirements:**
- Add light theme CSS variables to `global.css`
- Toggle button in the navbar (moon/sun icon)
- Persist preference in `localStorage`
- Apply theme class to `<html>` element
- All existing components must look correct in both themes

**Acceptance criteria:**
- [ ] Toggle works without page reload
- [ ] Preference persists across sessions
- [ ] No hardcoded colors remain — all use CSS variables

---

### Issue #8 — Write end-to-end integration test for full vesting lifecycle

**Title:** `test: add full lifecycle integration test (create → cliff → claim → revoke)`

**Description:**
There is no test that covers the complete lifecycle of a vesting schedule from creation through to full claim or revocation.

**Task:**
Write a comprehensive integration test in `contract/src/tests.rs` that covers:

1. Initialize contract
2. Create a revocable schedule
3. Assert nothing claimable during cliff
4. Assert partial claim at cliff
5. Claim at cliff
6. Assert remaining claimable at 6 months
7. Revoke at 9 months
8. Assert unvested returned to owner
9. Assert beneficiary can still claim their 9-month vested portion
10. Assert no more claimable after full claim post-revoke

**Acceptance criteria:**
- [ ] Test passes with `cargo test`
- [ ] Each step has a clear comment explaining what is being asserted
- [ ] No use of `unwrap()` without explanation

---

### Issue #9 — Add CSV export of all vesting schedules

**Title:** `feat: add CSV export button for all vesting schedules`

**Description:**
Owners need to export vesting data for accounting and reporting purposes.

**Task:**
Add an "Export CSV" button to the admin dashboard that downloads all vesting schedules as a CSV file.

**Requirements:**
- Columns: Beneficiary, Start Date, Cliff Date, End Date, Total Amount, Vested Amount, Claimed Amount, Status
- Use browser's native download (no server required)
- Format dates as `YYYY-MM-DD`
- Format amounts as plain numbers (no commas)
- Button only visible to owner

**Acceptance criteria:**
- [ ] CSV downloads correctly in Chrome and Firefox
- [ ] All columns present and correctly formatted
- [ ] Empty state handled (no schedules)

---

## 🟢 TRIVIAL Complexity (100 points each)

---

### Issue #10 — Add input validation for Stellar address format in frontend

**Title:** `fix: improve Stellar address validation in CreateScheduleForm`

**Description:**
The current address validation uses a basic regex. It should also check the checksum using the Stellar SDK.

**Task:**
Replace the regex check in `CreateScheduleForm.tsx` with `StrKey.isValidEd25519PublicKey()` from `@stellar/stellar-sdk`.

**Acceptance criteria:**
- [ ] Invalid addresses show a clear error message
- [ ] Valid addresses pass without error
- [ ] No new dependencies added

---

### Issue #11 — Add loading skeleton to VestingCard while data fetches

**Title:** `feat: add skeleton loading state to VestingCard`

**Description:**
When the dashboard loads, there is a plain "Loading..." text. Replace it with a skeleton UI that matches the VestingCard layout.

**Task:**
Create a `VestingCardSkeleton` component that renders a pulsing placeholder matching the VestingCard structure.

**Requirements:**
- Use CSS animation (`@keyframes pulse`) — no new libraries
- Match the card layout: header, stats grid, progress bar, timeline
- Show 2 skeleton cards while loading

**Acceptance criteria:**
- [ ] Skeleton renders during loading state
- [ ] Animation is smooth (60fps)
- [ ] Removed once data loads

---

### Issue #12 — Add copy-to-clipboard button for contract ID and beneficiary addresses

**Title:** `feat: add copy-to-clipboard for addresses in the UI`

**Description:**
Long Stellar addresses are hard to copy manually. Add a copy button next to all displayed addresses.

**Task:**
Create a reusable `CopyButton` component that copies text to clipboard and shows a "Copied!" confirmation.

**Requirements:**
- Use `navigator.clipboard.writeText()`
- Show "Copied!" for 2 seconds then revert to copy icon
- Add to: beneficiary address in VestingCard, contract ID in footer/docs

**Acceptance criteria:**
- [ ] Works in Chrome and Firefox
- [ ] Confirmation message disappears after 2 seconds
- [ ] Accessible (keyboard focusable, aria-label)

---

### Issue #13 — Write deployment guide for Stellar Mainnet

**Title:** `docs: add mainnet deployment guide`

**Description:**
`DEPLOYMENT.md` only covers testnet. Add a section for deploying to Stellar Mainnet.

**Task:**
Add a "Deploy to Mainnet" section to `docs/DEPLOYMENT.md` covering:
- Network passphrase for mainnet
- Funding the deployer account with real XLM
- Changing `VITE_NETWORK_PASSPHRASE` and `VITE_RPC_URL`
- Security checklist before mainnet deploy (audit, test coverage, key management)

**Acceptance criteria:**
- [ ] Guide is accurate and complete
- [ ] Security checklist has at least 5 items
- [ ] Links to Stellar Mainnet explorer

---

### Issue #14 — Add `tsconfig.json` path aliases for cleaner imports

**Title:** `chore: configure TypeScript path aliases in frontend`

**Description:**
Frontend imports use relative paths like `../../services/contract`. Configure `@/` path alias so imports become `@/services/contract`.

**Task:**
Update `tsconfig.json` and `vite.config.ts` to support `@/` as an alias for `src/`.
Then update all existing imports in the frontend to use the alias.

**Acceptance criteria:**
- [ ] `@/` alias works in all `.tsx` and `.ts` files
- [ ] `npm run build` passes without errors
- [ ] All relative `../../` imports replaced

---

### Issue #15 — Add GitHub Actions CI workflow for contract tests

**Title:** `ci: add GitHub Actions workflow to run Soroban contract tests`

**Description:**
There is no CI pipeline. Add a GitHub Actions workflow that runs `cargo test` on every push and pull request.

**Task:**
Create `.github/workflows/contract-tests.yml` that:
- Triggers on push to `main` and all pull requests
- Sets up Rust with the `wasm32-unknown-unknown` target
- Runs `cargo test` in the `contract/` directory
- Caches the Cargo registry for faster runs

**Acceptance criteria:**
- [ ] Workflow file is valid YAML
- [ ] Tests run successfully in CI
- [ ] Cache step reduces subsequent run times

---

## Summary

| # | Title | Complexity | Points |
|---|-------|------------|--------|
| 1 | Batch schedule creation | High | 200 |
| 2 | Periodic unlock intervals | High | 200 |
| 3 | Admin dashboard page | High | 200 |
| 4 | Token approval flow | High | 200 |
| 5 | get_vesting_summary function | Medium | 150 |
| 6 | Milestone notification banners | Medium | 150 |
| 7 | Dark/light theme toggle | Medium | 150 |
| 8 | Full lifecycle integration test | Medium | 150 |
| 9 | CSV export of schedules | Medium | 150 |
| 10 | Stellar address validation fix | Trivial | 100 |
| 11 | Loading skeleton for VestingCard | Trivial | 100 |
| 12 | Copy-to-clipboard for addresses | Trivial | 100 |
| 13 | Mainnet deployment guide | Trivial | 100 |
| 14 | TypeScript path aliases | Trivial | 100 |
| 15 | GitHub Actions CI workflow | Trivial | 100 |

**Total potential points: 2,200**
