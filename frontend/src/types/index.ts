// ── Vesting Types ─────────────────────────────────────────────────────────────

export interface VestingSchedule {
  beneficiary: string;
  startTime: number;       // unix timestamp (seconds)
  cliffDuration: number;   // seconds
  totalDuration: number;   // seconds
  totalAmount: bigint;
  claimedAmount: bigint;
  revoked: boolean;
  revocable: boolean;
}

export interface VestingInfo {
  schedule: VestingSchedule;
  vestedAmount: bigint;
  claimableAmount: bigint;
}

// ── Wallet Types ──────────────────────────────────────────────────────────────

export interface WalletState {
  address: string | null;
  network: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

// ── Contract Config ───────────────────────────────────────────────────────────

export interface ContractConfig {
  contractId: string;
  tokenId: string;
  networkPassphrase: string;
  rpcUrl: string;
}

// ── UI Types ──────────────────────────────────────────────────────────────────

export interface CreateScheduleForm {
  beneficiary: string;
  startDate: string;
  cliffMonths: number;
  totalMonths: number;
  totalAmount: string;
  revocable: boolean;
}

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}
