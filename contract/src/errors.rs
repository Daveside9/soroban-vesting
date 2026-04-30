use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum VestingError {
    /// Contract has already been initialized
    AlreadyInitialized = 1,
    /// Caller is not the contract owner
    NotOwner = 2,
    /// No vesting schedule found for this beneficiary
    ScheduleNotFound = 3,
    /// Vesting schedule already exists for this beneficiary
    ScheduleAlreadyExists = 4,
    /// Nothing available to claim yet
    NothingToClaim = 5,
    /// Schedule has been revoked and cannot be interacted with
    ScheduleRevoked = 6,
    /// Schedule is not revocable
    NotRevocable = 7,
    /// Invalid vesting parameters provided
    InvalidParameters = 8,
    /// Total duration must be greater than cliff duration
    InvalidDuration = 9,
    /// Total amount must be greater than zero
    InvalidAmount = 10,
    /// Token transfer failed
    TransferFailed = 11,
    /// Contract has not been initialized yet
    NotInitialized = 12,
}
