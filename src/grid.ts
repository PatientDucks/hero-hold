import { GRID_SIZE, TILE_SIZE, CENTER_TILE } from './config.ts';

export interface TileCoord {
  tx: number;
  ty: number;
}

export function pixelToTile(x: number, y: number): TileCoord {
  return { tx: Math.floor(x / TILE_SIZE), ty: Math.floor(y / TILE_SIZE) };
}

export function tileCenterPx(tx: number, ty: number): { x: number; y: number } {
  return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
}

export function isInBounds(tx: number, ty: number): boolean {
  return tx >= 0 && ty >= 0 && tx < GRID_SIZE && ty < GRID_SIZE;
}

export function isBorderTile(tx: number, ty: number): boolean {
  return tx === 0 || ty === 0 || tx === GRID_SIZE - 1 || ty === GRID_SIZE - 1;
}

export function isCenterTile(tx: number, ty: number): boolean {
  return tx === CENTER_TILE && ty === CENTER_TILE;
}

/** A tile is placeable by the player: inside the board, not the border spawn ring, not the statue tile. */
export function isPlaceableTile(tx: number, ty: number): boolean {
  return isInBounds(tx, ty) && !isBorderTile(tx, ty) && !isCenterTile(tx, ty);
}

export function randomBorderSpawnPoint(): { x: number; y: number } {
  const side = Math.floor(Math.random() * 4);
  const edge = Math.floor(Math.random() * GRID_SIZE);
  let tx: number;
  let ty: number;
  if (side === 0) {
    tx = edge;
    ty = 0;
  } else if (side === 1) {
    tx = edge;
    ty = GRID_SIZE - 1;
  } else if (side === 2) {
    tx = 0;
    ty = edge;
  } else {
    tx = GRID_SIZE - 1;
    ty = edge;
  }
  const center = tileCenterPx(tx, ty);
  return {
    x: center.x + (Math.random() - 0.5) * TILE_SIZE * 0.6,
    y: center.y + (Math.random() - 0.5) * TILE_SIZE * 0.6,
  };
}