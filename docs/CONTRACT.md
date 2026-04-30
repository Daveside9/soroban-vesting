# Contract Reference

## Overview

The `VestingContract` is a Soroban smart contract that manages token vesting schedules on the Stellar blockchain. It supports cliff + linear vesting, multi-beneficiary schedules, and optional revocation by the owner.

---

## Functions

### `initialize(owner, token)`
Initializes the contract. Can only be called once.

| Param   | Type      | Description                        |
|---------|-----------|------------------------------------|
| `owner` | `Address` | Contract owner (creates schedules) |
| `token` | `Address` | Token contract to be vested        |

---

### `create_schedule(beneficiary, start_time, cliff_duration, total_duration, total_amount, revocable)`
Creates a new vesting schedule. Owner must have approved the contract to spend `total_amount` tokens.

| Param             | Type      | Description                                      |
|-------------------|-----------|--------------------------------------------------|
| `beneficiary`     | `Address` | Address that receives vested tokens              |
| `start_time`      | `u64`     | Unix timestamp when vesting begins               |
| `cliff_duration`  | `u64`     | Seconds before any tokens unlock                 |
| `total_duration`  | `u64`     | Total vesting period in seconds (≥ cliff)        |
| `total_amount`    | `i128`    | Total tokens to vest (must be > 0)               |
| `revocable`       | `bool`    | Whether owner can cancel this schedule           |

**Errors:** `AlreadyInitialized`, `NotOwner`, `ScheduleAlreadyExists`, `InvalidAmount`, `InvalidDuration`

---

### `claim(beneficiary)`
Claims all currently vested tokens. Must be called by the beneficiary.

Returns: `i128` — amount of tokens claimed.

**Errors:** `ScheduleNotFound`, `ScheduleRevoked`, `NothingToClaim`

---

### `revoke(beneficiary)`
Revokes a vesting schedule (owner only). Transfers unvested tokens back to the owner. Already-vested tokens remain claimable by the beneficiary.

Returns: `i128` — amount of unvested tokens returned to owner.

**Errors:** `ScheduleNotFound`, `ScheduleRevoked`, `NotRevocable`

---

### `transfer_ownership(new_owner)`
Transfers contract ownership to a new address. Owner only.

---

### `get_vesting_info(beneficiary)` *(read-only)*
Returns full vesting info including claimable amount.

Returns: `VestingInfo { schedule, vested_amount, claimable_amount }`

---

### `get_owner()` *(read-only)*
Returns the current owner address.

---

### `get_token()` *(read-only)*
Returns the token contract address.

---

### `get_beneficiaries()` *(read-only)*
Returns a list of all beneficiary addresses with schedules.

---

## Vesting Formula

```
if elapsed < cliff_duration:
    vested = 0
elif elapsed >= total_duration:
    vested = total_amount
else:
    vested = total_amount * elapsed / total_duration
```

`claimable = vested - claimed_amount`

---

## Events

| Event      | Topic                        | Data                                          |
|------------|------------------------------|-----------------------------------------------|
| `CREATED`  | `(CREATED, beneficiary)`     | `(total_amount, cliff_duration, total_duration)` |
| `CLAIMED`  | `(CLAIMED, beneficiary)`     | `amount`                                      |
| `REVOKED`  | `(REVOKED, beneficiary)`     | `returned_amount`                             |
| `OWNER`    | `(OWNER, old_owner)`         | `new_owner`                                   |

---

## Error Codes

| Code | Name                    | Description                                  |
|------|-------------------------|----------------------------------------------|
| 1    | `AlreadyInitialized`    | Contract already initialized                 |
| 2    | `NotOwner`              | Caller is not the owner                      |
| 3    | `ScheduleNotFound`      | No schedule for this beneficiary             |
| 4    | `ScheduleAlreadyExists` | Schedule already exists for beneficiary      |
| 5    | `NothingToClaim`        | No tokens available to claim                 |
| 6    | `ScheduleRevoked`       | Schedule has been revoked                    |
| 7    | `NotRevocable`          | Schedule cannot be revoked                   |
| 8    | `InvalidParameters`     | Invalid input parameters                     |
| 9    | `InvalidDuration`       | Duration invalid (cliff > total or zero)     |
| 10   | `InvalidAmount`         | Amount must be greater than zero             |
| 11   | `TransferFailed`        | Token transfer failed                        |
| 12   | `NotInitialized`        | Contract not yet initialized                 |
