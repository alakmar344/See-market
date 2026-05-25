import { create } from 'zustand';

type WatchlistState = {
  darkMode: boolean;
  watchlist: string[];
  toggleDarkMode: () => void;
  addSymbol: (symbol: string) => void;
  removeSymbol: (symbol: string) => void;
};

export const useMarketStore = create<WatchlistState>((set) => ({
  darkMode: true,
  watchlist: ['AAPL', 'BTCUSDT'],
  toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
  addSymbol: (symbol: string) => set((s) => ({ watchlist: Array.from(new Set([...s.watchlist, symbol.toUpperCase()])) })),
  removeSymbol: (symbol: string) =>
    set((s) => ({ watchlist: s.watchlist.filter((item) => item !== symbol.toUpperCase()) })),
}));
