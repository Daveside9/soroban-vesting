use soroban_sdk::{contracttype, Address, Env};

use crate::types::VestingSchedule;

// ── Storage key definitions ──────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    /// Contract owner address
    Owner,
    /// Address of the token being vested
    Token,
    /// Vesting schedule keyed by beneficiary address
    Schedule(Address),
    /// List of all beneficiary addresses (for enumeration)
    Beneficiaries,
    /// Whether the contract has been initialized
    Initialized,
}

// ── Owner ────────────────────────────────────────────────────────────────────

pub fn set_owner(env: &Env, owner: &Address) {
    env.storage().instance().set(&DataKey::Owner, owner);
}

pub fn get_owner(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Owner).unwrap()
}

pub fn has_owner(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Owner)
}

// ── Token ────────────────────────────────────────────────────────────────────

pub fn set_token(env: &Env, token: &Address) {
    env.storage().instance().set(&DataKey::Token, token);
}

pub fn get_token(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Token).unwrap()
}

// ── Initialized flag ─────────────────────────────────────────────────────────

pub fn set_initialized(env: &Env) {
    env.storage().instance().set(&DataKey::Initialized, &true);
}

pub fn is_initialized(env: &Env) -> bool {
    env.storage()
        .instance()
        .get(&DataKey::Initialized)
        .unwrap_or(false)
}

// ── Vesting schedules ────────────────────────────────────────────────────────

pub fn set_schedule(env: &Env, beneficiary: &Address, schedule: &VestingSchedule) {
    env.storage()
        .persistent()
        .set(&DataKey::Schedule(beneficiary.clone()), schedule);
}

pub fn get_schedule(env: &Env, beneficiary: &Address) -> Option<VestingSchedule> {
    env.storage()
        .persistent()
        .get(&DataKey::Schedule(beneficiary.clone()))
}

pub fn has_schedule(env: &Env, beneficiary: &Address) -> bool {
    env.storage()
        .persistent()
        .has(&DataKey::Schedule(beneficiary.clone()))
}

pub fn remove_schedule(env: &Env, beneficiary: &Address) {
    env.storage()
        .persistent()
        .remove(&DataKey::Schedule(beneficiary.clone()));
}

// ── Beneficiary list ─────────────────────────────────────────────────────────

pub fn get_beneficiaries(env: &Env) -> soroban_sdk::Vec<Address> {
    env.storage()
        .instance()
        .get(&DataKey::Beneficiaries)
        .unwrap_or(soroban_sdk::Vec::new(env))
}

pub fn add_beneficiary(env: &Env, beneficiary: &Address) {
    let mut list = get_beneficiaries(env);
    list.push_back(beneficiary.clone());
    env.storage()
        .instance()
        .set(&DataKey::Beneficiaries, &list);
}

pub fn remove_beneficiary(env: &Env, beneficiary: &Address) {
    let list = get_beneficiaries(env);
    let mut new_list = soroban_sdk::Vec::new(env);
    for addr in list.iter() {
        if addr != *beneficiary {
            new_list.push_back(addr);
        }
    }
    env.storage()
        .instance()
        .set(&DataKey::Beneficiaries, &new_list);
}
