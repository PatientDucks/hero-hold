import type { WaveSpawnEntry, EnemyDefId } from './types.ts';
import { BOSS_WAVE } from './config.ts';

const SPAWN_GAP_MS = 900;

/** Builds the ordered spawn queue for a wave: grunts scaling with wave number, brutes from wave 4+, a boss on the final wave. */
export function buildWaveSpawnQueue(wave: number): WaveSpawnEntry[] {
  if (wave === BOSS_WAVE) {
    const entries: WaveSpawnEntry[] = [];
    for (let i = 0; i < 4; i++) {
      entries.push({ defId: 'grunt', delayMs: i === 0 ? 0 : SPAWN_GAP_MS });
    }
    entries.push({ defId: 'boss', delayMs: SPAWN_GAP_MS * 2 });
    return entries;
  }

  const gruntCount = 4 + Math.floor(wave * 1.5);
  const bruteCount = wave >= 4 ? Math.floor((wave - 2) / 2) : 0;

  const ids: EnemyDefId[] = [];
  for (let i = 0; i < gruntCount; i++) ids.push('grunt');
  for (let i = 0; i < bruteCount; i++) ids.push('brute');

  // Interleave brutes among grunts so they don't all clump at the end.
  ids.sort(() => Math.random() - 0.5);

  return ids.map((defId, i) => ({ defId, delayMs: i === 0 ? 0 : SPAWN_GAP_MS }));
}
