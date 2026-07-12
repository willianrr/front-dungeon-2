import type {
  CombatEvent,
  EntityState,
  ForgeRecipeState,
  MiningPerfectStrikeCombatEvent,
  MiningState,
  MiningToolState,
  OreKind,
  OreNodeState,
} from './types';

export const MINING_TOOL_VERSION = 1 as const;
export const MINING_FOCUS_DURATION = 4;
export const MINING_PERFECT_EVENT_RADIUS = 1.8;

export const MINING_TOOL_DEFINITIONS: readonly MiningToolState[] = [
  { version: 1, id: 'improvised_pickaxe', label: 'Picareta Improvisada', tier: 0, cooldown: 0.9, perfectEvery: 0, perfectYieldBonus: 0 },
  { version: 1, id: 'copper_pickaxe', label: 'Picareta de Cobre', tier: 1, cooldown: 0.84, perfectEvery: 3, perfectYieldBonus: 1 },
  { version: 1, id: 'iron_pickaxe', label: 'Picareta de Ferro', tier: 2, cooldown: 0.76, perfectEvery: 3, perfectYieldBonus: 1 },
  { version: 1, id: 'mithril_pickaxe', label: 'Picareta de Mithril', tier: 3, cooldown: 0.68, perfectEvery: 3, perfectYieldBonus: 2 },
] as const;

export const ADVANCED_MINING_PALETTE = {
  rich: '#ffd56a',
  richCore: '#fff2b5',
  focus: '#f3a84f',
  perfect: '#fff3a3',
  copper: '#e29a61',
  iron: '#d8e0e5',
  mithril: '#8cecff',
} as const;

const ORE_CONTRACT: Readonly<Record<OreKind, {
  level: number;
  capacity: number;
  richToolTier: 1 | 2 | 3;
}>> = {
  copper: { level: 1, capacity: 5, richToolTier: 1 },
  iron: { level: 2, capacity: 4, richToolTier: 2 },
  mithril: { level: 3, capacity: 3, richToolTier: 3 },
};

const TOOL_RECIPE_CONTRACT = {
  'forge-copper-pickaxe': {
    outputKind: 'copper_pickaxe', toolTier: 1, requiredToolTier: 0, requiredLevel: 1, xpReward: 18,
    ingredients: [{ kind: 'copper_bar', count: 2 }],
  },
  'forge-iron-pickaxe': {
    outputKind: 'iron_pickaxe', toolTier: 2, requiredToolTier: 1, requiredLevel: 2, xpReward: 30,
    ingredients: [{ kind: 'iron_bar', count: 2 }, { kind: 'copper_bar', count: 1 }],
  },
  'forge-mithril-pickaxe': {
    outputKind: 'mithril_pickaxe', toolTier: 3, requiredToolTier: 2, requiredLevel: 3, xpReward: 48,
    ingredients: [{ kind: 'mithril_bar', count: 2 }, { kind: 'iron_bar', count: 1 }],
  },
} as const;

export interface OreNodePresentation {
  node: OreNodeState;
  rich: boolean;
  baseYield: 1 | 2;
  requiredToolTier: 0 | 1 | 2 | 3;
  legacy: boolean;
}

export type NormalizedMiningState = MiningState & {
  tool: MiningToolState;
  focusNodeId?: string;
  strikeStreak: number;
  focusRemaining: number;
  perfectReady: boolean;
};

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function finitePosition(value: unknown): value is { x: number; y: number; z: number } {
  const wire = record(value);
  return !!wire && finite(wire.x) && finite(wire.y) && finite(wire.z);
}

