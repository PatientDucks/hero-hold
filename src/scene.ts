import { Application, Graphics, Container, Text } from 'pixi.js';
import type { GameState, HeroDefId } from './types.ts';
import {
  GRID_SIZE,
  TILE_SIZE,
  BOARD_PX,
  CENTER_PX,
  HERO_DEFS,
  STATUE_MAX_HP,
  LEVEL_FLASH_MS,
  FLOAT_TEXT_RISE_PX,
} from './config.ts';
import { isBorderTile, isPlaceableTile, pixelToTile, tileCenterPx } from './grid.ts';

export interface SceneHandle {
  app: Application;
  onTileClick: (handler: (tx: number, ty: number) => void) => void;
  onHover: (handler: (tx: number | null, ty: number | null) => void) => void;
  render: (state: GameState, hoverTile: { tx: number; ty: number } | null) => void;
  destroy: () => void;
}

export async function createScene(container: HTMLElement): Promise<SceneHandle> {
  const app = new Application();
  await app.init({
    width: BOARD_PX,
    height: BOARD_PX,
    backgroundColor: 0x1a1512,
    antialias: true,
  });
  container.appendChild(app.canvas);

  const staticLayer = new Graphics();
  const dynamicLayer = new Graphics();
  const badgeLayer = new Container();
  const floatLayer = new Container();
  app.stage.addChild(staticLayer, dynamicLayer, badgeLayer, floatLayer);

  drawStaticGrid(staticLayer);

  const heroBadges = new Map<number, Text>();
  const floatTexts = new Map<number, Text>();

  let clickHandler: ((tx: number, ty: number) => void) | null = null;
  let hoverHandler: ((tx: number | null, ty: number | null) => void) | null = null;

  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;
  app.stage.on('pointertap', (e) => {
    const local = e.getLocalPosition(app.stage as unknown as Container);
    const { tx, ty } = pixelToTile(local.x, local.y);
    clickHandler?.(tx, ty);
  });
  app.stage.on('pointermove', (e) => {
    const local = e.getLocalPosition(app.stage as unknown as Container);
    const { tx, ty } = pixelToTile(local.x, local.y);
    hoverHandler?.(tx, ty);
  });
  app.stage.on('pointerleave', () => hoverHandler?.(null, null));

  function syncHeroBadges(state: GameState): void {
    const seen = new Set<number>();
    for (const hero of state.heroes) {
      seen.add(hero.uid);
      const def = HERO_DEFS[hero.defId];
      let badge = heroBadges.get(hero.uid);
      if (!badge) {
        badge = new Text({
          text: '',
          style: { fontFamily: 'system-ui, sans-serif', fontSize: 11, fontWeight: 'bold', fill: 0x1a1512 },
        });
        badge.anchor.set(0.5);
        badgeLayer.addChild(badge);
        heroBadges.set(hero.uid, badge);
      }
      badge.text = String(hero.level);
      badge.position.set(hero.x + def.radius * 0.65, hero.y + def.radius * 0.65);
    }
    for (const [uid, badge] of heroBadges) {
      if (!seen.has(uid)) {
        badgeLayer.removeChild(badge);
        badge.destroy();
        heroBadges.delete(uid);
      }
    }
  }

  function syncFloatingTexts(state: GameState): void {
    const seen = new Set<number>();
    for (const ft of state.floatingTexts) {
      seen.add(ft.id);
      let text = floatTexts.get(ft.id);
      if (!text) {
        text = new Text({
          text: ft.text,
          style: { fontFamily: 'system-ui, sans-serif', fontSize: 13, fontWeight: 'bold', fill: ft.color },
        });
        text.anchor.set(0.5);
        floatLayer.addChild(text);
        floatTexts.set(ft.id, text);
      }
      const progress = 1 - ft.ttlRemaining / ft.ttlTotal;
      text.position.set(ft.x, ft.y - progress * FLOAT_TEXT_RISE_PX);
      text.alpha = 1 - progress;
    }
    for (const [id, text] of floatTexts) {
      if (!seen.has(id)) {
        floatLayer.removeChild(text);
        text.destroy();
        floatTexts.delete(id);
      }
    }
  }

  function render(state: GameState, hoverTile: { tx: number; ty: number } | null): void {
    renderDynamic(dynamicLayer, state, hoverTile);
    syncHeroBadges(state);
    syncFloatingTexts(state);
  }

  return {
    app,
    onTileClick: (handler) => {
      clickHandler = handler;
    },
    onHover: (handler) => {
      hoverHandler = handler;
    },
    render,
    destroy: () => {
      app.destroy(true, { children: true });
    },
  };
}

