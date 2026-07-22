import type { GameState } from './types.ts';
import { createScene } from './scene.ts';
import { createHud } from './hud.ts';
import { createArmoryPanel } from './armoryPanel.ts';
import { createBoonModal } from './boonModal.ts';
import { createWaveClearedModal } from './waveClearedModal.ts';
import { createVictorySplash } from './victorySplash.ts';
import { createInitialState, createHero, createEnemy } from './state.ts';
import { buildWaveSpawnQueue } from './waves.ts';
import { tickCombat } from './combat.ts';
import { rollBoons, applyBoon } from './boons.ts';
import { purchaseArmoryUpgrade, purchaseHeroUpgrade } from './upgrades.ts';
import { HERO_DEFS, TOTAL_WAVES, BOON_CHOICES_COUNT, WARLORD_UNLOCK_WAVE, waveClearBonus } from './config.ts';
import { isPlaceableTile, tileCenterPx, randomBorderSpawnPoint } from './grid.ts';

function heroCost(state: GameState, defId: keyof typeof HERO_DEFS): number {
  return Math.round(HERO_DEFS[defId].cost * state.runModifiers.heroCostMult);
}

function blocked(state: GameState): boolean {
  return Boolean(state.pendingBoonChoices) || state.pendingWaveClearedWave !== null;
}

export async function startGame(container: HTMLElement): Promise<void> {
  const armoryEl = document.createElement('div');
  armoryEl.className = 'armory-panel-container';
  const boardEl = document.createElement('div');
  boardEl.className = 'board';
  const hudEl = document.createElement('div');
  hudEl.className = 'hud-container';
  container.appendChild(armoryEl);
  container.appendChild(boardEl);
  container.appendChild(hudEl);

  const scene = await createScene(boardEl);
  const hud = createHud(hudEl);
  const armoryPanel = createArmoryPanel(armoryEl);
  const boonModal = createBoonModal();
  const waveClearedModal = createWaveClearedModal();
  const victorySplash = createVictorySplash();

  let state: GameState = createInitialState();
  let hoverTile: { tx: number; ty: number } | null = null;

  function resetGame(): void {
    state = createInitialState();
    waveClearedModal.hide();
    victorySplash.hide();
    if (state.pendingBoonChoices) boonModal.show(state.pendingBoonChoices);
  }

  victorySplash.onPlayAgain(() => {
    resetGame();
  });

  boonModal.onPick((boonId) => {
    const boon = state.pendingBoonChoices?.find((b) => b.id === boonId);
    if (!boon) return;
    applyBoon(state, boon);
    boonModal.hide();
  });

  waveClearedModal.onContinue(() => {
    const clearedWave = state.pendingWaveClearedWave;
    if (clearedWave === null) return;
    state.pendingWaveClearedWave = null;
    state.wave = clearedWave + 1;
    waveClearedModal.hide();
    state.pendingBoonChoices = rollBoons(BOON_CHOICES_COUNT);
    boonModal.show(state.pendingBoonChoices);
  });

  if (state.pendingBoonChoices) {
    boonModal.show(state.pendingBoonChoices);
  }

  scene.onHover((tx, ty) => {
    hoverTile = tx !== null && ty !== null ? { tx, ty } : null;
  });

  scene.onTileClick((tx, ty) => {
    if (state.phase !== 'prep' || blocked(state)) return;
    const { x, y } = tileCenterPx(tx, ty);
    const existingHero = state.heroes.find((h) => h.x === x && h.y === y);

    if (!state.selectedHeroDef) {
      // No hero type picked from the shop — clicking a placed hero opens its upgrade panel.
      state.selectedHeroUid = existingHero && existingHero.uid !== state.selectedHeroUid ? existingHero.uid : null;
      return;
    }

    if (existingHero || !isPlaceableTile(tx, ty)) return;
    if (state.selectedHeroDef === 'warlord' && state.wave < WARLORD_UNLOCK_WAVE) return;
    const cost = heroCost(state, state.selectedHeroDef);
    if (state.gold < cost) return;

    state.heroes.push(createHero(state, state.selectedHeroDef, x, y));
    state.gold -= cost;
  });

  hud.onSelectHero((defId) => {
    if (blocked(state)) return;
    if (defId === 'warlord' && state.wave < WARLORD_UNLOCK_WAVE) return;
    state.selectedHeroDef = state.selectedHeroDef === defId ? null : defId;
    state.selectedHeroUid = null;
  });

  hud.onUpgradeHero((stat) => {
    const hero = state.heroes.find((h) => h.uid === state.selectedHeroUid);
    if (!hero) return;
    purchaseHeroUpgrade(state, hero, stat);
  });

  hud.onDeselectHero(() => {
    state.selectedHeroUid = null;
  });

  armoryPanel.onBuyArmory((id) => {
    if (blocked(state)) return;
    purchaseArmoryUpgrade(state, id);
  });

  hud.onStartWave(() => {
    if (state.phase !== 'prep' || blocked(state)) return;
    state.selectedHeroUid = null;
    state.spawnQueue = buildWaveSpawnQueue(state.wave);
    state.spawnTimer = state.spawnQueue.length > 0 ? state.spawnQueue[0].delayMs : 0;
    state.phase = 'combat';
  });

  hud.onRestart(() => {
    resetGame();
  });

  function processSpawns(deltaMs: number): void {
    if (state.spawnQueue.length === 0) return;
    state.spawnTimer -= deltaMs;
    while (state.spawnQueue.length > 0 && state.spawnTimer <= 0) {
      const entry = state.spawnQueue.shift()!;
      const spawn = randomBorderSpawnPoint();
      state.enemies.push(createEnemy(state, entry.defId, state.wave, spawn.x, spawn.y));
      state.spawnTimer += state.spawnQueue.length > 0 ? state.spawnQueue[0].delayMs : 0;
    }
  }

  scene.app.ticker.add(() => {
    const deltaMs = scene.app.ticker.deltaMS;

    if (state.phase === 'combat') {
      processSpawns(deltaMs);
      tickCombat(state, deltaMs);

      if (state.statueHp <= 0) {
        state.statueHp = 0;
        state.phase = 'lost';
      } else if (state.spawnQueue.length === 0 && state.enemies.length === 0) {
        const clearedWave = state.wave;
        const bonus = waveClearBonus(clearedWave);
        state.gold += bonus;
        if (clearedWave >= TOTAL_WAVES) {
          state.phase = 'won';
          victorySplash.show(state);
        } else {
          // Boons are the reward for the round just finished, not a head start on the
          // next one — announce the clear first; the wave counter and boon offer only
          // advance once the player continues past it.
          state.phase = 'prep';
          state.pendingWaveClearedWave = clearedWave;
          waveClearedModal.show(clearedWave, bonus);
        }
      }
    }

    scene.render(state, hoverTile);
    hud.update(state);
    armoryPanel.update(state);
  });
}
