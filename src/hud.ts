import type { ArmoryUpgradeId, GameState, HeroDefId, HeroUpgradeStat } from './types.ts';
import { HERO_DEFS, HERO_ORDER, TOTAL_WAVES, WARLORD_UNLOCK_WAVE } from './config.ts';
import { ARMORY_DEFS, ARMORY_ORDER, HERO_UPGRADE_DEFS, armoryUpgradeCost, heroUpgradeCost } from './upgrades.ts';

const HERO_UPGRADE_ORDER: HeroUpgradeStat[] = ['atk', 'maxHp', 'atkSpeed'];

export interface HudHandle {
  root: HTMLElement;
  onSelectHero: (handler: (defId: HeroDefId) => void) => void;
  onStartWave: (handler: () => void) => void;
  onRestart: (handler: () => void) => void;
  onUpgradeHero: (handler: (stat: HeroUpgradeStat) => void) => void;
  onDeselectHero: (handler: () => void) => void;
  onBuyArmory: (handler: (id: ArmoryUpgradeId) => void) => void;
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
    <div class="hud-upgrade-panel" data-field="upgrade-panel" hidden>
      <div class="upgrade-panel-header">
        <span data-field="upgrade-hero-name"></span>
        <button type="button" class="icon-btn" data-field="upgrade-close" title="Close">&times;</button>
      </div>
      <div class="upgrade-buttons" data-field="upgrade-buttons"></div>
    </div>
    <div class="hud-armory">
      <div class="hud-section-label">Armory</div>
      <div class="armory-list" data-field="armory-list"></div>
    </div>
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
  const upgradePanelEl = root.querySelector<HTMLDivElement>('[data-field="upgrade-panel"]')!;
  const upgradeHeroNameEl = root.querySelector<HTMLSpanElement>('[data-field="upgrade-hero-name"]')!;
  const upgradeCloseBtn = root.querySelector<HTMLButtonElement>('[data-field="upgrade-close"]')!;
  const upgradeButtonsEl = root.querySelector<HTMLDivElement>('[data-field="upgrade-buttons"]')!;
  const armoryListEl = root.querySelector<HTMLDivElement>('[data-field="armory-list"]')!;

  let selectHandler: ((defId: HeroDefId) => void) | null = null;
  let startHandler: (() => void) | null = null;
  let restartHandler: (() => void) | null = null;
  let upgradeHeroHandler: ((stat: HeroUpgradeStat) => void) | null = null;
  let deselectHeroHandler: (() => void) | null = null;
  let buyArmoryHandler: ((id: ArmoryUpgradeId) => void) | null = null;

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

  const upgradeButtons = new Map<HeroUpgradeStat, HTMLButtonElement>();
  for (const stat of HERO_UPGRADE_ORDER) {
    const def = HERO_UPGRADE_DEFS[stat];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'upgrade-btn';
    btn.innerHTML = `<span class="upgrade-label">+${def.label}</span><span class="upgrade-cost" data-cost></span>`;
    btn.addEventListener('click', () => upgradeHeroHandler?.(stat));
    upgradeButtonsEl.appendChild(btn);
    upgradeButtons.set(stat, btn);
  }
  upgradeCloseBtn.addEventListener('click', () => deselectHeroHandler?.());

  const armoryRows = new Map<ArmoryUpgradeId, { btn: HTMLButtonElement; level: HTMLSpanElement; cost: HTMLSpanElement }>();
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
    btn.addEventListener('click', () => buyArmoryHandler?.(id));
    armoryListEl.appendChild(btn);
    armoryRows.set(id, {
      btn,
      level: btn.querySelector<HTMLSpanElement>('[data-level]')!,
      cost: btn.querySelector<HTMLSpanElement>('[data-cost]')!,
    });
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
    onUpgradeHero: (handler) => {
      upgradeHeroHandler = handler;
    },
    onDeselectHero: (handler) => {
      deselectHeroHandler = handler;
    },
    onBuyArmory: (handler) => {
      buyArmoryHandler = handler;
    },
    update: (state) => {
      waveEl.textContent = `${Math.min(state.wave, TOTAL_WAVES)} / ${TOTAL_WAVES}`;
      goldEl.textContent = String(state.gold);
      const statuePct = Math.max(0, (state.statueHp / state.statueMaxHp) * 100);
      statueBarEl.style.width = `${statuePct}%`;
      statueBarEl.style.background = statuePct > 50 ? '#6fd66f' : statuePct > 20 ? '#d6b23e' : '#d66f6f';

      const inPrep = state.phase === 'prep' && !state.pendingBoonChoices;

      for (const [defId, btn] of shopButtons) {
        const def = HERO_DEFS[defId];
        const costEl = shopCostEls.get(defId)!;
        const locked = defId === 'warlord' && state.wave < WARLORD_UNLOCK_WAVE;
        if (locked) {
          costEl.textContent = `Wave ${WARLORD_UNLOCK_WAVE}+`;
          btn.disabled = true;
        } else {
          const cost = Math.round(def.cost * state.runModifiers.heroCostMult);
          costEl.textContent = `${cost}g`;
          btn.disabled = !inPrep || state.gold < cost;
        }
        btn.classList.toggle('selected', state.selectedHeroDef === defId);
        btn.classList.toggle('locked', locked);
      }

      if (state.pickedBoons.length > 0) {
        boonsEl.hidden = false;
        boonsEl.innerHTML =
          `<span class="label">Boons</span>` +
          state.pickedBoons.map((name) => `<span class="boon-chip">${name}</span>`).join('');
      } else {
        boonsEl.hidden = true;
      }

      const selectedHero = state.heroes.find((h) => h.uid === state.selectedHeroUid) ?? null;
      upgradePanelEl.hidden = !selectedHero;
      if (selectedHero) {
        upgradeHeroNameEl.textContent = `${HERO_DEFS[selectedHero.defId].name} · Lv${selectedHero.level}`;
        for (const [stat, btn] of upgradeButtons) {
          const cost = heroUpgradeCost(selectedHero, stat);
          btn.querySelector<HTMLSpanElement>('[data-cost]')!.textContent = `${cost}g`;
          btn.disabled = !inPrep || state.gold < cost;
        }
      }

      for (const [id, row] of armoryRows) {
        const cost = armoryUpgradeCost(state, id);
        row.level.textContent = `Lv${state.armoryLevels[id]}`;
        row.cost.textContent = `${cost}g`;
        row.btn.disabled = !inPrep || state.gold < cost;
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
