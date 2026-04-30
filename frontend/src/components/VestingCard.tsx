import React, { useState } from 'react';
import { format } from 'date-fns';
import { VestingChart } from './VestingChart';
import type { VestingInfo } from '../types';

interface Props {
  info: VestingInfo;
  isOwner: boolean;
  onClaim: () => Promise<void>;
  onRevoke: (beneficiary: string) => Promise<void>;
}

/**
 * Card displaying a single vesting schedule with actions.
 */
export function VestingCard({ info, isOwner, onClaim, onRevoke }: Props) {
  const [loading, setLoading] = useState(false);
  const { schedule, vestedAmount, claimableAmount } = info;

  const formatTs = (ts: number) =>
    format(new Date(ts * 1000), 'MMM d, yyyy');

  const formatAmount = (n: bigint) => Number(n).toLocaleString();

  const progressPct =
    schedule.totalAmount > 0n
      ? Math.min(
          100,
          Math.round((Number(vestedAmount) / Number(schedule.totalAmount)) * 100),
        )
      : 0;

  const handleClaim = async () => {
    setLoading(true);
    try {
      await onClaim();
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    setLoading(true);
    try {
      await onRevoke(schedule.beneficiary);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`vesting-card ${schedule.revoked ? 'revoked' : ''}`}>
      {/* Header */}
      <div className="vesting-card__header">
        <div>
          <p className="label">Beneficiary</p>
          <p className="address">{schedule.beneficiary}</p>
        </div>
        {schedule.revoked && <span className="badge badge--revoked">Revoked</span>}
      </div>

      {/* Stats grid */}
      <div className="vesting-card__stats">
        <Stat label="Total" value={formatAmount(schedule.totalAmount)} unit="tokens" />
        <Stat label="Vested" value={formatAmount(vestedAmount)} unit="tokens" />
        <Stat label="Claimed" value={formatAmount(schedule.claimedAmount)} unit="tokens" />
        <Stat label="Claimable" value={formatAmount(claimableAmount)} unit="tokens" highlight />
      </div>

      {/* Progress bar */}
      <div className="progress-bar">
        <div className="progress-bar__fill" style={{ width: `${progressPct}%` }} />
      </div>
      <p className="progress-label">{progressPct}% vested</p>

      {/* Timeline */}
      <div className="vesting-card__timeline">
        <TimePoint label="Start" date={formatTs(schedule.startTime)} />
        <TimePoint
          label="Cliff"
          date={formatTs(schedule.startTime + schedule.cliffDuration)}
        />
        <TimePoint
          label="End"
          date={formatTs(schedule.startTime + schedule.totalDuration)}
        />
      </div>

      {/* Chart */}
      <VestingChart schedule={schedule} />

      {/* Actions */}
      <div className="vesting-card__actions">
        {!schedule.revoked && claimableAmount > 0n && (
          <button
            className="btn btn-primary"
            onClick={handleClaim}
            disabled={loading}
          >
            {loading ? 'Claiming...' : `Claim ${formatAmount(claimableAmount)} tokens`}
          </button>
        )}
        {isOwner && schedule.revocable && !schedule.revoked && (
          <button
            className="btn btn-danger"
            onClick={handleRevoke}
            disabled={loading}
          >
            {loading ? 'Revoking...' : 'Revoke Schedule'}
          </button>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  highlight,
}: {
  label: string;
  value: string;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <div className={`stat ${highlight ? 'stat--highlight' : ''}`}>
      <p className="stat__label">{label}</p>
      <p className="stat__value">{value}</p>
      <p className="stat__unit">{unit}</p>
    </div>
  );
}

function TimePoint({ label, date }: { label: string; date: string }) {
  return (
    <div className="time-point">
      <p className="time-point__label">{label}</p>
      <p className="time-point__date">{date}</p>
    </div>
  );
}
