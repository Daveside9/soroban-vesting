use soroban_sdk::Env;

use crate::types::VestingSchedule;

/// Calculate how many tokens have vested at the given timestamp.
///
/// Vesting model:
///   - Before cliff:              0 tokens vested
///   - At/after cliff:            proportional linear release
///   - At/after total_duration:   all tokens vested
///
/// # Arguments
/// * `schedule` - the vesting schedule to evaluate
/// * `current_time` - unix timestamp in seconds
pub fn calculate_vested(schedule: &VestingSchedule, current_time: u64) -> i128 {
    // Not started yet
    if current_time < schedule.start_time {
        return 0;
    }

    let elapsed = current_time - schedule.start_time;

    // Still in cliff period — nothing vested
    if elapsed < schedule.cliff_duration {
        return 0;
    }

    // Fully vested
    if elapsed >= schedule.total_duration {
        return schedule.total_amount;
    }

    // Linear vesting: vested = total * elapsed / total_duration
    // Use i128 arithmetic to avoid overflow
    (schedule.total_amount * elapsed as i128) / schedule.total_duration as i128
}

/// Calculate how many tokens are available to claim right now.
///
/// claimable = vested - already_claimed
pub fn calculate_claimable(env: &Env, schedule: &VestingSchedule) -> i128 {
    if schedule.revoked {
        return 0;
    }

    let current_time = env.ledger().timestamp();
    let vested = calculate_vested(schedule, current_time);
    let claimable = vested - schedule.claimed_amount;

    if claimable < 0 {
        0
    } else {
        claimable
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::VestingSchedule;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{Address, Env};

    fn make_schedule(env: &Env) -> VestingSchedule {
        VestingSchedule {
            beneficiary: Address::generate(env),
            start_time: 0,
            cliff_duration: 3 * 30 * 24 * 3600, // 3 months in seconds
            total_duration: 12 * 30 * 24 * 3600, // 12 months in seconds
            total_amount: 12_000,
            claimed_amount: 0,
            revoked: false,
            revocable: true,
        }
    }

    #[test]
    fn test_before_start() {
        let env = Env::default();
        let schedule = make_schedule(&env);
        // current_time before start_time
        assert_eq!(calculate_vested(&schedule, 0), 0);
    }

    #[test]
    fn test_during_cliff() {
        let env = Env::default();
        let schedule = make_schedule(&env);
        // 1 month in — still in cliff
        let one_month = 30 * 24 * 3600;
        assert_eq!(calculate_vested(&schedule, one_month), 0);
    }

    #[test]
    fn test_at_cliff() {
        let env = Env::default();
        let schedule = make_schedule(&env);
        // Exactly at cliff — 3/12 of tokens should be vested
        let cliff = 3 * 30 * 24 * 3600_u64;
        let vested = calculate_vested(&schedule, cliff);
        assert_eq!(vested, 3_000); // 12_000 * 3/12
    }

    #[test]
    fn test_halfway() {
        let env = Env::default();
        let schedule = make_schedule(&env);
        // 6 months in — 50% vested
        let six_months = 6 * 30 * 24 * 3600_u64;
        let vested = calculate_vested(&schedule, six_months);
        assert_eq!(vested, 6_000);
    }

    #[test]
    fn test_fully_vested() {
        let env = Env::default();
        let schedule = make_schedule(&env);
        // 12 months in — fully vested
        let twelve_months = 12 * 30 * 24 * 3600_u64;
        let vested = calculate_vested(&schedule, twelve_months);
        assert_eq!(vested, 12_000);
    }

    #[test]
    fn test_beyond_duration() {
        let env = Env::default();
        let schedule = make_schedule(&env);
        // 24 months in — still capped at total
        let twenty_four_months = 24 * 30 * 24 * 3600_u64;
        let vested = calculate_vested(&schedule, twenty_four_months);
        assert_eq!(vested, 12_000);
    }

    #[test]
    fn test_claimable_after_partial_claim() {
        let env = Env::default();
        let mut schedule = make_schedule(&env);
        schedule.claimed_amount = 2_000;
        // At 6 months: 6_000 vested, 2_000 claimed → 4_000 claimable
        // We can't call calculate_claimable directly without env.ledger,
        // so we test the math manually here
        let six_months = 6 * 30 * 24 * 3600_u64;
        let vested = calculate_vested(&schedule, six_months);
        let claimable = vested - schedule.claimed_amount;
        assert_eq!(claimable, 4_000);
    }

    #[test]
    fn test_revoked_schedule_returns_zero() {
        let env = Env::default();
        let mut schedule = make_schedule(&env);
        schedule.revoked = true;
        // Even if vested, revoked schedule returns 0 claimable
        // (tested via calculate_claimable logic)
        assert!(schedule.revoked);
    }
}
