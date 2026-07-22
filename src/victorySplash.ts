import type { GameState } from './types.ts';
import { TOTAL_WAVES } from './config.ts';

export interface VictorySplashHandle {
  show: (state: GameState) => void;
  hide: () => void;
  onPlayAgain: (handler: () => void) => void;
}

export function createVictorySplash(): VictorySplashHandle {
  const overlay = document.createElement('div');
  overlay.className = 'victory-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="victory-panel">
      <div class="victory-title">Victory!</div>
      <p class="victory-sub">The hold stands against all ${TOTAL_WAVES} waves.</p>
      <div class="victory-stats" data-field="stats"></div>
      <button type="button" class="btn primary victory-play-again" data-field="play-again">Play Again</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const statsEl = overlay.querySelector<HTMLDivElement>('[data-field="stats"]')!;
  const playAgainBtn = overlay.querySelector<HTMLButtonElement>('[data-field="play-again"]')!;

  let playAgainHandler: (() => void) | null = null;
  playAgainBtn.addEventListener('click', () => playAgainHandler?.());

  return {
    show: (state) => {
      const highestLevel = state.heroes.reduce((max, h) => Math.max(max, h.level), 0);
      const armoryLevels = Object.values(state.armoryLevels).reduce((sum, lv) => sum + lv, 0);
      const stats: Array<[string, string | number]> = [
        ['Heroes surviving', state.heroes.length],
        ['Gold remaining', state.gold],
        ['Boons collected', state.pickedBoons.length],
        ['Highest hero level', highestLevel],
        ['Armory levels bought', armoryLevels],
      ];
      statsEl.innerHTML = stats
        .map(([label, value]) => `<div class="victory-stat"><span class="label">${label}</span><span class="value">${value}</span></div>`)
        .join('');
      overlay.hidden = false;
    },
    hide: () => {
      overlay.hidden = true;
    },
    onPlayAgain: (handler) => {
      playAgainHandler = handler;
    },
  };
}