function exactPosition(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

export function miningToolPresentationGate(value: unknown): MiningToolState | null {
  const wire = record(value);
  if (!wire || wire.version !== MINING_TOOL_VERSION || !Number.isInteger(wire.tier)) return null;
  const expected = MINING_TOOL_DEFINITIONS[wire.tier as number];
  if (!expected) return null;
  return wire.id === expected.id && wire.label === expected.label && wire.cooldown === expected.cooldown
    && wire.perfectEvery === expected.perfectEvery && wire.perfectYieldBonus === expected.perfectYieldBonus
    ? value as MiningToolState
    : null;
}

export function miningToolForTier(tier: number): MiningToolState {
  const safe = Number.isInteger(tier) ? Math.max(0, Math.min(3, tier)) : 0;
  return MINING_TOOL_DEFINITIONS[safe];
}

/** Normaliza wire legado; envelope novo incoerente falha fechado para tier 0. */
export function normalizeMiningState(value: Partial<MiningState> | null | undefined): NormalizedMiningState {
  const announcedTool = value?.tool;
  const tool = announcedTool === undefined
    ? MINING_TOOL_DEFINITIONS[0]
    : miningToolPresentationGate(announcedTool) ?? MINING_TOOL_DEFINITIONS[0];
  const coherentCooldown = finite(value?.cooldown) && value!.cooldown === tool.cooldown;
  const cooldown = coherentCooldown ? value!.cooldown! : tool.cooldown;
  const cooldownRemaining = finite(value?.cooldownRemaining)
    ? Math.max(0, Math.min(cooldown, value!.cooldownRemaining!))
    : 0;
  const interactRange = finite(value?.interactRange) && value!.interactRange! > 0 ? value!.interactRange! : 3.4;
  const focusNodeId = typeof value?.focusNodeId === 'string' && value.focusNodeId.length > 0 ? value.focusNodeId : undefined;
  const streak = Number.isInteger(value?.strikeStreak) ? value!.strikeStreak! : 0;
  const focusRemaining = finite(value?.focusRemaining) ? value!.focusRemaining! : 0;
  const focusValid = coherentCooldown && tool.tier > 0 && focusNodeId !== undefined && streak > 0 && streak < tool.perfectEvery
    && focusRemaining > 0 && focusRemaining <= MINING_FOCUS_DURATION
    && value?.perfectReady === (streak === tool.perfectEvery - 1);
  return {
    cooldown,
    cooldownRemaining,
    interactRange,
    ...(typeof value?.lastNodeId === 'string' && value.lastNodeId ? { lastNodeId: value.lastNodeId } : {}),
    tool,
    ...(focusValid ? { focusNodeId } : {}),
    strikeStreak: focusValid ? streak : 0,
    focusRemaining: focusValid ? focusRemaining : 0,
    perfectReady: focusValid && streak === tool.perfectEvery - 1,
  };
}

export function oreNodePresentationGate(value: unknown): OreNodePresentation | null {
  const wire = record(value);
  if (!wire || typeof wire.id !== 'string' || wire.id.length === 0 ||
    (wire.kind !== 'copper' && wire.kind !== 'iron' && wire.kind !== 'mithril') ||
    typeof wire.oreKind !== 'string' || !finitePosition(wire.position) ||
    !Number.isInteger(wire.remaining) || !Number.isInteger(wire.capacity) || !Number.isInteger(wire.requiredLevel) ||
    typeof wire.depleted !== 'boolean' || !finite(wire.respawnRemaining) || !finite(wire.interactRange)) return null;
  const kind = wire.kind;
  const contract = ORE_CONTRACT[kind];
  if (wire.oreKind !== `${kind}_ore` || (wire.remaining as number) < 0 || (wire.remaining as number) > (wire.capacity as number) ||
    wire.depleted !== ((wire.remaining as number) === 0) || (wire.respawnRemaining as number) < 0 || (wire.interactRange as number) <= 0) return null;

  const noAdvancedFields = wire.rich === undefined && wire.baseYield === undefined && wire.requiredToolTier === undefined;
  if (noAdvancedFields) {
    if (wire.requiredLevel !== contract.level || wire.capacity !== contract.capacity) return null;
    return { node: value as OreNodeState, rich: false, baseYield: 1, requiredToolTier: 0, legacy: true };
  }
  const rich = wire.rich === true;
  if (rich) {
    if (!wire.id.endsWith('-3') || wire.baseYield !== 2 || wire.requiredToolTier !== contract.richToolTier ||
      wire.requiredLevel !== contract.level + 1 || wire.capacity !== contract.capacity * 2) return null;
    return { node: value as OreNodeState, rich: true, baseYield: 2, requiredToolTier: contract.richToolTier, legacy: false };
  }
  if (wire.rich !== undefined && wire.rich !== false) return null;
  if (wire.baseYield !== 1 || (wire.requiredToolTier !== undefined && wire.requiredToolTier !== 0) ||
    wire.requiredLevel !== contract.level || wire.capacity !== contract.capacity || wire.id.endsWith('-3')) return null;
  return { node: value as OreNodeState, rich: false, baseYield: 1, requiredToolTier: 0, legacy: false };
}

export function miningToolRecipeGate(value: ForgeRecipeState | unknown): ForgeRecipeState | null {
  const wire = record(value);
  if (!wire || wire.recipeType !== 'tool' || typeof wire.id !== 'string') return null;
  const expected = TOOL_RECIPE_CONTRACT[wire.id as keyof typeof TOOL_RECIPE_CONTRACT];
  if (!expected || wire.outputKind !== expected.outputKind || wire.outputCount !== 1 || wire.toolTier !== expected.toolTier ||
    (wire.requiredToolTier ?? 0) !== expected.requiredToolTier || wire.requiredLevel !== expected.requiredLevel ||
    wire.xpReward !== expected.xpReward || wire.outputRarity !== undefined || wire.itemLevelBonus !== undefined ||
    !Array.isArray(wire.ingredients) || wire.ingredients.length !== expected.ingredients.length) return null;
  for (let index = 0; index < expected.ingredients.length; index++) {
    const ingredient = record(wire.ingredients[index]);
    if (!ingredient || ingredient.kind !== expected.ingredients[index].kind || ingredient.count !== expected.ingredients[index].count) return null;
  }
  return value as ForgeRecipeState;
}

export function miningPerfectStrikeEventGate(
  value: CombatEvent | unknown,
  entities: readonly EntityState[],
  nodes: readonly OreNodeState[],
): { event: MiningPerfectStrikeCombatEvent; node: OreNodePresentation; historical: boolean } | null {
  const wire = record(value);
  if (!wire || wire.type !== 'mining-perfect-strike' || typeof wire.id !== 'string' || !wire.id ||
    typeof wire.casterId !== 'string' || !wire.casterId || wire.skill !== 'mining-perfect-strike' ||
    typeof wire.resourceId !== 'string' || !wire.resourceId || !finitePosition(wire.position) ||
    wire.radius !== MINING_PERFECT_EVENT_RADIUS || (wire.amount !== 1 && wire.amount !== 2)) return null;
  const forbidden = ['targetId', 'damageKind', 'critical', 'sourceSkill', 'damageEffect', 'duration', 'delay',
    'innerRadius', 'rotationY', 'arcDegrees', 'encounterId', 'wave'];
  if (forbidden.some((key) => wire[key] !== undefined)) return null;
  const matchingCasters = entities.filter((entity) => entity.id === wire.casterId);
  if (matchingCasters.length > 1 || (matchingCasters[0] && matchingCasters[0].kind !== 'player')) return null;
  const matchingNodes = nodes.filter((node) => node.id === wire.resourceId);
  if (matchingNodes.length !== 1) return null;
  const node = oreNodePresentationGate(matchingNodes[0]);
  if (!node || wire.variant !== node.node.kind || !exactPosition(wire.position, node.node.position)) return null;
  const tool = MINING_TOOL_DEFINITIONS.find((candidate) => candidate.id === wire.modifierId);
  if (!tool || tool.tier === 0 || wire.amount !== tool.perfectYieldBonus) return null;
  return { event: value as MiningPerfectStrikeCombatEvent, node, historical: matchingCasters.length === 0 };
}
