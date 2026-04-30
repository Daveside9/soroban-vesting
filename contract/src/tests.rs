#[cfg(test)]
mod integration_tests {
    use soroban_sdk::{
        testutils::{Address as _, Ledger, LedgerInfo},
        token, Address, Env,
    };

    use crate::{VestingContract, VestingContractClient};

    // ── Helpers ───────────────────────────────────────────────────────────

    /// Deploy a test token and mint `amount` to `recipient`.
    fn create_token(env: &Env, admin: &Address) -> Address {
        let token_id = env.register_stellar_asset_contract_v2(admin.clone());
        token_id.address()
    }

    fn mint_tokens(env: &Env, token: &Address, admin: &Address, to: &Address, amount: i128) {
        let client = token::StellarAssetClient::new(env, token);
        client.mint(to, &amount);
    }

    fn token_balance(env: &Env, token: &Address, address: &Address) -> i128 {
        token::Client::new(env, token).balance(address)
    }

    /// Set the ledger timestamp.
    fn set_time(env: &Env, timestamp: u64) {
        env.ledger().set(LedgerInfo {
            timestamp,
            protocol_version: 21,
            sequence_number: env.ledger().sequence(),
            network_id: Default::default(),
            base_reserve: 10,
            min_temp_entry_ttl: 10,
            min_persistent_entry_ttl: 10,
            max_entry_ttl: 3_110_400,
        });
    }

    const MONTH: u64 = 30 * 24 * 3600;

    // ── Tests ─────────────────────────────────────────────────────────────

    #[test]
    fn test_initialize() {
        let env = Env::default();
        env.mock_all_auths();

        let owner = Address::generate(&env);
        let token = create_token(&env, &owner);
        let contract_id = env.register_contract(None, VestingContract);
        let client = VestingContractClient::new(&env, &contract_id);

        client.initialize(&owner, &token);

        assert_eq!(client.get_owner(), owner);
        assert_eq!(client.get_token(), token);
    }

    #[test]
    #[should_panic(expected = "AlreadyInitialized")]
    fn test_double_initialize_fails() {
        let env = Env::default();
        env.mock_all_auths();

        let owner = Address::generate(&env);
        let token = create_token(&env, &owner);
        let contract_id = env.register_contract(None, VestingContract);
        let client = VestingContractClient::new(&env, &contract_id);

        client.initialize(&owner, &token);
        client.initialize(&owner, &token); // should panic
    }

    #[test]
    fn test_create_schedule_and_claim_after_cliff() {
        let env = Env::default();
        env.mock_all_auths();

        let owner = Address::generate(&env);
        let beneficiary = Address::generate(&env);
        let token = create_token(&env, &owner);

        let contract_id = env.register_contract(None, VestingContract);
        let client = VestingContractClient::new(&env, &contract_id);

        // Fund owner with tokens
        mint_tokens(&env, &token, &owner, &owner, 12_000);

        // Approve contract to spend owner's tokens
        token::Client::new(&env, &token).approve(
            &owner,
            &contract_id,
            &12_000,
            &(env.ledger().sequence() + 100),
        );

        set_time(&env, 0);
        client.initialize(&owner, &token);

        // Create: 12,000 tokens, 3-month cliff, 12-month total
        client.create_schedule(
            &beneficiary,
            &0,
            &(3 * MONTH),
            &(12 * MONTH),
            &12_000,
            &true,
        );

        // At cliff (3 months) — 3,000 tokens should be claimable
        set_time(&env, 3 * MONTH);
        let info = client.get_vesting_info(&beneficiary);
        assert_eq!(info.claimable_amount, 3_000);

        let claimed = client.claim(&beneficiary);
        assert_eq!(claimed, 3_000);
        assert_eq!(token_balance(&env, &token, &beneficiary), 3_000);

        // At 6 months — 3,000 more claimable (6,000 total vested - 3,000 claimed)
        set_time(&env, 6 * MONTH);
        let info2 = client.get_vesting_info(&beneficiary);
        assert_eq!(info2.claimable_amount, 3_000);
    }

    #[test]
    fn test_nothing_claimable_during_cliff() {
        let env = Env::default();
        env.mock_all_auths();

        let owner = Address::generate(&env);
        let beneficiary = Address::generate(&env);
        let token = create_token(&env, &owner);

        let contract_id = env.register_contract(None, VestingContract);
        let client = VestingContractClient::new(&env, &contract_id);

        mint_tokens(&env, &token, &owner, &owner, 12_000);
        token::Client::new(&env, &token).approve(
            &owner,
            &contract_id,
            &12_000,
            &(env.ledger().sequence() + 100),
        );

        set_time(&env, 0);
        client.initialize(&owner, &token);
        client.create_schedule(&beneficiary, &0, &(3 * MONTH), &(12 * MONTH), &12_000, &true);

        // 1 month in — still in cliff
        set_time(&env, MONTH);
        let info = client.get_vesting_info(&beneficiary);
        assert_eq!(info.claimable_amount, 0);
    }

