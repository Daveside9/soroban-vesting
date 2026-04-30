import {
  isConnected,
  getAddress,
  getNetwork,
  signTransaction,
} from '@stellar/freighter-api';

export interface FreighterNetwork {
  network: string;
  networkPassphrase: string;
}

/**
 * Check if Freighter wallet extension is installed and connected.
 */
export async function checkFreighterConnection(): Promise<boolean> {
  try {
    const connected = await isConnected();
    return connected.isConnected;
  } catch {
    return false;
  }
}

/**
 * Get the currently connected wallet address.
 */
export async function getWalletAddress(): Promise<string | null> {
  try {
    const result = await getAddress();
    return result.address ?? null;
  } catch {
    return null;
  }
}

/**
 * Get the current network from Freighter.
 */
export async function getWalletNetwork(): Promise<FreighterNetwork | null> {
  try {
    const result = await getNetwork();
    return {
      network: result.network,
      networkPassphrase: result.networkPassphrase,
    };
  } catch {
    return null;
  }
}

/**
 * Sign a transaction XDR string using Freighter.
 */
export async function signTx(
  xdr: string,
  networkPassphrase: string,
  address: string,
): Promise<string> {
  const result = await signTransaction(xdr, {
    networkPassphrase,
    address,
  });

  if (result.error) {
    throw new Error(result.error);
  }

  return result.signedTxXdr;
}
