import React from 'react';
import { useWalletStore } from '../store/walletStore';

/**
 * Connect / disconnect Freighter wallet button.
 * Shows a truncated address when connected.
 */
export function WalletButton() {
  const { address, isConnected, isConnecting, error, connect, disconnect } =
    useWalletStore();

  const truncate = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (isConnected && address) {
    return (
      <div className="wallet-connected">
        <span className="wallet-address">{truncate(address)}</span>
        <button className="btn btn-outline" onClick={disconnect}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-disconnected">
      {error && <span className="wallet-error">{error}</span>}
      <button
        className="btn btn-primary"
        onClick={connect}
        disabled={isConnecting}
      >
        {isConnecting ? 'Connecting...' : 'Connect Freighter'}
      </button>
    </div>
  );
}
