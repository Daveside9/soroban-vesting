import {
  Contract,
  Networks,
  SorobanRpc,
  TransactionBuilder,
  BASE_FEE,
  xdr,
  scValToNative,
  nativeToScVal,
  Address,
} from '@stellar/stellar-sdk';
import { signTx } from './wallet';
import type { VestingInfo, ContractConfig } from '../types';

const TRANSACTION_POLL_INTERVAL_MS = 1000;
const TRANSACTION_POLL_TIMEOUT_MS = 60_000;

// Default testnet config — override via environment variables
export const DEFAULT_CONFIG: ContractConfig = {
  contractId: import.meta.env.VITE_CONTRACT_ID ?? '',
  tokenId: import.meta.env.VITE_TOKEN_ID ?? '',
  networkPassphrase: Networks.TESTNET,
  rpcUrl: import.meta.env.VITE_RPC_URL ?? 'https://soroban-testnet.stellar.org',
};

/**
 * Build and submit a Soroban contract transaction.
 */
async function invokeContract(
  config: ContractConfig,
  walletAddress: string,
  method: string,
  args: xdr.ScVal[],
): Promise<xdr.ScVal> {
  const server = new SorobanRpc.Server(config.rpcUrl);
  const contract = new Contract(config.contractId);

  const account = await server.getAccount(walletAddress);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  // Simulate to get the footprint
  const simResult = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  const preparedTx = SorobanRpc.assembleTransaction(tx, simResult).build();

  // Sign with Freighter
  const signedXdr = await signTx(
    preparedTx.toXDR(),
    config.networkPassphrase,
    walletAddress,
  );

  // Submit
  const submitResult = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedXdr, config.networkPassphrase),
  );

  if (submitResult.status === 'ERROR') {
    throw new Error(`Transaction failed: ${submitResult.errorResult}`);
  }

  // Poll for result
  const pollStartedAt = Date.now();
  let getResult = await server.getTransaction(submitResult.hash);
  while (getResult.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND) {
    if (Date.now() - pollStartedAt >= TRANSACTION_POLL_TIMEOUT_MS) {
      throw new Error(
        `Timed out waiting for transaction ${submitResult.hash} after ${
          TRANSACTION_POLL_TIMEOUT_MS / 1000
        } seconds`,
      );
    }

    await new Promise((r) => setTimeout(r, TRANSACTION_POLL_INTERVAL_MS));
    getResult = await server.getTransaction(submitResult.hash);
  }

  if (getResult.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
    throw new Error('Transaction failed on-chain');
  }

  return getResult.returnValue ?? xdr.ScVal.scvVoid();
}

// ── Contract Methods ──────────────────────────────────────────────────────────

/**
 * Create a new vesting schedule for a beneficiary.
 */
export async function createSchedule(
  config: ContractConfig,
  walletAddress: string,
  params: {
    beneficiary: string;
    startTime: number;
    cliffDuration: number;
    totalDuration: number;
    totalAmount: bigint;
    revocable: boolean;
  },
): Promise<void> {
  await invokeContract(config, walletAddress, 'create_schedule', [
    new Address(params.beneficiary).toScVal(),
    nativeToScVal(params.startTime, { type: 'u64' }),
    nativeToScVal(params.cliffDuration, { type: 'u64' }),
    nativeToScVal(params.totalDuration, { type: 'u64' }),
    nativeToScVal(params.totalAmount, { type: 'i128' }),
    nativeToScVal(params.revocable, { type: 'bool' }),
  ]);
}

/**
 * Claim all available vested tokens for the calling beneficiary.
 */
export async function claimTokens(
  config: ContractConfig,
  walletAddress: string,
): Promise<bigint> {
  const result = await invokeContract(config, walletAddress, 'claim', [
    new Address(walletAddress).toScVal(),
  ]);
  return BigInt(scValToNative(result));
}

/**
 * Revoke a vesting schedule (owner only).
 */
export async function revokeSchedule(
  config: ContractConfig,
  walletAddress: string,
  beneficiary: string,
): Promise<bigint> {
  const result = await invokeContract(config, walletAddress, 'revoke', [
    new Address(beneficiary).toScVal(),
  ]);
  return BigInt(scValToNative(result));
}

/**
 * Transfer contract ownership.
 */
export async function transferOwnership(
  config: ContractConfig,
  walletAddress: string,
  newOwner: string,
): Promise<void> {
  await invokeContract(config, walletAddress, 'transfer_ownership', [
    new Address(newOwner).toScVal(),
  ]);
}

/**
 * Query vesting info for a beneficiary (read-only simulation).
 */
export async function getVestingInfo(
  config: ContractConfig,
  beneficiary: string,
): Promise<VestingInfo> {
  const server = new SorobanRpc.Server(config.rpcUrl);
  const contract = new Contract(config.contractId);

  // Use a dummy account for read-only simulation
  const dummyAccount = {
    accountId: () => beneficiary,
    sequenceNumber: () => '0',
    incrementSequenceNumber: () => {},
  };

  const tx = new TransactionBuilder(dummyAccount as any, {
    fee: BASE_FEE,
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(
      contract.call('get_vesting_info', new Address(beneficiary).toScVal()),
    )
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Query failed: ${simResult.error}`);
  }

  const raw = scValToNative((simResult as any).result?.retval);
  return parseVestingInfo(raw);
}

/**
 * Get all beneficiary addresses.
 */
export async function getBeneficiaries(
  config: ContractConfig,
): Promise<string[]> {
  const server = new SorobanRpc.Server(config.rpcUrl);
  const contract = new Contract(config.contractId);

  const dummyAccount = {
    accountId: () => 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
    sequenceNumber: () => '0',
    incrementSequenceNumber: () => {},
  };

  const tx = new TransactionBuilder(dummyAccount as any, {
    fee: BASE_FEE,
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(contract.call('get_beneficiaries'))
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Query failed: ${simResult.error}`);
  }

  const raw = scValToNative((simResult as any).result?.retval);
  return Array.isArray(raw) ? raw : [];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseVestingInfo(raw: any): VestingInfo {
  const s = raw.schedule ?? raw;
  return {
    schedule: {
      beneficiary: s.beneficiary,
      startTime: Number(s.start_time),
      cliffDuration: Number(s.cliff_duration),
      totalDuration: Number(s.total_duration),
      totalAmount: BigInt(s.total_amount),
      claimedAmount: BigInt(s.claimed_amount),
      revoked: Boolean(s.revoked),
      revocable: Boolean(s.revocable),
    },
    vestedAmount: BigInt(raw.vested_amount ?? 0),
    claimableAmount: BigInt(raw.claimable_amount ?? 0),
  };
}
