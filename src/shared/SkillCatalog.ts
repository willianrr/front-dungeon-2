import type {
  MasteryId,
  MasteryProgressState,
  SkillDiscipline,
  SkillId,
  SkillModifierState,
  SkillState,
  SkillTargetMode,
} from './types';

export interface NormalizedSkillState extends SkillState {
  discipline: SkillDiscipline;
  targetMode: SkillTargetMode;
  requiresPhysicalWeapon: boolean;
  stationary: boolean;
}

/** As seis skills que existiam antes do catalogo wire versionado. */
export const LEGACY_SKILL_IDS = [
  'arcane-nova',
  'war-cry',
  'charge',
  'heavy-strike',
  'steel-sweep',
  'iron-guard',
] as const satisfies readonly SkillId[];
export type LegacySkillId = typeof LEGACY_SKILL_IDS[number];

/** Mantido para verificadores/imports antigos; deliberadamente nao inclui Dardo. */
export const CURRENT_SKILL_IDS = LEGACY_SKILL_IDS;
export const OPTIONAL_WIRE_SKILL_IDS = ['arcane-bolt', 'bulwark-call', 'storm-orb', 'feral-form', 'root-snare', 'chain-lightning', 'renewal-wave', 'phase-step', 'nature-spirit'] as const satisfies readonly SkillId[];
export const WIRE_SKILL_IDS = [...LEGACY_SKILL_IDS, ...OPTIONAL_WIRE_SKILL_IDS] as const satisfies readonly SkillId[];

/**
 * Catalogo de compatibilidade. Os campos de combate continuam autoritativos
 * quando chegam pelo wire; estes valores apenas reproduzem o contrato das seis
 * habilidades atuais ao conectar num backend anterior ao catalogo.
 */
export const SKILL_CATALOG_FALLBACKS: Readonly<Record<LegacySkillId, NormalizedSkillState>> = {
  'arcane-nova': {
    id: 'arcane-nova',
    label: 'Nova Arcana',
    description: 'Explosão mágica ao redor do herói.',
    manaCost: 25,
    cooldown: 4.5,
    cooldownRemaining: 0,
    discipline: 'arcana',
    targetMode: 'self-area',
    requiresPhysicalWeapon: false,
    stationary: true,
  },
  'war-cry': {
    id: 'war-cry',
    label: 'Grito de Guerra',
    description: 'Fortalece temporariamente o combate do herói.',
    manaCost: 0,
    cooldown: 12,
    cooldownRemaining: 0,
    discipline: 'martial',
    targetMode: 'self',
    requiresPhysicalWeapon: false,
    stationary: false,
  },
  charge: {
    id: 'charge',
    label: 'Investida',
    description: 'Avança até o inimigo e desfere um golpe físico.',
    manaCost: 0,
    cooldown: 6.5,
    cooldownRemaining: 0,
    discipline: 'martial',
    targetMode: 'enemy',
    requiresPhysicalWeapon: false,
    stationary: false,
    masteryId: 'martial',
  },
  'heavy-strike': {
    id: 'heavy-strike',
    label: 'Golpe Pesado',
    description: 'Um ataque físico concentrado contra o inimigo selecionado.',
    manaCost: 0,
    cooldown: 3.2,
    cooldownRemaining: 0,
    discipline: 'martial',
    targetMode: 'enemy',
    requiresPhysicalWeapon: false,
    stationary: true,
    masteryId: 'martial',
  },
  'steel-sweep': {
    id: 'steel-sweep',
    label: 'Varredura de Aço',
    description: 'Atinge inimigos próximos; a arma equipada define o efeito adicional.',
    manaCost: 0,
    cooldown: 5.5,
    cooldownRemaining: 0,
    discipline: 'martial',
    targetMode: 'self-area',
    requiresPhysicalWeapon: true,
    stationary: true,
    masteryId: 'martial',
  },
  'iron-guard': {
    id: 'iron-guard',
    label: 'Guarda de Ferro',
    description: 'Assume uma postura defensiva curta que exige permanecer parado.',
    manaCost: 0,
    cooldown: 7,
    cooldownRemaining: 0,
    discipline: 'survival',
    targetMode: 'self',
    requiresPhysicalWeapon: false,
    stationary: true,
  },
};

