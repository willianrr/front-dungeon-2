import { LEGACY_SKILL_IDS, WIRE_SKILL_IDS, isCurrentSkillId } from './SkillCatalog';
import type { HotbarAction, SkillId } from './types';

export const HOTBAR_SLOT_COUNT = 8;
export const HOTBAR_SKILL_SLOT_COUNT = 6;
export const HOTBAR_LOADOUT_STORAGE_KEY = 'aranna.hotbar-loadout.v2';
export const LEGACY_HOTBAR_LAYOUT_STORAGE_KEY = 'aranna.hotbar-layout.v1';

export const DEFAULT_HOTBAR_LOADOUT: readonly HotbarAction[] = [
  'potion',
  'arcane-nova',
  'mana-potion',
  'war-cry',
  'heavy-strike',
  'charge',
  'steel-sweep',
  'iron-guard',
];

const CONSUMABLES = ['potion', 'mana-potion'] as const satisfies readonly HotbarAction[];
const KNOWN_SKILLS = new Set<string>(WIRE_SKILL_IDS);

export interface HotbarStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface StoredHotbarLoadoutV2 {
  version: 2;
  slots: HotbarAction[];
}

export interface LoadedHotbarLoadout {
  slots: HotbarAction[];
  source: 'v2' | 'v1' | 'default';
  repaired: boolean;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : null;
}

export function isHotbarSkillAction(action: unknown): action is SkillId {
  return typeof action === 'string' && KNOWN_SKILLS.has(action);
}