function drawStaticGrid(g: Graphics): void {
  for (let i = 0; i <= GRID_SIZE; i++) {
    g.moveTo(i * TILE_SIZE, 0).lineTo(i * TILE_SIZE, BOARD_PX);
    g.moveTo(0, i * TILE_SIZE).lineTo(BOARD_PX, i * TILE_SIZE);
  }
  g.stroke({ width: 1, color: 0x3a2f28, alpha: 0.6 });

  for (let tx = 0; tx < GRID_SIZE; tx++) {
    for (let ty = 0; ty < GRID_SIZE; ty++) {
      if (isBorderTile(tx, ty)) {
        g.rect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE).fill({ color: 0x5c2a2a, alpha: 0.25 });
      }
    }
  }
}

function healthBar(g: Graphics, cx: number, cy: number, radius: number, hp: number, maxHp: number, color: number): void {
  const w = radius * 2.2;
  const h = 4;
  const x = cx - w / 2;
  const y = cy - radius - h - 3;
  g.rect(x, y, w, h).fill({ color: 0x000000, alpha: 0.5 });
  const pct = Math.max(0, hp / maxHp);
  g.rect(x, y, w * pct, h).fill({ color });
}

function renderDynamic(g: Graphics, state: GameState, hoverTile: { tx: number; ty: number } | null): void {
  g.clear();

  if (hoverTile && state.phase === 'prep' && state.selectedHeroDef && !state.pendingBoonChoices) {
    const { tx, ty } = hoverTile;
    const cost = Math.round(HERO_DEFS[state.selectedHeroDef].cost * state.runModifiers.heroCostMult);
    const occupied = state.heroes.some((h) => {
      const { tx: htx, ty: hty } = pixelToTile(h.x, h.y);
      return htx === tx && hty === ty;
    });
    const valid = isPlaceableTile(tx, ty) && !occupied && state.gold >= cost;
    const { x, y } = tileCenterPx(tx, ty);
    g.rect(x - TILE_SIZE / 2, y - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE).fill({
      color: valid ? 0x6fd66f : 0xd66f6f,
      alpha: 0.25,
    });
  }

  // Statue
  const statuePct = Math.max(0, state.statueHp / STATUE_MAX_HP);
  const statueColor = statuePct > 0.5 ? 0xb8a15a : statuePct > 0.2 ? 0xb87a3a : 0xb83a3a;
  g.rect(CENTER_PX - 20, CENTER_PX - 20, 40, 40).fill({ color: statueColor });
  g.rect(CENTER_PX - 20, CENTER_PX - 20, 40, 40).stroke({ width: 2, color: 0xffe9b0 });
  healthBar(g, CENTER_PX, CENTER_PX - 20, 20, state.statueHp, state.statueMaxHp, 0xf2d67a);

  for (const hero of state.heroes) {
    const def = HERO_DEFS[hero.defId];
    if (hero.levelFlashRemaining > 0) {
      const progress = 1 - hero.levelFlashRemaining / LEVEL_FLASH_MS;
      const ringR = def.radius * (1.15 + progress * 1.1);
      g.circle(hero.x, hero.y, ringR).stroke({ width: 3, color: 0xf2d67a, alpha: 1 - progress });
    }
    if (hero.uid === state.selectedHeroUid) {
      g.circle(hero.x, hero.y, def.radius * 1.35).stroke({ width: 2, color: 0x6bb6bf, alpha: 0.9 });
    }
    drawHeroIcon(g, hero.x, hero.y, hero.defId, def.color, def.radius);
    g.circle(hero.x + def.radius * 0.65, hero.y + def.radius * 0.65, 8)
      .fill({ color: 0xf2d67a })
      .stroke({ width: 1, color: 0x1a1512, alpha: 0.7 });
    healthBar(g, hero.x, hero.y, def.radius, hero.hp, hero.maxHp, 0x6fd66f);
  }

  for (const enemy of state.enemies) {
    const radius = enemyRadius(enemy.defId);
    g.circle(enemy.x, enemy.y, radius).fill({ color: enemyColor(enemy.defId) });
    g.circle(enemy.x, enemy.y, radius).stroke({ width: 1.5, color: 0x1a1512, alpha: 0.55 });
    healthBar(g, enemy.x, enemy.y, radius, enemy.hp, enemy.maxHp, 0xd66f6f);
  }
}

const OUTLINE = { width: 1.5, color: 0x1a1512, alpha: 0.55 };
const ACCENT = { width: 2, color: 0xf0e6d8, alpha: 0.85 };