/**
 * Defaults defensivos usados somente depois que `arcane-bolt` veio no wire.
 * Nao faz parte do catalogo legado e nunca e anexado por conta propria.
 */
export const ARCANE_BOLT_WIRE_DEFAULTS: Readonly<NormalizedSkillState> = {
  id: 'arcane-bolt',
  label: 'Dardo Arcano',
  description: 'Dispara um projétil arcano que desacelera o inimigo atingido.',
  manaCost: 18,
  cooldown: 2.8,
  cooldownRemaining: 0,
  range: 12,
  discipline: 'arcana',
  targetMode: 'enemy',
  requiresPhysicalWeapon: false,
  stationary: true,
  masteryId: 'arcana',
};

/** Defaults usados somente depois que o servidor anunciou o Clamor. */
export const BULWARK_CALL_WIRE_DEFAULTS: Readonly<NormalizedSkillState> = {
  id: 'bulwark-call',
  label: 'Clamor do Baluarte',
  description: 'Provoca inimigos próximos e fortalece a defesa contra seus ataques.',
  manaCost: 0,
  cooldown: 12,
  cooldownRemaining: 0,
  range: 8.5,
  discipline: 'survival',
  targetMode: 'self-area',
  requiresPhysicalWeapon: false,
  stationary: false,
  masteryId: 'survival',
};

/** Defaults usados somente depois que o servidor anunciou o Orbe. */
export const STORM_ORB_WIRE_DEFAULTS: Readonly<NormalizedSkillState> = {
  id: 'storm-orb',
  label: 'Orbe da Tempestade',
  description: 'Invoca um orbe de quatro cargas que ataca autonomamente inimigos visíveis próximos.',
  manaCost: 22,
  cooldown: 12,
  cooldownRemaining: 0,
  range: 9,
  discipline: 'arcana',
  targetMode: 'self',
  requiresPhysicalWeapon: false,
  stationary: true,
  masteryId: 'arcana',
};

/** Defaults usados somente depois que o servidor anunciou a transformação. */
export const FERAL_FORM_WIRE_DEFAULTS: Readonly<NormalizedSkillState> = {
  id: 'feral-form',
  label: 'Forma Feral',
  description: 'Assume uma forma bestial: +25% de movimento e cadência, +0,45 m de alcance e +15% de dano nos ataques básicos por 7 s.',
  manaCost: 20,
  cooldown: 20,
  cooldownRemaining: 0,
  discipline: 'survival',
  targetMode: 'self',
  requiresPhysicalWeapon: false,
  stationary: true,
  masteryId: 'survival',
};

/** Defaults usados somente depois que o servidor anunciou o círculo. */
export const ROOT_SNARE_WIRE_DEFAULTS: Readonly<NormalizedSkillState> = {
  id: 'root-snare',
  label: 'Círculo de Raízes',
  description: 'Cria por 4 s uma área de raízes que reduz movimento em 35% e atrasa a primeira ação de até oito inimigos.',
  manaCost: 24,
  cooldown: 9,
  cooldownRemaining: 0,
  range: 10,
  discipline: 'survival',
  targetMode: 'ground',
  requiresPhysicalWeapon: false,
  stationary: true,
  masteryId: 'survival',
};

/** Defaults usados somente depois que o servidor anunciou a corrente. */
export const CHAIN_LIGHTNING_WIRE_DEFAULTS: Readonly<NormalizedSkillState> = {
  id: 'chain-lightning',
  label: 'Relâmpago Encadeado',
  description: 'Atinge até quatro inimigos; cada salto procura o alvo visível mais próximo e causa 22% menos dano.',
  manaCost: 28,
  cooldown: 7.5,
  cooldownRemaining: 0,
  range: 11,
  discipline: 'arcana',
  targetMode: 'enemy',
  requiresPhysicalWeapon: false,
  stationary: true,
  masteryId: 'arcana',
};

