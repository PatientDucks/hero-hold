export type HeroDefId = 'militia' | 'archer' | 'knight' | 'champion';
export type EnemyDefId = 'grunt' | 'brute' | 'boss';

export interface HeroDef {
  id: HeroDefId;
  name: string;
  cost: number;
  hp: number;
  atk: number;
  range: number; // px
  atkIntervalMs: number;
  color: number;
  radius: number; // px, render size
}

export interface EnemyDef {
  id: EnemyDefId;
  name: string;
  hp: number;
  atk: number;
  speed: number; // px/sec
  atkIntervalMs: number;
  gold: number;
  color: number;
  radius: number;
}

export interface Hero {
  uid: number;
  defId: HeroDefId;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atk: number;
  range: number;
  atkIntervalMs: number;
  atkCooldown: number;
  level: number;
  xp: number;
  xpToNext: number;
  levelFlashRemaining: number;
}

export interface Enemy {
  uid: number;
  defId: EnemyDefId;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atk: number;
  speed: number;
  atkIntervalMs: number;
  atkCooldown: number;
  gold: number;
  engagedHeroUid: number | null;
  atStatue: boolean;
}

export interface WaveSpawnEntry {
  defId: EnemyDefId;
  delayMs: number;
}

export type StatField = 'atk' | 'maxHp' | 'atkSpeed' | 'range';

export interface StatMultipliers {
  atk: number;
  maxHp: number;
  atkSpeed: number;
  range: number;
}

export interface RunModifiers {
  all: StatMultipliers;
  perClass: Record<HeroDefId, StatMultipliers>;
  goldGainMult: number;
  xpGainMult: number;
  heroCostMult: number;
  statueAtkMult: number;
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: number;
  ttlRemaining: number;
  ttlTotal: number;
}

export interface Boon {
  id: string;
  name: string;
  description: string;
  apply: (state: GameState) => void;
}

export type GamePhase = 'prep' | 'combat' | 'won' | 'lost';

export interface GameState {
  phase: GamePhase;
  wave: number;
  gold: number;
  statueHp: number;
  statueMaxHp: number;
  statueAtkCooldown: number;
  heroes: Hero[];
  enemies: Enemy[];
  spawnQueue: WaveSpawnEntry[];
  spawnTimer: number;
  selectedHeroDef: HeroDefId | null;
  nextUid: number;
  runModifiers: RunModifiers;
  floatingTexts: FloatingText[];
  pendingBoonChoices: Boon[] | null;
  pickedBoons: string[];
}