/** Draws a small silhouette distinguishing each hero type, in place of a plain token. */
function drawHeroIcon(g: Graphics, cx: number, cy: number, defId: HeroDefId, color: number, r: number): void {
  const headR = r * 0.36;
  const headY = cy - r * 0.7;

  switch (defId) {
    case 'militia': {
      g.roundRect(cx - r * 0.4, cy - r * 0.05, r * 0.8, r * 1.05, r * 0.2).fill({ color }).stroke(OUTLINE);
      g.circle(cx, headY, headR).fill({ color }).stroke(OUTLINE);
      g.moveTo(cx + r * 0.3, cy - r * 0.05)
        .lineTo(cx + r * 0.85, cy - r * 0.55)
        .stroke(ACCENT);
      break;
    }
    case 'archer': {
      g.poly([cx, cy - r * 0.35, cx - r * 0.4, cy + r * 0.75, cx + r * 0.4, cy + r * 0.75])
        .fill({ color })
        .stroke(OUTLINE);
      g.circle(cx, headY, headR).fill({ color }).stroke(OUTLINE);
      {
        const bowX = cx + r * 0.35;
        const bowY = cy + r * 0.05;
        const bowR = r * 0.6;
        const a0 = -Math.PI * 0.4;
        g.moveTo(bowX + bowR * Math.cos(a0), bowY + bowR * Math.sin(a0))
          .arc(bowX, bowY, bowR, a0, Math.PI * 0.4)
          .stroke(ACCENT);
      }
      break;
    }
    case 'knight': {
      g.rect(cx - r * 0.45, cy - r * 0.25, r * 0.9, r * 1.0).fill({ color }).stroke(OUTLINE);
      g.circle(cx, headY, headR).fill({ color }).stroke(OUTLINE);
      g.roundRect(cx - r * 0.95, cy - r * 0.1, r * 0.35, r * 0.6, r * 0.08).fill({ color: 0xf0e6d8, alpha: 0.85 }).stroke(OUTLINE);
      break;
    }
    case 'champion': {
      g.poly([
        cx,
        cy - r * 0.4,
        cx - r * 0.55,
        cy + r * 0.1,
        cx - r * 0.4,
        cy + r * 0.9,
        cx + r * 0.4,
        cy + r * 0.9,
        cx + r * 0.55,
        cy + r * 0.1,
      ])
        .fill({ color })
        .stroke(OUTLINE);
      g.circle(cx, headY, headR * 1.1).fill({ color }).stroke(OUTLINE);
      g.moveTo(cx - r * 0.95, cy + r * 0.95)
        .lineTo(cx + r * 0.95, cy - r * 0.95)
        .stroke({ width: 3, color: 0xf0e6d8, alpha: 0.85 });
      break;
    }
    case 'warlord': {
      g.poly([
        cx,
        cy - r * 0.45,
        cx - r * 0.6,
        cy + r * 0.15,
        cx - r * 0.45,
        cy + r * 0.95,
        cx + r * 0.45,
        cy + r * 0.95,
        cx + r * 0.6,
        cy + r * 0.15,
      ])
        .fill({ color })
        .stroke(OUTLINE);
      g.circle(cx, headY, headR * 1.15).fill({ color }).stroke(OUTLINE);
      g.moveTo(cx - r * 0.25, headY - headR * 1.1)
        .lineTo(cx, headY - headR * 1.7)
        .lineTo(cx + r * 0.25, headY - headR * 1.1)
        .stroke(ACCENT);
      g.moveTo(cx - r * 0.9, cy + r * 0.9)
        .lineTo(cx + r * 0.65, cy - r * 0.65)
        .stroke({ width: 3, color: 0xf0e6d8, alpha: 0.85 });
      g.rect(cx + r * 0.5, cy - r * 0.95, r * 0.42, r * 0.42)
        .fill({ color: 0xf0e6d8, alpha: 0.85 })
        .stroke(OUTLINE);
      break;
    }
  }
}

function enemyColor(defId: string): number {
  switch (defId) {
    case 'boss':
      return 0x4a1f4f;
    case 'brute':
      return 0x7a3f5c;
    case 'reaver':
      return 0xc9432e;
    case 'skirmisher':
      return 0xe0a23e;
    default:
      return 0xb05a5a; // grunt
  }
}

function enemyRadius(defId: string): number {
  switch (defId) {
    case 'boss':
      return 30;
    case 'brute':
      return 15;
    case 'reaver':
      return 12;
    case 'skirmisher':
      return 7;
    default:
      return 10; // grunt
  }
}