export const RENEWAL_WAVE_WIRE_DEFAULTS: Readonly<NormalizedSkillState> = {
  id: 'renewal-wave',
  label: 'Onda de Renovação',
  description: 'Cura o conjurador e salta por até três aliados feridos; cada elo prioriza maior vida faltante e perde 15% de potência.',
  manaCost: 26,
  cooldown: 11,
  cooldownRemaining: 0,
  range: 7,
  discipline: 'survival',
  targetMode: 'self',
  requiresPhysicalWeapon: false,
  stationary: true,
  masteryId: 'survival',
};

export const PHASE_STEP_WIRE_DEFAULTS: Readonly<NormalizedSkillState> = {
  id: 'phase-step',
  label: 'Passo Espectral',
  description: 'Transpõe até 6 m em linha reta; paredes e destinos ocupados bloqueiam o deslocamento.',
  manaCost: 18,
  cooldown: 6,
  cooldownRemaining: 0,
  range: 6,
  discipline: 'arcana',
  targetMode: 'ground',
  requiresPhysicalWeapon: false,
  stationary: false,
  masteryId: 'arcana',
};

export const NATURE_SPIRIT_WIRE_DEFAULTS: Readonly<NormalizedSkillState> = {
  id: 'nature-spirit',
  label: 'Espírito de Aranna',
  description: 'Invoca por 18 s um espírito que acompanha o herói, segue seu foco de combate ou ataca o inimigo visível mais próximo.',
  manaCost: 32,
  cooldown: 24,
  cooldownRemaining: 0,
  range: 8,
  discipline: 'survival',
  targetMode: 'self',
  requiresPhysicalWeapon: false,
  stationary: true,
  masteryId: 'survival',
};

