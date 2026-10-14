import { useEffect, useState } from 'react';

export type Run = {
  id: string;
  game: string;
  score: number;
  accuracy: number;
  duration: number;
  difficulty: string;
  date: string;
};
export type Player = { name: string; theme: 'dark' | 'light' };
type Store = { profile: Player; runs: Run[] };
const KEY = 'mindmatrix.v1';
const defaults: Store = { profile: { name: 'Alex Morgan', theme: 'dark' }, runs: [] };

export function readStore(): Store {
  try {
    const saved = localStorage.getItem(KEY);
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  } catch {
    return defaults;
  }
}
export function writeStore(store: Store) {
  localStorage.setItem(KEY, JSON.stringify(store));
  window.dispatchEvent(new Event('mindmatrix-change'));
}
export function useStore() {
  const [store, setStore] = useState<Store>(defaults);
  useEffect(() => {
    setStore(readStore());
    const sync = () => setStore(readStore());
    window.addEventListener('mindmatrix-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('mindmatrix-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const update = (patch: Partial<Store>) => {
    const next = { ...readStore(), ...patch };
    writeStore(next);
    setStore(next);
  };
  const saveRun = (run: Omit<Run, 'id' | 'date'>) => {
    const next = { ...readStore(), runs: [{ ...run, id: crypto.randomUUID(), date: new Date().toISOString() }, ...readStore().runs] };
    writeStore(next);
    setStore(next);
  };
  return { ...store, update, saveRun };
}
export const games = [
  { id: 'memory-match', title: 'Memory matrix', skill: 'Working memory', description: 'Hold the grid in your mind. Find every matching pair.', time: '60 sec', color: 'violet', icon: '▦' },
  { id: 'reaction-test', title: 'Signal / response', skill: 'Processing speed', description: 'Wait for the signal. Respond the instant it turns live.', time: '10 trials', color: 'mint', icon: '↗' },
  { id: 'number-sequence', title: 'Sequence logic', skill: 'Pattern logic', description: 'Read the rule behind the numbers. Complete the sequence.', time: '5 rounds', color: 'amber', icon: '∑' },
  { id: 'pattern-recognition', title: 'Pattern scan', skill: 'Visual attention', description: 'Spot the one detail that breaks the visual rhythm.', time: '8 rounds', color: 'pink', icon: '◈' },
];
