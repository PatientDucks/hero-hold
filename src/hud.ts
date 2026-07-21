import type { GameState, HeroDefId } from './types.ts';
import { HERO_DEFS, HERO_ORDER, TOTAL_WAVES } from './config.ts';

export interface HudHandle {
  root: HTMLElement;
  onSelectHero: (handler: (defId: HeroDefId) => void) => void;
  onStartWave: (handler: () => void) => void;
  onRestart: (handler: () => void) => void;
  update: (state: GameState) => void;
}

export function createHud(container: HTMLElement): HudHandle {
  const root = document.createElement('div');
  root.className = 'hud';
  root.innerHTML = `
    <div class="hud-top">
      <div class="stat"><span class="label">Wave</span><span class="value" data-field="wave">1 / ${TOTAL_WAVES}</span></div>
      <div class="stat"><span class="label">Gold</span><span class="value gold" data-field="gold">0</span></div>
      <div class="stat statue-stat">
        <span class="label">Statue HP</span>
        <div class="bar"><div class="bar-fill" data-field="statue-bar"></div></div>
      </div>
    </div>
    <div class="hud-boons" data-field="boons" hidden></div>
    <div class="hud-shop" data-field="shop"></div>
    <div class="hud-actions">
      <button type="button" class="btn primary" data-field="start-wave">Start Wave</button>
      <div class="banner" data-field="banner"></div>
      <button type="button" class="btn" data-field="restart" hidden>Restart</button>
    </div>
  `;
  container.appendChild(root);

  const boonsEl = root.querySelector<HTMLDivElement>('[data-field="boons"]')!;
  const shopEl = root.querySelector<HTMLDivElement>('[data-field="shop"]')!;
  const waveEl = root.querySelector<HTMLSpanElement>('[data-field="wave"]')!;
  const goldEl = root.querySelector<HTMLSpanElement>('[data-field="gold"]')!;
  const statueBarEl = root.querySelector<HTMLDivElement>('[data-field="statue-bar"]')!;
  const startBtn = root.querySelector<HTMLButtonElement>('[data-field="start-wave"]')!;
  const restartBtn = root.querySelector<HTMLButtonElement>('[data-field="restart"]')!;
  const bannerEl = root.querySelector<HTMLDivElement>('[data-field="banner"]')!;

  let selectHandler: ((defId: HeroDefId) => void) | null = null;
  let startHandler: (() => void) | null = null;
  let restartHandler: (() => void) | null = null;

  const shopButtons = new Map<HeroDefId, HTMLButtonElement>();
  const shopCostEls = new Map<HeroDefId, HTMLSpanElement>();
  for (const defId of HERO_ORDER) {
    const def = HERO_DEFS[defId];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hero-card';
    btn.innerHTML = `
      <span class="hero-name">${def.name}</span>
      <span class="hero-cost" data-cost>${def.cost}g</span>
      <span class="hero-stats">HP ${def.hp} · ATK ${def.atk}</span>
    `;
    btn.addEventListener('click', () => selectHandler?.(defId));
    shopEl.appendChild(btn);
    shopButtons.set(defId, btn);
    shopCostEls.set(defId, btn.querySelector<HTMLSpanElement>('[data-cost]')!);
  }

  startBtn.addEventListener('click', () => startHandler?.());
  restartBtn.addEventListener('click', () => restartHandler?.());

  return {
    root,
    onSelectHero: (handler) => {
      selectHandler = handler;
    },
    onStartWave: (handler) => {
      startHandler = handler;
    },
    onRestart: (handler) => {
      restartHandler = handler;
    },
    update: (state) => {
      waveEl.textContent = `${Math.min(state.wave, TOTAL_WAVES)} / ${TOTAL_WAVES}`;
      goldEl.textContent = String(state.gold);
      const statuePct = Math.max(0, (state.statueHp / state.statueMaxHp) * 100);
      statueBarEl.style.width = `${statuePct}%`;
      statueBarEl.style.background = statuePct > 50 ? '#6fd66f' : statuePct > 20 ? '#d6b23e' : '#d66f6f';

      for (const [defId, btn] of shopButtons) {
        const def = HERO_DEFS[defId];
        const cost = Math.round(def.cost * state.runModifiers.heroCostMult);
        shopCostEls.get(defId)!.textContent = `${cost}g`;
        const affordable = state.gold >= cost;
        btn.disabled = state.phase !== 'prep' || !affordable || !!state.pendingBoonChoices;
        btn.classList.toggle('selected', state.selectedHeroDef === defId);
      }

      if (state.pickedBoons.length > 0) {
        boonsEl.hidden = false;
        boonsEl.innerHTML =
          `<span class="label">Boons</span>` +
          state.pickedBoons.map((name) => `<span class="boon-chip">${name}</span>`).join('');
      } else {
        boonsEl.hidden = true;
      }

      startBtn.hidden = state.phase !== 'prep';
      restartBtn.hidden = state.phase !== 'won' && state.phase !== 'lost';

      if (state.phase === 'won') {
        bannerEl.textContent = 'Victory! The hold stands.';
        bannerEl.className = 'banner win';
      } else if (state.phase === 'lost') {
        bannerEl.textContent = 'The statue has fallen.';
        bannerEl.className = 'banner lose';
      } else if (state.phase === 'combat') {
        bannerEl.textContent = `Wave ${state.wave} incoming — ${state.enemies.length + state.spawnQueue.length} enemies remain`;
        bannerEl.className = 'banner';
      } else {
        bannerEl.textContent = 'Place your heroes, then start the wave.';
        bannerEl.className = 'banner';
      }
    },
  };
}