const DISCIPLINES = new Set<SkillDiscipline>(['martial', 'arcana', 'survival']);
const TARGET_MODES = new Set<SkillTargetMode>(['self', 'self-area', 'enemy', 'ground']);

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function finiteNonNegative(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function nonEmptyString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeSkillModifiers(value: unknown): SkillModifierState[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const modifiers: SkillModifierState[] = [];
  const seen = new Set<string>();
  for (const candidate of value) {
    const source = objectValue(candidate);
    if (!source) continue;
    const id = typeof source.id === 'string' ? source.id.trim() : '';
    const label = typeof source.label === 'string' ? source.label.trim() : '';
    const description = typeof source.description === 'string' ? source.description.trim() : '';
    if (!id || !label || !description || seen.has(id)) continue;
    if (id.length > 120 || label.length > 120 || description.length > 500) continue;
    seen.add(id);
    modifiers.push({ id, label, description });
  }
  return modifiers.length > 0 ? modifiers : undefined;
}

export function isCurrentSkillId(value: unknown): value is SkillId {
  return typeof value === 'string' && (WIRE_SKILL_IDS as readonly string[]).includes(value);
}

export function isLegacySkillId(value: unknown): value is LegacySkillId {
  return typeof value === 'string' && (LEGACY_SKILL_IDS as readonly string[]).includes(value);
}

/** Normaliza uma entrada do wire sem deixar metadado parcial mudar o cast. */
export function normalizeSkillState(id: SkillId, value?: unknown): NormalizedSkillState {
  const fallback = id === 'arcane-bolt'
    ? ARCANE_BOLT_WIRE_DEFAULTS
    : id === 'bulwark-call'
      ? BULWARK_CALL_WIRE_DEFAULTS
      : id === 'storm-orb'
        ? STORM_ORB_WIRE_DEFAULTS
        : id === 'feral-form'
          ? FERAL_FORM_WIRE_DEFAULTS
          : id === 'root-snare'
            ? ROOT_SNARE_WIRE_DEFAULTS
            : id === 'chain-lightning'
              ? CHAIN_LIGHTNING_WIRE_DEFAULTS
              : id === 'renewal-wave'
                ? RENEWAL_WAVE_WIRE_DEFAULTS
                : id === 'phase-step'
                  ? PHASE_STEP_WIRE_DEFAULTS
                  : id === 'nature-spirit'
                    ? NATURE_SPIRIT_WIRE_DEFAULTS
                    : SKILL_CATALOG_FALLBACKS[id];
  const source = objectValue(value);
  const discipline = source?.discipline;
  const targetMode = source?.targetMode;
  const variant = source?.variant;
  const description = source?.description;
  const masteryId = source?.masteryId;
  const normalized: NormalizedSkillState = {
    id,
    label: nonEmptyString(source?.label, fallback.label),
    manaCost: finiteNonNegative(source?.manaCost, fallback.manaCost),
    cooldown: finiteNonNegative(source?.cooldown, fallback.cooldown),
    cooldownRemaining: finiteNonNegative(source?.cooldownRemaining, fallback.cooldownRemaining),
    discipline: DISCIPLINES.has(discipline as SkillDiscipline)
      ? discipline as SkillDiscipline
      : fallback.discipline,
    targetMode: TARGET_MODES.has(targetMode as SkillTargetMode)
      ? targetMode as SkillTargetMode
      : fallback.targetMode,
    requiresPhysicalWeapon: typeof source?.requiresPhysicalWeapon === 'boolean'
      ? source.requiresPhysicalWeapon
      : fallback.requiresPhysicalWeapon,
    stationary: typeof source?.stationary === 'boolean'
      ? source.stationary
      : fallback.stationary,
  };
  const normalizedRange = finiteNonNegative(source?.range, fallback.range ?? -1);
  if (normalizedRange >= 0) normalized.range = normalizedRange;
  const normalizedDescription = nonEmptyString(description, fallback.description ?? '');
  if (normalizedDescription) normalized.description = normalizedDescription;
  if (typeof variant === 'string' && variant.trim()) normalized.variant = variant as SkillState['variant'];
  if (source?.pending === true) normalized.pending = true;
  const blockedReason = typeof source?.blockedReason === 'string' ? source.blockedReason.trim() : '';
  if (source?.blocked === true && blockedReason) {
    normalized.blocked = true;
    normalized.blockedReason = blockedReason.slice(0, 500);
  }
  const normalizedMasteryId = masteryId === 'martial' || masteryId === 'arcana' || masteryId === 'survival'
    ? masteryId
    : fallback.masteryId;
  if (normalizedMasteryId === 'martial' || normalizedMasteryId === 'arcana' || normalizedMasteryId === 'survival') {
    normalized.masteryId = normalizedMasteryId;
  }
  const modifiers = normalizeSkillModifiers(source?.modifiers);
  if (modifiers) normalized.modifiers = modifiers;
  return normalized;
}

/**
 * As seis skills legadas existem como fallback. Dardo Arcano so entra quando
 * uma entrada valida com esse id foi anunciada explicitamente no wire.
 */
export function normalizeSkillCatalog(skills?: unknown): NormalizedSkillState[] {
  const byId = new Map<SkillId, unknown>();
  for (const candidate of Array.isArray(skills) ? skills : []) {
    const source = objectValue(candidate);
    if (isCurrentSkillId(source?.id) && !byId.has(source.id)) byId.set(source.id, candidate);
  }
  const normalized = LEGACY_SKILL_IDS.map((id) => normalizeSkillState(id, byId.get(id)));
  for (const id of OPTIONAL_WIRE_SKILL_IDS) {
    if (byId.has(id)) normalized.push(normalizeSkillState(id, byId.get(id)));
  }
  return normalized;
}

export function catalogSkill(skills: unknown, id: LegacySkillId): NormalizedSkillState;
export function catalogSkill(skills: unknown, id: 'arcane-bolt'): NormalizedSkillState | null;
export function catalogSkill(skills: unknown, id: 'bulwark-call'): NormalizedSkillState | null;
export function catalogSkill(skills: unknown, id: 'storm-orb'): NormalizedSkillState | null;
export function catalogSkill(skills: unknown, id: 'feral-form'): NormalizedSkillState | null;
export function catalogSkill(skills: unknown, id: 'root-snare'): NormalizedSkillState | null;
export function catalogSkill(skills: unknown, id: 'chain-lightning'): NormalizedSkillState | null;
export function catalogSkill(skills: unknown, id: 'renewal-wave'): NormalizedSkillState | null;
export function catalogSkill(skills: unknown, id: 'phase-step'): NormalizedSkillState | null;
export function catalogSkill(skills: unknown, id: 'nature-spirit'): NormalizedSkillState | null;
export function catalogSkill(skills: unknown, id: SkillId): NormalizedSkillState | null;
export function catalogSkill(skills: unknown, id: SkillId): NormalizedSkillState | null {
  return normalizeSkillCatalog(skills).find((skill) => skill.id === id) ?? null;
}

export interface SkillCastContext {
  selectedTargetId?: string | null;
  selectedTargetIsAliveEnemy?: boolean;
  groundTargetAvailable?: boolean;
  hasPhysicalWeapon?: boolean;
  /** Somente decide predicao de interrupcao; nunca bloqueia o envio autoritativo. */
  movementInterruptionPlausible?: boolean;
}

export interface SkillCastPlan {
  allowed: boolean;
  failure: 'target-required' | 'ground-target-required' | 'physical-weapon-required' | 'temporarily-blocked' | null;
  failureReason?: string;
  skill: SkillId;
  targetMode: SkillTargetMode;
  targetId?: string;
  clearMovement: boolean;
}

/** Planejamento local de UX; cooldown, mana, alcance e dano seguem no servidor. */
export function skillCastPlan(skill: NormalizedSkillState, context: SkillCastContext = {}): SkillCastPlan {
  if (skill.blocked && skill.blockedReason) {
    return {
      allowed: false,
      failure: 'temporarily-blocked',
      failureReason: skill.blockedReason,
      skill: skill.id,
      targetMode: skill.targetMode,
      clearMovement: false,
    };
  }
  if (skill.requiresPhysicalWeapon && !context.hasPhysicalWeapon) {
    return {
      allowed: false,
      failure: 'physical-weapon-required',
      skill: skill.id,
      targetMode: skill.targetMode,
      clearMovement: false,
    };
  }
  if (skill.targetMode === 'enemy' && (!context.selectedTargetId || !context.selectedTargetIsAliveEnemy)) {
    return {
      allowed: false,
      failure: 'target-required',
      skill: skill.id,
      targetMode: skill.targetMode,
      clearMovement: false,
    };
  }
  if (skill.targetMode === 'ground' && context.groundTargetAvailable !== true) {
    return {
      allowed: false,
      failure: 'ground-target-required',
      skill: skill.id,
      targetMode: skill.targetMode,
      clearMovement: false,
    };
  }
  return {
    allowed: true,
    failure: null,
    skill: skill.id,
    targetMode: skill.targetMode,
    ...(skill.targetMode === 'enemy' && context.selectedTargetId
      ? { targetId: context.selectedTargetId }
      : {}),
    clearMovement: skill.stationary && context.movementInterruptionPlausible !== false,
  };
}

export const MARTIAL_MASTERY_FALLBACK: Readonly<MasteryProgressState> = {
  id: 'martial',
  label: 'Maestria Marcial',
  level: 1,
  xp: 0,
  xpIntoLevel: 0,
  xpToNext: 30,
  maxLevel: 10,
  damageBonus: 0,
};

export const ARCANA_MASTERY_FALLBACK: Readonly<MasteryProgressState> = {
  id: 'arcana',
  label: 'Maestria Arcana',
  level: 1,
  xp: 0,
  xpIntoLevel: 0,
  xpToNext: 30,
  maxLevel: 10,
  damageBonus: 0,
};

export const SURVIVAL_MASTERY_FALLBACK: Readonly<MasteryProgressState> = {
  id: 'survival',
  label: 'Maestria de Sobrevivência',
  level: 1,
  xp: 0,
  xpIntoLevel: 0,
  xpToNext: 30,
  maxLevel: 10,
  damageBonus: 0,
  defenseBonus: 0,
};

export const MASTERY_MAX_LEVEL = 10;
export const MASTERY_MAX_XP = 1350;
export const MARTIAL_MASTERY_MAX_LEVEL = MASTERY_MAX_LEVEL;
export const MARTIAL_MASTERY_MAX_XP = MASTERY_MAX_XP;

function boundedInteger(value: unknown, fallback: number, minimum: number, maximum: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.floor(value)));
}

