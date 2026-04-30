#![no_std]

mod errors;
mod events;
mod storage;
mod tests;
mod types;
mod vesting;

use soroban_sdk::{
    contract, contractimpl, token, Address, Env, Vec,
};

use errors::VestingError;
use storage::*;
use types::{VestingInfo, VestingSchedule};
use vesting::{calculate_claimable, calculate_vested};

// ── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct VestingContract;

#[contractimpl]
impl VestingContract {
    // ── Initialization ────────────────────────────────────────────────────

    /// Initialize the contract with an owner and the token to be vested.
    ///
    /// Can only be called once.
    pub fn initialize(env: Env, owner: Address, token: Address) -> Result<(), VestingError> {
        if is_initialized(&env) {
            return Err(VestingError::AlreadyInitialized);
        }

        owner.require_auth();

        set_owner(&env, &owner);
        set_token(&env, &token);
        set_initialized(&env);

        Ok(())
    }

    // ── Schedule Management ───────────────────────────────────────────────

    /// Create a new vesting schedule for a beneficiary.
    ///
    /// The owner must have approved the contract to transfer `total_amount`
    /// tokens before calling this function.
    ///
    /// # Arguments
    /// * `beneficiary`      - address that will receive vested tokens
    /// * `start_time`       - unix timestamp when vesting begins
    /// * `cliff_duration`   - seconds before any tokens unlock
    /// * `total_duration`   - total vesting period in seconds (must be > cliff)
    /// * `total_amount`     - total tokens to vest
    /// * `revocable`        - whether the owner can cancel this schedule
    pub fn create_schedule(
        env: Env,
        beneficiary: Address,
        start_time: u64,
        cliff_duration: u64,
        total_duration: u64,
        total_amount: i128,
        revocable: bool,
    ) -> Result<(), VestingError> {
        if !is_initialized(&env) {
            return Err(VestingError::NotInitialized);
        }

        let owner = get_owner(&env);
        owner.require_auth();

        // Validate parameters
        if total_amount <= 0 {
            return Err(VestingError::InvalidAmount);
        }
        if total_duration == 0 || total_duration < cliff_duration {
            return Err(VestingError::InvalidDuration);
        }
        if has_schedule(&env, &beneficiary) {
            return Err(VestingError::ScheduleAlreadyExists);
        }

        // Transfer tokens from owner into the contract
        let token_client = token::Client::new(&env, &get_token(&env));
        token_client.transfer(&owner, &env.current_contract_address(), &total_amount);

        let schedule = VestingSchedule {
            beneficiary: beneficiary.clone(),
            start_time,
            cliff_duration,
            total_duration,
            total_amount,
            claimed_amount: 0,
            revoked: false,
            revocable,
        };

        set_schedule(&env, &beneficiary, &schedule);
        add_beneficiary(&env, &beneficiary);

        events::schedule_created(
            &env,
            &beneficiary,
            total_amount,
            cliff_duration,
            total_duration,
        );

        Ok(())
    }

    /// Claim all currently vested tokens for the calling beneficiary.
    pub fn claim(env: Env, beneficiary: Address) -> Result<i128, VestingError> {
        if !is_initialized(&env) {
            return Err(VestingError::NotInitialized);
        }

        beneficiary.require_auth();

        let mut schedule =
            get_schedule(&env, &beneficiary).ok_or(VestingError::ScheduleNotFound)?;

        if schedule.revoked {
            return Err(VestingError::ScheduleRevoked);
        }

        let claimable = calculate_claimable(&env, &schedule);
        if claimable == 0 {
            return Err(VestingError::NothingToClaim);
        }

        // Update claimed amount before transfer (checks-effects-interactions)
        schedule.claimed_amount += claimable;
        set_schedule(&env, &beneficiary, &schedule);

        // Transfer tokens to beneficiary
        let token_client = token::Client::new(&env, &get_token(&env));
        token_client.transfer(&env.current_contract_address(), &beneficiary, &claimable);

        events::tokens_claimed(&env, &beneficiary, claimable);

        Ok(claimable)
    }

    /// Revoke a vesting schedule (owner only).
    ///
    /// Transfers unvested tokens back to the owner.
    /// Already-vested tokens remain claimable by the beneficiary.
    pub fn revoke(env: Env, beneficiary: Address) -> Result<i128, VestingError> {
        if !is_initialized(&env) {
            return Err(VestingError::NotInitialized);
        }

        let owner = get_owner(&env);
        owner.require_auth();

        let mut schedule =
            get_schedule(&env, &beneficiary).ok_or(VestingError::ScheduleNotFound)?;

        if schedule.revoked {
            return Err(VestingError::ScheduleRevoked);
        }
        if !schedule.revocable {
            return Err(VestingError::NotRevocable);
        }

        let current_time = env.ledger().timestamp();
        let vested = calculate_vested(&schedule, current_time);
        let unvested = schedule.total_amount - vested;

        // Mark as revoked
        schedule.revoked = true;
        set_schedule(&env, &beneficiary, &schedule);

        // Return unvested tokens to owner
        if unvested > 0 {
            let token_client = token::Client::new(&env, &get_token(&env));
            token_client.transfer(&env.current_contract_address(), &owner, &unvested);
        }

        events::schedule_revoked(&env, &beneficiary, unvested);

        Ok(unvested)
    }

    // ── Ownership ─────────────────────────────────────────────────────────

    /// Transfer contract ownership to a new address.
    pub fn transfer_ownership(env: Env, new_owner: Address) -> Result<(), VestingError> {
        if !is_initialized(&env) {
            return Err(VestingError::NotInitialized);
        }

        let old_owner = get_owner(&env);
        old_owner.require_auth();

        set_owner(&env, &new_owner);
        events::ownership_transferred(&env, &old_owner, &new_owner);

        Ok(())
    }

    // ── Queries ───────────────────────────────────────────────────────────

    /// Get full vesting info for a beneficiary, including claimable amount.
    pub fn get_vesting_info(env: Env, beneficiary: Address) -> Result<VestingInfo, VestingError> {
        let schedule =
            get_schedule(&env, &beneficiary).ok_or(VestingError::ScheduleNotFound)?;

        let current_time = env.ledger().timestamp();
        let vested_amount = calculate_vested(&schedule, current_time);
        let claimable_amount = if schedule.revoked {
            0
        } else {
            let c = vested_amount - schedule.claimed_amount;
            if c < 0 { 0 } else { c }
        };

        Ok(VestingInfo {
            schedule,
            vested_amount,
            claimable_amount,
        })
    }

    /// Get the contract owner address.
    pub fn get_owner(env: Env) -> Result<Address, VestingError> {
        if !is_initialized(&env) {
            return Err(VestingError::NotInitialized);
        }
        Ok(storage::get_owner(&env))
    }

    /// Get the token address being vested.
    pub fn get_token(env: Env) -> Result<Address, VestingError> {
        if !is_initialized(&env) {
            return Err(VestingError::NotInitialized);
        }
        Ok(storage::get_token(&env))
    }

    /// Get all beneficiary addresses with active schedules.
    pub fn get_beneficiaries(env: Env) -> Vec<Address> {
        storage::get_beneficiaries(&env)
    }
}
