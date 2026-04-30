use soroban_sdk::{symbol_short, Address, Env};

/// Emitted when a new vesting schedule is created
pub fn schedule_created(
    env: &Env,
    beneficiary: &Address,
    total_amount: i128,
    cliff_duration: u64,
    total_duration: u64,
) {
    env.events().publish(
        (symbol_short!("CREATED"), beneficiary.clone()),
        (total_amount, cliff_duration, total_duration),
    );
}

/// Emitted when a beneficiary claims vested tokens
pub fn tokens_claimed(env: &Env, beneficiary: &Address, amount: i128) {
    env.events().publish(
        (symbol_short!("CLAIMED"), beneficiary.clone()),
        amount,
    );
}

/// Emitted when an owner revokes a vesting schedule
pub fn schedule_revoked(env: &Env, beneficiary: &Address, returned_amount: i128) {
    env.events().publish(
        (symbol_short!("REVOKED"), beneficiary.clone()),
        returned_amount,
    );
}

/// Emitted when ownership is transferred
pub fn ownership_transferred(env: &Env, old_owner: &Address, new_owner: &Address) {
    env.events().publish(
        (symbol_short!("OWNER"), old_owner.clone()),
        new_owner.clone(),
    );
}