export function masteryThreshold(level: number): number {
  const normalizedLevel = Math.max(1, Math.min(MASTERY_MAX_LEVEL, Math.floor(level)));
  return 15 * normalizedLevel * (normalizedLevel - 1);
}

export function masteryLevelForXp(xp: number): number {
  let level = 1;
  for (let candidate = 2; candidate <= MASTERY_MAX_LEVEL; candidate++) {
    if (xp < masteryThreshold(candidate)) break;
    level = candidate;
  }
  return level;
}

export function normalizeMastery(id: MasteryId, value?: unknown): MasteryProgressState {
  const fallback = id === 'arcana'
    ? ARCANA_MASTERY_FALLBACK
    : id === 'survival'
      ? SURVIVAL_MASTERY_FALLBACK
      : MARTIAL_MASTERY_FALLBACK;
  const source = objectValue(value);
  const xp = boundedInteger(source?.xp, fallback.xp, 0, MASTERY_MAX_XP);
  const level = masteryLevelForXp(xp);
  const xpIntoLevel = xp - masteryThreshold(level);
  const xpToNext = level >= MASTERY_MAX_LEVEL
    ? 0
    : masteryThreshold(level + 1) - masteryThreshold(level);
  const canonicalDamageBonus = (level - 1) * 0.02;
  const canonicalDefenseBonus = id === 'survival' ? canonicalDamageBonus : 0;
  return {
    id,
    label: nonEmptyString(source?.label, fallback.label),
    level,
    xp,
    xpIntoLevel,
    xpToNext,
    maxLevel: MASTERY_MAX_LEVEL,
    damageBonus: id === 'survival'
      ? 0
      : Math.min(0.18, finiteNonNegative(source?.damageBonus, canonicalDamageBonus)),
    ...(id === 'survival' ? {
      defenseBonus: Math.min(0.18, finiteNonNegative(source?.defenseBonus, canonicalDefenseBonus)),
    } : {}),
  };
}

