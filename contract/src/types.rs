use soroban_sdk::{contracttype, Address};

/// Represents a single vesting schedule for a beneficiary.
#[contracttype]
#[derive(Clone, Debug)]
pub struct VestingSchedule {
    /// The address that will receive the vested tokens
    pub beneficiary: Address,
    /// Unix timestamp when vesting starts
    pub start_time: u64,
    /// Duration in seconds before any tokens unlock (cliff)
    pub cliff_duration: u64,
    /// Total vesting duration in seconds (including cliff)
    pub total_duration: u64,
    /// Total number of tokens to vest
    pub total_amount: i128,
    /// Tokens already claimed by the beneficiary
    pub claimed_amount: i128,
    /// Whether the owner has revoked this schedule
    pub revoked: bool,
    /// Whether this schedule can be revoked by the owner
    pub revocable: bool,
}

/// Summary returned when querying a vesting schedule
#[contracttype]
#[derive(Clone, Debug)]
pub struct VestingInfo {
    pub schedule: VestingSchedule,
    /// Amount currently vested (but may not be claimed yet)
    pub vested_amount: i128,
    /// Amount available to claim right now
    pub claimable_amount: i128,
}
