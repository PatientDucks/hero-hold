import { Application, Graphics, Container } from 'pixi.js';
import type { GameState } from './types.ts';
import { GRID_SIZE, TILE_SIZE, BOARD_PX, CENTER_PX, HERO_DEFS, STATUE_MAX_HP } from './config.ts';
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
  app.stage.addChild(staticLayer);
  app.stage.addChild(dynamicLayer);

  drawStaticGrid(staticLayer);

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

  return {
    app,
    onTileClick: (handler) => {
      clickHandler = handler;
    },
    onHover: (handler) => {
      hoverHandler = handler;
    },
    render: (state, hoverTile) => renderDynamic(dynamicLayer, state, hoverTile),
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

  if (hoverTile && state.phase === 'prep' && state.selectedHeroDef) {
    const { tx, ty } = hoverTile;
    const cost = HERO_DEFS[state.selectedHeroDef].cost;
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
    g.circle(hero.x, hero.y, def.radius).fill({ color: def.color });
    g.circle(hero.x, hero.y, def.radius).stroke({ width: 2, color: 0xffffff, alpha: 0.5 });
    healthBar(g, hero.x, hero.y, def.radius, hero.hp, hero.maxHp, 0x6fd66f);
  }

  for (const enemy of state.enemies) {
    g.circle(enemy.x, enemy.y, 10).fill({ color: enemyColor(enemy.defId) });
    healthBar(g, enemy.x, enemy.y, enemyRadius(enemy.defId), enemy.hp, enemy.maxHp, 0xd66f6f);
  }
}

function enemyColor(defId: string): number {
  if (defId === 'boss') return 0x4a1f4f;
  if (defId === 'brute') return 0x7a3f5c;
  return 0xb05a5a;
}

function enemyRadius(defId: string): number {
  if (defId === 'boss') return 24;
  if (defId === 'brute') return 13;
  return 10;
}