    #[test]
    fn test_fully_vested_after_duration() {
        let env = Env::default();
        env.mock_all_auths();

        let owner = Address::generate(&env);
        let beneficiary = Address::generate(&env);
        let token = create_token(&env, &owner);

        let contract_id = env.register_contract(None, VestingContract);
        let client = VestingContractClient::new(&env, &contract_id);

        mint_tokens(&env, &token, &owner, &owner, 12_000);
        token::Client::new(&env, &token).approve(
            &owner,
            &contract_id,
            &12_000,
            &(env.ledger().sequence() + 100),
        );

        set_time(&env, 0);
        client.initialize(&owner, &token);
        client.create_schedule(&beneficiary, &0, &(3 * MONTH), &(12 * MONTH), &12_000, &true);

        // 12 months in — fully vested
        set_time(&env, 12 * MONTH);
        let claimed = client.claim(&beneficiary);
        assert_eq!(claimed, 12_000);
        assert_eq!(token_balance(&env, &token, &beneficiary), 12_000);
    }

    #[test]
    fn test_revoke_returns_unvested_to_owner() {
        let env = Env::default();
        env.mock_all_auths();

        let owner = Address::generate(&env);
        let beneficiary = Address::generate(&env);
        let token = create_token(&env, &owner);

        let contract_id = env.register_contract(None, VestingContract);
        let client = VestingContractClient::new(&env, &contract_id);

        mint_tokens(&env, &token, &owner, &owner, 12_000);
        token::Client::new(&env, &token).approve(
            &owner,
            &contract_id,
            &12_000,
            &(env.ledger().sequence() + 100),
        );

        set_time(&env, 0);
        client.initialize(&owner, &token);
        client.create_schedule(&beneficiary, &0, &(3 * MONTH), &(12 * MONTH), &12_000, &true);

        // Revoke at 6 months — 6,000 vested, 6,000 unvested
        set_time(&env, 6 * MONTH);
        let returned = client.revoke(&beneficiary);
        assert_eq!(returned, 6_000);
        assert_eq!(token_balance(&env, &token, &owner), 6_000);

        // Beneficiary can still claim their 6,000 vested tokens
        let info = client.get_vesting_info(&beneficiary);
        assert_eq!(info.claimable_amount, 6_000);
    }

    #[test]
    #[should_panic(expected = "ScheduleAlreadyExists")]
    fn test_duplicate_schedule_fails() {
        let env = Env::default();
        env.mock_all_auths();

        let owner = Address::generate(&env);
        let beneficiary = Address::generate(&env);
        let token = create_token(&env, &owner);

        let contract_id = env.register_contract(None, VestingContract);
        let client = VestingContractClient::new(&env, &contract_id);

        mint_tokens(&env, &token, &owner, &owner, 24_000);
        token::Client::new(&env, &token).approve(
            &owner,
            &contract_id,
            &24_000,
            &(env.ledger().sequence() + 100),
        );

        client.initialize(&owner, &token);
        client.create_schedule(&beneficiary, &0, &(3 * MONTH), &(12 * MONTH), &12_000, &true);
        client.create_schedule(&beneficiary, &0, &(3 * MONTH), &(12 * MONTH), &12_000, &true); // panic
    }

    #[test]
    #[should_panic(expected = "NotRevocable")]
    fn test_revoke_non_revocable_fails() {
        let env = Env::default();
        env.mock_all_auths();

        let owner = Address::generate(&env);
        let beneficiary = Address::generate(&env);
        let token = create_token(&env, &owner);

        let contract_id = env.register_contract(None, VestingContract);
        let client = VestingContractClient::new(&env, &contract_id);

        mint_tokens(&env, &token, &owner, &owner, 12_000);
        token::Client::new(&env, &token).approve(
            &owner,
            &contract_id,
            &12_000,
            &(env.ledger().sequence() + 100),
        );

        client.initialize(&owner, &token);
        // revocable = false
        client.create_schedule(&beneficiary, &0, &(3 * MONTH), &(12 * MONTH), &12_000, &false);
        client.revoke(&beneficiary); // should panic
    }

    #[test]
    fn test_transfer_ownership() {
        let env = Env::default();
        env.mock_all_auths();

        let owner = Address::generate(&env);
        let new_owner = Address::generate(&env);
        let token = create_token(&env, &owner);

        let contract_id = env.register_contract(None, VestingContract);
        let client = VestingContractClient::new(&env, &contract_id);

        client.initialize(&owner, &token);
        client.transfer_ownership(&new_owner);

        assert_eq!(client.get_owner(), new_owner);
    }

    #[test]
    fn test_get_beneficiaries() {
        let env = Env::default();
        env.mock_all_auths();

        let owner = Address::generate(&env);
        let b1 = Address::generate(&env);
        let b2 = Address::generate(&env);
        let token = create_token(&env, &owner);

        let contract_id = env.register_contract(None, VestingContract);
        let client = VestingContractClient::new(&env, &contract_id);

        mint_tokens(&env, &token, &owner, &owner, 24_000);
        token::Client::new(&env, &token).approve(
            &owner,
            &contract_id,
            &24_000,
            &(env.ledger().sequence() + 100),
        );

        client.initialize(&owner, &token);
        client.create_schedule(&b1, &0, &(3 * MONTH), &(12 * MONTH), &12_000, &true);
        client.create_schedule(&b2, &0, &(3 * MONTH), &(12 * MONTH), &12_000, &true);

        let beneficiaries = client.get_beneficiaries();
        assert_eq!(beneficiaries.len(), 2);
    }
}
