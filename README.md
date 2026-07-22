# Hero Hold

A short roguelike auto-battler for the browser. Defend a statue against
10 waves of enemies by placing heroes on a grid — enemies stream in
from the map's border and push toward the center; heroes fight
automatically. Wave 10 brings a boss.

Built with Vite + TypeScript + PixiJS.

## Playing

```
npm install
npm run dev
```

Open the printed local URL. Between waves ("prep" phase) select a hero
from the shop and click a grid tile to place them — cost comes out of
your gold. Click **Start Wave** when ready. Combat resolves
automatically: heroes attack enemies in range, enemies that reach a
hero fight it instead of advancing, and any that get through attack
the statue directly. Surviving heroes keep their position, HP, and
level between waves; kills grant gold and XP.

Lose if the statue's HP hits 0. Win by clearing wave 10's boss.

## Build

```
npm run build      # outputs dist/
npm run preview    # serve the production build locally
```

## Project layout

```
src/
├── main.ts        entry point, mounts the page shell
├── game.ts         orchestrator: wires scene + HUD + wave/combat state machine
├── types.ts         shared type definitions
├── config.ts         hero/enemy definitions, grid + balance constants
├── state.ts           GameState factory, hero/enemy factories
├── grid.ts             tile <-> pixel helpers, spawn point picking
├── waves.ts             per-wave enemy spawn queue construction
├── combat.ts              per-frame simulation: movement, engagement, attacks, statue damage
├── scene.ts                PixiJS rendering of the grid, statue, heroes, enemies
├── hud.ts                   DOM-based HUD: gold/wave/statue HP, hero shop, controls
└── style.css                page + HUD styling
```

All game balance (hero stats, enemy scaling, gold costs, wave
composition) lives in [`src/config.ts`](src/config.ts) and
[`src/waves.ts`](src/waves.ts).

## Balance testing

```
npm run simulate               # 200 trials per strategy (default)
npm run simulate -- --trials=600
```

`scripts/balance-sim.ts` runs full 10-wave games headlessly (no
Pixi/DOM — it drives `state.ts`/`combat.ts`/`waves.ts`/`boons.ts`/
`upgrades.ts` directly) against a few scripted strategies: mindless
single-unit spam, mindless random placement/boons/armory, and a
deliberate "competent" baseline (chokepoint ring around the statue,
reinvests leftover gold into hero HP upgrades and Armory). It prints a
win-rate and per-wave death histogram per strategy. Use it after any
balance-relevant change — the design goal is that the mindless
strategies should rarely win while the competent one wins comfortably
but not trivially.

## Design notes

- **Grid**: 9x9 tiles. The outer ring is the enemy spawn border; the
  center tile holds the statue. Heroes may be placed on any other tile.
- **Movement**: enemies move continuously toward the statue in pixel
  space (no tile pathfinding). A hero within engagement range blocks
  and fights an enemy; otherwise the enemy continues toward the
  center and, once close enough, attacks the statue directly.
- **Economy**: starting gold (30) is calibrated so wave 1 affords
  either 3 Militia (10g) or 1 Champion (30g). Gold from kills plus a
  per-wave clear bonus fund more/stronger heroes on later waves.
- **Scaling**: enemy HP/ATK scale up per wave number; wave composition
  (grunt/brute counts) grows with wave number; wave 10 spawns a boss.