function uniqueSkillIds(values: readonly unknown[]): SkillId[] {
  const seen = new Set<SkillId>();
  const result: SkillId[] = [];
  for (const value of values) {
    if (!isCurrentSkillId(value) || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function hasCompleteLegacyBase(values: readonly SkillId[]): boolean {
  return LEGACY_SKILL_IDS.every((id) => values.includes(id));
}

/**
 * Retorna null para ausencia/payload parcial: esse estado nao tem autoridade
 * para apagar um loadout v2 carregado antes do primeiro snapshot completo.
 */
export function announcedSkillIdsFromWire(skills: unknown): SkillId[] | null {
  if (!Array.isArray(skills)) return null;
  const ids = uniqueSkillIds(skills.map((candidate) => objectValue(candidate)?.id));
  return hasCompleteLegacyBase(ids) ? ids : null;
}

export function isValidHotbarLoadout(
  value: unknown,
  announcedSkills: readonly SkillId[] = WIRE_SKILL_IDS,
): value is HotbarAction[] {
  if (!Array.isArray(value) || value.length !== HOTBAR_SLOT_COUNT) return false;
  const available = new Set(uniqueSkillIds(announcedSkills));
  const seenActions = new Set<HotbarAction>();
  let skillCount = 0;
  for (const candidate of value) {
    if (candidate !== 'potion' && candidate !== 'mana-potion' && !isHotbarSkillAction(candidate)) return false;
    const action = candidate as HotbarAction;
    if (seenActions.has(action)) return false;
    seenActions.add(action);
    if (isHotbarSkillAction(action)) {
      if (!available.has(action)) return false;
      skillCount++;
    }
  }
  return skillCount === HOTBAR_SKILL_SLOT_COUNT
    && seenActions.has('potion')
    && seenActions.has('mana-potion');
}

/** Formatos v1 publicados tinham entre 6 e 8 slots; a ordem presente e intocavel. */
export function isMigratableLegacyHotbarLayout(value: unknown): value is HotbarAction[] {
  if (!Array.isArray(value) || value.length < 6 || value.length > HOTBAR_SLOT_COUNT) return false;
  const seen = new Set<HotbarAction>();
  let skills = 0;
  for (const candidate of value) {
    if (candidate !== 'potion' && candidate !== 'mana-potion' && !isHotbarSkillAction(candidate)) return false;
    const action = candidate as HotbarAction;
    if (seen.has(action)) return false;
    seen.add(action);
    if (isHotbarSkillAction(action)) skills++;
  }
  return seen.has('potion') && seen.has('mana-potion') && skills === value.length - 2;
}

/** Preserva toda entrada valida em ordem; so remove duplicatas/indisponiveis e preenche lacunas. */
export function repairHotbarLoadout(
  value: unknown,
  announcedSkills: readonly SkillId[] = WIRE_SKILL_IDS,
): HotbarAction[] {
  const available = uniqueSkillIds(announcedSkills);
  // Com menos de seis anuncios nao existe resultado completo legitimo. Nunca
  // preenche com uma skill fora do conjunto recebido; o reconciliador aguarda
  // um catalogo completo e preserva o layout corrente.
  const skillPool = available;
  const availableSet = new Set<SkillId>(skillPool);
  const seenActions = new Set<HotbarAction>();
  const candidates = Array.isArray(value) ? value : [];
  const preserveIndices = candidates.length === HOTBAR_SLOT_COUNT;
  const repaired: Array<HotbarAction | null> = preserveIndices
    ? Array<HotbarAction | null>(HOTBAR_SLOT_COUNT).fill(null)
    : [];
  let skillCount = 0;

  for (let index = 0; index < candidates.length; index++) {
    const candidate = candidates[index];
    if (candidate !== 'potion' && candidate !== 'mana-potion' && !isHotbarSkillAction(candidate)) continue;
    const action = candidate as HotbarAction;
    if (seenActions.has(action)) continue;
    if (isHotbarSkillAction(action)) {
      if (!availableSet.has(action) || skillCount >= HOTBAR_SKILL_SLOT_COUNT) continue;
      skillCount++;
    }
    seenActions.add(action);
    if (preserveIndices) repaired[index] = action;
    else repaired.push(action);
  }

  const addMissing = (action: HotbarAction): void => {
    if (preserveIndices) {
      const hole = repaired.indexOf(null);
      if (hole >= 0) repaired[hole] = action;
      return;
    }
    repaired.push(action);
  };

  for (const consumable of CONSUMABLES) {
    if (seenActions.has(consumable)) continue;
    seenActions.add(consumable);
    addMissing(consumable);
  }

  // Ordem deliberada: as seis legadas vêm primeiro; Dardo, Clamor, Orbe,
  // Forma, Raízes, Corrente, Renovação, Passo e Espírito começam desequipadas quando o servidor anuncia quinze habilidades.
  const fillSkills = uniqueSkillIds([...LEGACY_SKILL_IDS, ...skillPool]);
  for (const skill of fillSkills) {
    if (skillCount >= HOTBAR_SKILL_SLOT_COUNT) break;
    if (!availableSet.has(skill) || seenActions.has(skill)) continue;
    seenActions.add(skill);
    addMissing(skill);
    skillCount++;
  }

  return repaired.filter((action): action is HotbarAction => action !== null).slice(0, HOTBAR_SLOT_COUNT);
}

export function persistHotbarLoadout(storage: HotbarStorage, slots: readonly HotbarAction[]): boolean {
  try {
    const payload: StoredHotbarLoadoutV2 = { version: 2, slots: [...slots] };
    storage.setItem(HOTBAR_LOADOUT_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

function parseStored(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/**
 * Bootstrap sem catalogo autoritativo: aceita todas as ids conhecidas para nao
 * apagar Dardo salvo. A reconciliacao restrita acontece no primeiro wire real.
 */
export function loadHotbarLoadout(storage: HotbarStorage): LoadedHotbarLoadout {
  try {
    const v2 = objectValue(parseStored(storage.getItem(HOTBAR_LOADOUT_STORAGE_KEY)));
    if (v2?.version === 2) {
      const slots = v2.slots;
      const valid = isValidHotbarLoadout(slots);
      const repairedSlots = valid ? [...slots] as HotbarAction[] : repairHotbarLoadout(slots);
      if (!valid) persistHotbarLoadout(storage, repairedSlots);
      return { slots: repairedSlots, source: 'v2', repaired: !valid };
    }

    const legacy = parseStored(storage.getItem(LEGACY_HOTBAR_LAYOUT_STORAGE_KEY));
    if (Array.isArray(legacy)) {
      const valid = isMigratableLegacyHotbarLayout(legacy);
      const slots = valid && legacy.length === HOTBAR_SLOT_COUNT
        ? [...legacy] as HotbarAction[]
        : repairHotbarLoadout(legacy);
      persistHotbarLoadout(storage, slots);
      return { slots, source: 'v1', repaired: !valid };
    }
  } catch {
    // Storage e preferencia opcional; o default continua totalmente jogavel.
  }

  const slots = [...DEFAULT_HOTBAR_LOADOUT];
  persistHotbarLoadout(storage, slots);
  return { slots, source: 'default', repaired: false };
}

export function reconcileHotbarLoadout(
  slots: readonly HotbarAction[],
  announcedSkills: readonly SkillId[],
): HotbarAction[] {
  if (!hasCompleteLegacyBase(uniqueSkillIds(announcedSkills))) return [...slots];
  if (isValidHotbarLoadout(slots, announcedSkills)) return [...slots];
  return repairHotbarLoadout(slots, announcedSkills);
}

export function replaceHotbarSkill(
  slots: readonly HotbarAction[],
  equip: SkillId,
  replace: SkillId,
  announcedSkills: readonly SkillId[],
): HotbarAction[] | null {
  if (!announcedSkills.includes(equip) || equip === replace || slots.includes(equip)) return null;
  const index = slots.indexOf(replace);
  if (index < 0 || !isHotbarSkillAction(slots[index])) return null;
  const next = [...slots];
  next[index] = equip;
  return isValidHotbarLoadout(next, announcedSkills) ? next : null;
}

export function swapHotbarActions(
  slots: readonly HotbarAction[],
  from: HotbarAction,
  to: HotbarAction,
): HotbarAction[] | null {
  const fromIndex = slots.indexOf(from);
  const toIndex = slots.indexOf(to);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return null;
  const next = [...slots];
  [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
  return next;
}
