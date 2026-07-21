import type { WaveSpawnEntry, EnemyDefId } from './types.ts';
import { BOSS_WAVE } from './config.ts';

const SPAWN_GAP_MS = 900;

/**
 * Builds the ordered spawn queue for a wave. Enemy variety unlocks progressively:
 * grunts from wave 1, skirmishers (fast/squishy) from wave 2, brutes (slow/tanky)
 * from wave 4, reavers (tough generalist) from wave 7. Wave 10 is a boss wave —
 * a short chaff escort followed by the boss itself.
 */
export function buildWaveSpawnQueue(wave: number): WaveSpawnEntry[] {
  if (wave === BOSS_WAVE) {
    const escorts: EnemyDefId[] = ['grunt', 'grunt', 'skirmisher', 'skirmisher', 'brute'];
    const entries: WaveSpawnEntry[] = escorts.map((defId, i) => ({ defId, delayMs: i === 0 ? 0 : SPAWN_GAP_MS }));
    entries.push({ defId: 'boss', delayMs: SPAWN_GAP_MS * 3 });
    return entries;
  }

  const gruntCount = 3 + Math.floor(wave * 1.2);
  const skirmisherCount = wave >= 2 ? 2 + Math.floor((wave - 1) * 0.8) : 0;
  const bruteCount = wave >= 4 ? Math.floor((wave - 2) / 2) : 0;
  const reaverCount = wave >= 7 ? Math.floor((wave - 5) / 2) : 0;

  const ids: EnemyDefId[] = [];
  for (let i = 0; i < gruntCount; i++) ids.push('grunt');
  for (let i = 0; i < skirmisherCount; i++) ids.push('skirmisher');
  for (let i = 0; i < bruteCount; i++) ids.push('brute');
  for (let i = 0; i < reaverCount; i++) ids.push('reaver');

  // Shuffle so tougher types don't all clump at the end.
  ids.sort(() => Math.random() - 0.5);

  return ids.map((defId, i) => ({ defId, delayMs: i === 0 ? 0 : SPAWN_GAP_MS }));
}
