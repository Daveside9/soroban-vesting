import React, { useEffect, useState, useCallback } from 'react';
import { VestingCard } from '../components/VestingCard';
import { CreateScheduleForm } from '../components/CreateScheduleForm';
import { useWalletStore } from '../store/walletStore';
import {
  getVestingInfo,
  getBeneficiaries,
  claimTokens,
  revokeSchedule,
  createSchedule,
  DEFAULT_CONFIG,
} from '../services/contract';
import type { VestingInfo, CreateScheduleForm as FormData } from '../types';

/**
 * Main dashboard page.
 * - Shows the connected user's own vesting schedule (if any)
 * - If owner: shows all schedules + create form
 */
export function Dashboard() {
  const { address, isConnected } = useWalletStore();

  const [myInfo, setMyInfo] = useState<VestingInfo | null>(null);
  const [allInfos, setAllInfos] = useState<VestingInfo[]>([]);
  const [ownerAddress, setOwnerAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const isOwner = !!address && address === ownerAddress;

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchMySchedule = useCallback(async () => {
    if (!address) return;
    try {
      const info = await getVestingInfo(DEFAULT_CONFIG, address);
      setMyInfo(info);
    } catch {
      // No schedule for this address — that's fine
      setMyInfo(null);
    }
  }, [address]);

  const fetchAllSchedules = useCallback(async () => {
    try {
      const beneficiaries = await getBeneficiaries(DEFAULT_CONFIG);
      const infos = await Promise.all(
        beneficiaries.map((b) => getVestingInfo(DEFAULT_CONFIG, b)),
      );
      setAllInfos(infos);
    } catch (err) {
      console.error('Failed to fetch all schedules', err);
    }
  }, []);

  useEffect(() => {
    if (!isConnected) return;
    setLoading(true);
    Promise.all([fetchMySchedule(), fetchAllSchedules()])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isConnected, fetchMySchedule, fetchAllSchedules]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleClaim = async () => {
    if (!address) return;
    await claimTokens(DEFAULT_CONFIG, address);
    await fetchMySchedule();
  };

  const handleRevoke = async (beneficiary: string) => {
    if (!address) return;
    await revokeSchedule(DEFAULT_CONFIG, address, beneficiary);
    await fetchAllSchedules();
  };

  const handleCreate = async (form: FormData) => {
    if (!address) return;

    const startTime = Math.floor(new Date(form.startDate).getTime() / 1000);
    const monthInSeconds = 30 * 24 * 3600;

    await createSchedule(DEFAULT_CONFIG, address, {
      beneficiary: form.beneficiary,
      startTime,
      cliffDuration: form.cliffMonths * monthInSeconds,
      totalDuration: form.totalMonths * monthInSeconds,
      totalAmount: BigInt(Math.round(Number(form.totalAmount))),
      revocable: form.revocable,
    });

    setShowCreateForm(false);
    await fetchAllSchedules();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (!isConnected) {
    return (
      <div className="dashboard-empty">
        <h2>Connect your wallet to view your vesting schedule</h2>
      </div>
    );
  }

  if (loading) {
    return <div className="dashboard-loading">Loading schedules...</div>;
  }

  if (error) {
    return <div className="dashboard-error">Error: {error}</div>;
  }

  return (
    <div className="dashboard">
      {/* My Schedule */}
      <section className="dashboard__section">
        <h2>My Vesting Schedule</h2>
        {myInfo ? (
          <VestingCard
            info={myInfo}
            isOwner={isOwner}
            onClaim={handleClaim}
            onRevoke={handleRevoke}
          />
        ) : (
          <p className="empty-state">No vesting schedule found for your address.</p>
        )}
      </section>

      {/* Owner: All Schedules */}
      {isOwner && (
        <section className="dashboard__section">
          <div className="section-header">
            <h2>All Schedules ({allInfos.length})</h2>
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateForm((v) => !v)}
            >
              {showCreateForm ? 'Cancel' : '+ New Schedule'}
            </button>
          </div>

          {showCreateForm && (
            <CreateScheduleForm onSubmit={handleCreate} />
          )}

          <div className="schedules-grid">
            {allInfos.map((info) => (
              <VestingCard
                key={info.schedule.beneficiary}
                info={info}
                isOwner={isOwner}
                onClaim={handleClaim}
                onRevoke={handleRevoke}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
