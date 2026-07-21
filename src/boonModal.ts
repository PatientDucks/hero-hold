import type { Boon } from './types.ts';

export interface BoonModalHandle {
  show: (boons: Boon[]) => void;
  hide: () => void;
  onPick: (handler: (boonId: string) => void) => void;
}

export function createBoonModal(): BoonModalHandle {
  const overlay = document.createElement('div');
  overlay.className = 'boon-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="boon-panel">
      <h2>Choose a Boon</h2>
      <div class="boon-cards" data-field="cards"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const cardsEl = overlay.querySelector<HTMLDivElement>('[data-field="cards"]')!;
  let pickHandler: ((boonId: string) => void) | null = null;

  return {
    show: (boons) => {
      cardsEl.innerHTML = '';
      for (const boon of boons) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'boon-card';
        card.innerHTML = `<span class="boon-name">${boon.name}</span><span class="boon-desc">${boon.description}</span>`;
        card.addEventListener('click', () => pickHandler?.(boon.id));
        cardsEl.appendChild(card);
      }
      overlay.hidden = false;
    },
    hide: () => {
      overlay.hidden = true;
    },
    onPick: (handler) => {
      pickHandler = handler;
    },
  };
}
