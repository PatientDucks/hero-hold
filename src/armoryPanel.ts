import type { ArmoryUpgradeId, GameState } from './types.ts';
import { ARMORY_DEFS, ARMORY_ORDER, armoryUpgradeCost } from './upgrades.ts';

export interface ArmoryPanelHandle {
  root: HTMLElement;
  onBuyArmory: (handler: (id: ArmoryUpgradeId) => void) => void;
  update: (state: GameState) => void;
}

export function createArmoryPanel(container: HTMLElement): ArmoryPanelHandle {
  const root = document.createElement('div');
  root.className = 'armory-panel';
  root.innerHTML = `
    <button type="button" class="armory-panel-header" data-field="toggle">
      <span class="armory-panel-title">Armory</span>
      <span class="armory-toggle-icon" data-field="icon">&#9664;</span>
    </button>
    <div class="armory-panel-body" data-field="body"></div>
  `;
  container.appendChild(root);

  const toggleBtn = root.querySelector<HTMLButtonElement>('[data-field="toggle"]')!;
  const iconEl = root.querySelector<HTMLSpanElement>('[data-field="icon"]')!;
  const bodyEl = root.querySelector<HTMLDivElement>('[data-field="body"]')!;

  let buyHandler: ((id: ArmoryUpgradeId) => void) | null = null;

  toggleBtn.addEventListener('click', () => {
    const collapsed = root.classList.toggle('collapsed');
    iconEl.innerHTML = collapsed ? '&#9654;' : '&#9664;';
  });

  const rows = new Map<ArmoryUpgradeId, { btn: HTMLButtonElement; level: HTMLSpanElement; cost: HTMLSpanElement }>();
  for (const id of ARMORY_ORDER) {
    const def = ARMORY_DEFS[id];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'armory-row';
    btn.innerHTML = `
      <span class="armory-name">${def.name} <span class="armory-level" data-level></span></span>
      <span class="armory-effect">${def.effectLabel}</span>
      <span class="armory-cost" data-cost></span>
    `;
    btn.addEventListener('click', () => buyHandler?.(id));
    bodyEl.appendChild(btn);
    rows.set(id, {
      btn,
      level: btn.querySelector<HTMLSpanElement>('[data-level]')!,
      cost: btn.querySelector<HTMLSpanElement>('[data-cost]')!,
    });
  }

  return {
    root,
    onBuyArmory: (handler) => {
      buyHandler = handler;
    },
    update: (state) => {
      const inPrep = state.phase === 'prep' && !state.pendingBoonChoices && state.pendingWaveClearedWave === null;
      for (const [id, row] of rows) {
        const cost = armoryUpgradeCost(state, id);
        row.level.textContent = `Lv${state.armoryLevels[id]}`;
        row.cost.textContent = `${cost}g`;
        row.btn.disabled = !inPrep || state.gold < cost;
      }
    },
  };
}
