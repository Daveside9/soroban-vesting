import { create } from 'zustand';
import {
  checkFreighterConnection,
  getWalletAddress,
  getWalletNetwork,
} from '../services/wallet';
import type { WalletState } from '../types';

interface WalletStore extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const useWalletStore = create<WalletStore>((set) => ({
  address: null,
  network: null,
  isConnected: false,
  isConnecting: false,
  error: null,

  connect: async () => {
    set({ isConnecting: true, error: null });
    try {
      const connected = await checkFreighterConnection();
      if (!connected) {
        throw new Error(
          'Freighter wallet not found. Please install the Freighter extension.',
        );
      }

      const [address, networkInfo] = await Promise.all([
        getWalletAddress(),
        getWalletNetwork(),
      ]);

      if (!address) {
        throw new Error('Could not retrieve wallet address from Freighter.');
      }

      set({
        address,
        network: networkInfo?.network ?? null,
        isConnected: true,
        isConnecting: false,
        error: null,
      });
    } catch (err) {
      set({
        isConnecting: false,
        error: err instanceof Error ? err.message : 'Failed to connect wallet',
      });
    }
  },

  disconnect: () => {
    set({
      address: null,
      network: null,
      isConnected: false,
      error: null,
    });
  },
}));