export function normalizeMartialMastery(value?: unknown): MasteryProgressState {
  return normalizeMastery('martial', value);
}

export function martialMastery(masteries?: unknown): MasteryProgressState {
  const value = Array.isArray(masteries)
    ? masteries.find((candidate) => objectValue(candidate)?.id === 'martial')
    : undefined;
  return normalizeMartialMastery(value);
}

function announcedArcanaSkill(skills: unknown): boolean {
  return Array.isArray(skills) && skills.some((candidate) => {
    const source = objectValue(candidate);
    return source?.id === 'arcane-bolt'
      || (isCurrentSkillId(source?.id) && source?.masteryId === 'arcana');
  });
}

/**
 * Arcana e opcional por compatibilidade: aparece se o backend enviou sua
 * maestria ou anunciou uma skill arcana vinculada. Servidor antigo fica com
 * apenas Marcial e nunca ganha uma barra fantasma.
 */
export function arcanaMastery(masteries?: unknown, skills?: unknown): MasteryProgressState | null {
  const value = Array.isArray(masteries)
    ? masteries.find((candidate) => objectValue(candidate)?.id === 'arcana')
    : undefined;
  if (!value && !announcedArcanaSkill(skills)) return null;
  return normalizeMastery('arcana', value);
}

function announcedSurvivalSkill(skills: unknown): boolean {
  return Array.isArray(skills) && skills.some((candidate) => {
    const source = objectValue(candidate);
    // Guarda de Ferro existe no legado; nunca a usa para inventar a terceira
    // barra num servidor de seis/sete skills. Clamor e o opt-in inequivoco.
    return source?.id === 'bulwark-call';
  });
}

/** Sobrevivencia permanece invisivel ate uma declaracao explicita do wire. */
export function survivalMastery(masteries?: unknown, skills?: unknown): MasteryProgressState | null {
  const value = Array.isArray(masteries)
    ? masteries.find((candidate) => objectValue(candidate)?.id === 'survival')
    : undefined;
  if (!value && !announcedSurvivalSkill(skills)) return null;
  return normalizeMastery('survival', value);
}

export function normalizeMasteries(masteries?: unknown, skills?: unknown): MasteryProgressState[] {
  const normalized = [martialMastery(masteries)];
  const arcana = arcanaMastery(masteries, skills);
  if (arcana) normalized.push(arcana);
  const survival = survivalMastery(masteries, skills);
  if (survival) normalized.push(survival);
  return normalized;
}

export function masteryById(
  masteries: unknown,
  id: MasteryId,
  skills?: unknown,
): MasteryProgressState | null {
  if (id === 'martial') return martialMastery(masteries);
  return id === 'arcana'
    ? arcanaMastery(masteries, skills)
    : survivalMastery(masteries, skills);
}

export function masteryProgressRatio(mastery: MasteryProgressState): number {
  if (mastery.level >= mastery.maxLevel) return 1;
  if (!Number.isFinite(mastery.xpToNext) || mastery.xpToNext <= 0) return 0;
  return Math.max(0, Math.min(1, mastery.xpIntoLevel / mastery.xpToNext));
}

const DISCIPLINE_LABELS: Readonly<Record<SkillDiscipline, string>> = {
  martial: 'Marcial',
  arcana: 'Arcana',
  survival: 'Sobrevivência',
};

const TARGET_MODE_LABELS: Readonly<Record<SkillTargetMode, string>> = {
  self: 'próprio herói',
  'self-area': 'área ao redor',
  enemy: 'inimigo selecionado',
  ground: 'área no chão',
};

function secondsLabel(value: number): string {
  return value.toFixed(Number.isInteger(value) ? 0 : 1).replace('.', ',');
}

export interface SkillTooltipOptions {
  mastery?: MasteryProgressState | null;
  mechanics?: string;
  /** Habilitado somente depois do gate canonico de Doutrinas no snapshot. */
  showModifiers?: boolean;
  activeModifierId?: string | null;
  /** Permite Doutrina e Forma coexistirem sem perder nenhuma descricao. */
  activeModifierIds?: readonly string[];
}

/** Tooltip comum para metadados do catalogo, sem inferir regra pelo nome da skill. */
export function skillCatalogTooltip(skill: NormalizedSkillState, options: SkillTooltipOptions = {}): string {
  const parts = [skill.label];
  const mechanics = options.mechanics?.trim() || skill.description?.trim();
  if (mechanics) parts.push(mechanics.replace(/[.\s]+$/, ''));
  parts.push(`Disciplina: ${DISCIPLINE_LABELS[skill.discipline]}`);
  parts.push(`Alvo: ${TARGET_MODE_LABELS[skill.targetMode]}`);
  if (skill.stationary) parts.push('Interrompe o movimento ao executar');
  if (skill.requiresPhysicalWeapon && !/requer (?:uma )?arma física/i.test(mechanics ?? '')) {
    parts.push('Requer arma física equipada');
  }
  if (skill.masteryId === 'martial' || skill.masteryId === 'arcana' || skill.masteryId === 'survival') {
    const mastery = normalizeMastery(skill.masteryId, options.mastery);
    const masteryBonus = skill.masteryId === 'survival'
      ? `+${Math.round((mastery.defenseBonus ?? 0) * 100)}% potência defensiva`
      : `+${Math.round(mastery.damageBonus * 100)}% dano`;
    parts.push(`${mastery.label} Nv ${mastery.level} (${masteryBonus})`);
  }
  if (typeof skill.range === 'number' && Number.isFinite(skill.range) && skill.range > 0) {
    parts.push(`Alcance ${secondsLabel(skill.range)} m`);
  }
  if (skill.manaCost > 0) parts.push(`${secondsLabel(skill.manaCost)} mana`);
  parts.push(`Recarga ${secondsLabel(skill.cooldown)} s`);
  const activeModifierIds = new Set(
    options.activeModifierIds ??
    (options.activeModifierId ? [options.activeModifierId] : []),
  );
  if (options.showModifiers && activeModifierIds.size > 0) {
    for (const modifier of skill.modifiers ?? []) {
      if (!activeModifierIds.has(modifier.id)) continue;
      const category = modifier.id.startsWith('warrior_sweep_form_') ? 'Forma' : 'Doutrina';
      parts.push(`${category}: ${modifier.label} — ${modifier.description.replace(/[.\s]+$/, '')}`);
    }
  }
  return `${parts.join(' · ')}.`;
}
