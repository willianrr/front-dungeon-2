import { equipSlotsForKind, isGemKind, itemDisplayName, itemIconFor } from '../shared/itemMeta';
import type { EquipmentSlot, ForgeIngredientState, ForgeRecipeState, ItemAffix, ItemKind, ItemRarity, NpcKind, NpcShopItemState, NpcState, WeaponElement, WeaponGlowGem, WorldZone } from '../shared/types';
import type { WorldData } from '../shared/worldgen';

export interface VendorShopItem {
  id: string;
  kind: ItemKind;
  name: string;
  icon: string;
  price: number;
  rarity?: ItemRarity;
  itemLevel?: number;
  affixes?: ItemAffix[];
  upgradeLevel?: number;
  glowGem?: WeaponGlowGem;
  element?: WeaponElement;
  damageMin?: number;
  damageMax?: number;
  magicDamageMin?: number;
  magicDamageMax?: number;
  armor?: number;
  bonusHp?: number;
  bonusMana?: number;
  bonusCrit?: number;
  equipSlot?: EquipmentSlot;
  stackable?: boolean;
  usable?: boolean;
  count?: number;
  stock?: number;
  tagline?: string;
	service?: 'expedition_mule';
}

export interface NpcDefinition {
  id: string;
  kind: NpcKind;
  name: string;
  title: string;
  zone: WorldZone;
  position: { x: number; y: number; z: number };
  rotationY: number;
  modelUrl: string;
  interactRange: number;
  clickRadius: number;
  collisionRadius: number;
  shopItems?: VendorShopItem[];
  forgeRecipes?: ForgeRecipeState[];
  dialogue?: {
    greeting: string;
    actionLabel: string;
  };
}

const WARRIOR_NPC_MODEL_URL = '/models/warrior.glb';

const NPC_ITEM_TAGLINES: Record<string, string> = {
  'vendor-health-potion': 'Cura rapida para a proxima luta.',
  'vendor-mana-potion': 'Mana para manter habilidades ativas.',
  'vendor-starter-sword': 'Arma de entrada para testar loja.',
  'vendor-jewel-soul': 'Gema rara para upgrades futuros.',
	'vendor-expedition-mule': 'Companheira permanente com 12 espaços para materiais e poções.',
};

function shopItemFromState(item: NpcShopItemState): VendorShopItem {
  const equipSlot = equipSlotsForKind(item.kind)[0];
  const stackable = item.kind === 'coin' || item.kind === 'potion' || item.kind === 'mana_potion' || isGemKind(item.kind);
  return {
    id: item.id,
    kind: item.kind,
	name: item.service === 'expedition_mule' ? 'Mula de Expedição' : itemDisplayName(item),
	icon: item.service === 'expedition_mule' ? '/hud/runtime/expedition-mule.svg' : itemIconFor(item.kind, item.rarity),
    price: item.price,
    rarity: item.rarity || undefined,
    itemLevel: item.itemLevel,
    affixes: item.affixes,
    upgradeLevel: item.upgradeLevel,
    glowGem: item.glowGem,
    element: item.element,
    damageMin: item.damageMin,
    damageMax: item.damageMax,
    magicDamageMin: item.magicDamageMin,
    magicDamageMax: item.magicDamageMax,
    armor: item.armor,
    bonusHp: item.bonusHp,
    bonusMana: item.bonusMana,
    bonusCrit: item.bonusCrit,
    count: item.count,
    equipSlot,
    stackable,
    usable: item.kind === 'potion' || item.kind === 'mana_potion',
    stock: item.stock,
    tagline: NPC_ITEM_TAGLINES[item.id],
	service: item.service,
  };
}

/** Completa o contrato novo sem quebrar snapshots de servidores anteriores. */
function forgeRecipeFromState(recipe: ForgeRecipeState): ForgeRecipeState {
  const legacy = recipe as ForgeRecipeState & {
    recipeType?: ForgeRecipeState['recipeType'];
    ingredients?: ForgeIngredientState[];
    requiredLevel?: number;
    xpReward?: number;
  };
  const ingredients = legacy.ingredients?.filter((ingredient) => ingredient.count > 0) ?? [];
  if (ingredients.length === 0 && legacy.inputKind && legacy.inputCount > 0) {
    ingredients.push({ kind: legacy.inputKind, count: legacy.inputCount });
  }
  const primary = ingredients[0];
  const inferredLevel = recipe.id.includes('mithril') ? 3 : recipe.id.includes('iron') ? 2 : 1;
  return {
    ...recipe,
    recipeType: legacy.recipeType ?? 'smelting',
    ingredients,
    inputKind: legacy.inputKind ?? primary?.kind,
    inputCount: legacy.inputCount || primary?.count || 1,
    requiredLevel: Math.max(1, Math.floor(legacy.requiredLevel ?? inferredLevel)),
    xpReward: Math.max(0, Math.floor(legacy.xpReward ?? 0)),
  };
}

export function npcDefinitionsFromSnapshot(npcs: readonly NpcState[] | null | undefined): NpcDefinition[] {
  if (!npcs?.length) return [];
  return npcs.map((npc) => ({
    id: npc.id,
    kind: npc.kind,
    name: npc.name,
    title: npc.title,
    zone: npc.zone,
    position: npc.position,
    rotationY: npc.rotationY,
    modelUrl: npc.modelUrl || WARRIOR_NPC_MODEL_URL,
    interactRange: npc.interactRange,
    clickRadius: npc.clickRadius,
    collisionRadius: npc.collisionRadius,
    shopItems: npc.kind === 'vendor' ? (npc.shopItems ?? []).map(shopItemFromState) : undefined,
    forgeRecipes: npc.kind === 'blacksmith' ? (npc.forgeRecipes ?? []).map(forgeRecipeFromState) : undefined,
    dialogue: npc.dialogue,
  }));
}

// Anel de NPCs ao redor do spawn (0,0): raios ~8.8-9.6, vaos de ~40 graus,
// distancia minima ~6 entre vizinhos. Todos virados para o centro
// (rotationY = bearing - PI). Espelha sim/npc.go do back-dungeon.
function fallbackNpcStates(world: WorldData): NpcState[] {
  const vendorX = 9.46; // bearing 95
  const vendorZ = -0.83;
  const questX = -3.18; // bearing 340 (quase em frente ao spawn do jogador)
  const questZ = 8.74;
  const healerX = -5.79; // bearing 220
  const healerZ = -6.89;
  const smithX = 8.14; // bearing 60
  const smithZ = 4.70;
  const trainerX = 3.15; // bearing 20
  const trainerZ = 8.65;
  const travelX = -9.45; // bearing 260
  const travelZ = -1.67;
  const bankerX = 6.74; // bearing 130 (afastado da pedra do mundo em ~(5.0, -9.3))
  const bankerZ = -5.66;
  const jewelerX = -7.79; // bearing 300
  const jewelerZ = 4.50;
  const guardX = 0.0; // bearing 180
  const guardZ = -9.5;
  const dungeonTravelX = 3.2;
  const dungeonTravelZ = -17.2;
  return [
    {
      id: 'npc-merchant-aran',
      kind: 'vendor',
      name: 'Aran',
      title: 'Mercador',
      zone: 'overworld',
      position: {
        x: vendorX,
        y: world.terrain.heightAt(vendorX, vendorZ),
        z: vendorZ,
      },
      rotationY: -Math.PI * 0.472,
      modelUrl: WARRIOR_NPC_MODEL_URL,
      interactRange: 2.6,
      clickRadius: 1.35,
      collisionRadius: 0.72,
      shopItems: [
		{
		  id: 'vendor-expedition-mule',
		  kind: 'coin',
		  price: 180,
		  stock: 1,
		  service: 'expedition_mule',
		},
        {
          id: 'vendor-health-potion',
          kind: 'potion',
          price: 12,
          count: 1,
        },
        {
          id: 'vendor-mana-potion',
          kind: 'mana_potion',
          price: 14,
          count: 1,
        },
        {
          id: 'vendor-starter-sword',
          kind: 'sword',
          price: 85,
          rarity: 'incomum',
          upgradeLevel: 3,
          stock: 1,
          glowGem: 'bless',
          damageMin: 7,
          damageMax: 13,
        },
        {
          id: 'vendor-jewel-soul',
          kind: 'jewel_soul',
          price: 140,
          rarity: 'raro',
          stock: 1,
          count: 1,
          glowGem: 'soul',
        },
      ],
    },
    {
      id: 'npc-quest-lyra',
      kind: 'quest',
      name: 'Lyra',
      title: 'Guia de Missoes',
      zone: 'overworld',
      position: {
        x: questX,
        y: world.terrain.heightAt(questX, questZ),
        z: questZ,
      },
      rotationY: Math.PI * 0.889,
      modelUrl: WARRIOR_NPC_MODEL_URL,
      interactRange: 2.7,
      clickRadius: 1.35,
      collisionRadius: 0.72,
      dialogue: {
        greeting: 'A estrada ate a dungeon ainda esta instavel. Fale comigo para acompanhar seu proximo objetivo.',
        actionLabel: 'Acompanhar',
      },
    },
    {
      id: 'npc-healer-mira',
      kind: 'healer',
      name: 'Mira',
      title: 'Curandeira',
      zone: 'overworld',
      position: {
        x: healerX,
        y: world.terrain.heightAt(healerX, healerZ),
        z: healerZ,
      },
      rotationY: Math.PI * 0.222,
      modelUrl: WARRIOR_NPC_MODEL_URL,
      interactRange: 2.7,
      clickRadius: 1.35,
      collisionRadius: 0.72,
      dialogue: {
        greeting: 'Respire fundo. Posso restaurar sua vida e mana por algumas moedas antes da proxima investida.',
        actionLabel: 'Curar',
      },
    },
    {
      id: 'npc-blacksmith-borin',
      kind: 'blacksmith',
      name: 'Borin',
      title: 'Ferreiro',
      zone: 'overworld',
      position: {
        x: smithX,
        y: world.terrain.heightAt(smithX, smithZ),
        z: smithZ,
      },
      rotationY: -Math.PI * 0.667,
      modelUrl: WARRIOR_NPC_MODEL_URL,
      interactRange: 2.7,
      clickRadius: 1.35,
      collisionRadius: 0.72,
      dialogue: {
        greeting: 'Traga minérios para fundir barras ou uma joia para fortalecer sua arma.',
        actionLabel: 'Forjar',
      },
      forgeRecipes: [
        {
          id: 'smelt-copper-bar', label: 'Barra de Cobre', recipeType: 'smelting',
          ingredients: [{ kind: 'copper_ore', count: 3 }], inputKind: 'copper_ore', inputCount: 3,
          outputKind: 'copper_bar', outputCount: 1, requiredLevel: 1, xpReward: 6,
        },
        {
          id: 'smelt-iron-bar', label: 'Barra de Ferro', recipeType: 'smelting',
          ingredients: [{ kind: 'iron_ore', count: 3 }], inputKind: 'iron_ore', inputCount: 3,
          outputKind: 'iron_bar', outputCount: 1, requiredLevel: 2, xpReward: 10,
        },
        {
          id: 'smelt-mithril-bar', label: 'Barra de Mithril', recipeType: 'smelting',
          ingredients: [{ kind: 'mithril_ore', count: 3 }], inputKind: 'mithril_ore', inputCount: 3,
          outputKind: 'mithril_bar', outputCount: 1, requiredLevel: 3, xpReward: 16,
        },
        {
          id: 'forge-copper-pickaxe', label: 'Picareta de Cobre', recipeType: 'tool',
          ingredients: [{ kind: 'copper_bar', count: 2 }], inputKind: 'copper_bar', inputCount: 2,
          outputKind: 'copper_pickaxe', outputCount: 1, requiredLevel: 1, xpReward: 18,
          toolTier: 1, requiredToolTier: 0,
        },
        {
          id: 'forge-iron-pickaxe', label: 'Picareta de Ferro', recipeType: 'tool',
          ingredients: [{ kind: 'iron_bar', count: 2 }, { kind: 'copper_bar', count: 1 }],
          inputKind: 'iron_bar', inputCount: 2, outputKind: 'iron_pickaxe', outputCount: 1,
          requiredLevel: 2, xpReward: 30, toolTier: 2, requiredToolTier: 1,
        },
        {
          id: 'forge-mithril-pickaxe', label: 'Picareta de Mithril', recipeType: 'tool',
          ingredients: [{ kind: 'mithril_bar', count: 2 }, { kind: 'iron_bar', count: 1 }],
          inputKind: 'mithril_bar', inputCount: 2, outputKind: 'mithril_pickaxe', outputCount: 1,
          requiredLevel: 3, xpReward: 48, toolTier: 3, requiredToolTier: 2,
        },
        {
          id: 'forge-copper-sword', label: 'Espada de Cobre', recipeType: 'equipment',
          ingredients: [{ kind: 'copper_bar', count: 2 }], inputKind: 'copper_bar', inputCount: 2,
          outputKind: 'sword', outputCount: 1, outputRarity: 'comum', requiredLevel: 1, xpReward: 18,
        },
        {
          id: 'forge-copper-helmet', label: 'Elmo de Cobre', recipeType: 'equipment',
          ingredients: [{ kind: 'copper_bar', count: 2 }], inputKind: 'copper_bar', inputCount: 2,
          outputKind: 'helmet', outputCount: 1, outputRarity: 'comum', requiredLevel: 1, xpReward: 18,
        },
        {
          id: 'forge-iron-axe', label: 'Machado de Ferro', recipeType: 'equipment',
          ingredients: [{ kind: 'iron_bar', count: 3 }, { kind: 'copper_bar', count: 1 }],
          inputKind: 'iron_bar', inputCount: 3, outputKind: 'axe', outputCount: 1,
          outputRarity: 'incomum', itemLevelBonus: 1, requiredLevel: 2, xpReward: 35,
        },
        {
          id: 'forge-iron-armor', label: 'Peitoral de Ferro', recipeType: 'equipment',
          ingredients: [{ kind: 'iron_bar', count: 3 }, { kind: 'copper_bar', count: 1 }],
          inputKind: 'iron_bar', inputCount: 3, outputKind: 'armor', outputCount: 1,
          outputRarity: 'incomum', itemLevelBonus: 1, requiredLevel: 2, xpReward: 35,
        },
        {
          id: 'forge-mithril-great-sword', label: 'Espadao de Mithril', recipeType: 'equipment',
          ingredients: [{ kind: 'mithril_bar', count: 3 }, { kind: 'iron_bar', count: 1 }],
          inputKind: 'mithril_bar', inputCount: 3, outputKind: 'great_sword', outputCount: 1,
          outputRarity: 'raro', itemLevelBonus: 2, requiredLevel: 3, xpReward: 55,
        },
        {
          id: 'forge-mithril-war-hammer', label: 'Martelo de Mithril', recipeType: 'equipment',
          ingredients: [{ kind: 'mithril_bar', count: 3 }, { kind: 'iron_bar', count: 1 }],
          inputKind: 'mithril_bar', inputCount: 3, outputKind: 'war_hammer', outputCount: 1,
          outputRarity: 'raro', itemLevelBonus: 2, requiredLevel: 3, xpReward: 55,
        },
        {
          id: 'forge-arhok-greatblade', label: 'Montante de Arhok · Vanguarda', recipeType: 'equipment',
          ingredients: [{ kind: 'mithril_bar', count: 4 }, { kind: 'iron_bar', count: 2 }],
          inputKind: 'mithril_bar', inputCount: 4, outputKind: 'great_sword', outputCount: 1,
          outputRarity: 'epico', outputSetId: 'arhok-vanguard', outputSetPieceId: 'arhok-greatblade', itemLevelBonus: 3, requiredLevel: 4, xpReward: 75,
        },
        {
          id: 'forge-arhok-visor', label: 'Viseira de Arhok · Vanguarda', recipeType: 'equipment',
          ingredients: [{ kind: 'mithril_bar', count: 3 }, { kind: 'iron_bar', count: 2 }],
          inputKind: 'mithril_bar', inputCount: 3, outputKind: 'helmet', outputCount: 1,
          outputRarity: 'epico', outputSetId: 'arhok-vanguard', outputSetPieceId: 'arhok-visor', itemLevelBonus: 3, requiredLevel: 4, xpReward: 70,
        },
        {
          id: 'forge-arhok-gauntlets', label: 'Manoplas de Arhok · Vanguarda', recipeType: 'equipment',
          ingredients: [{ kind: 'mithril_bar', count: 3 }, { kind: 'iron_bar', count: 2 }],
          inputKind: 'mithril_bar', inputCount: 3, outputKind: 'gloves', outputCount: 1,
          outputRarity: 'epico', outputSetId: 'arhok-vanguard', outputSetPieceId: 'arhok-gauntlets', itemLevelBonus: 3, requiredLevel: 4, xpReward: 70,
        },
        {
          id: 'forge-utraean-signet', label: 'Sinete Utraeano · Tempestade', recipeType: 'equipment',
          ingredients: [{ kind: 'mithril_bar', count: 3 }, { kind: 'iron_bar', count: 2 }],
          inputKind: 'mithril_bar', inputCount: 3, outputKind: 'ring', outputCount: 1,
          outputRarity: 'epico', outputSetId: 'utraean-tempest', outputSetPieceId: 'utraean-signet', itemLevelBonus: 4, requiredLevel: 5, xpReward: 90,
        },
        {
          id: 'forge-utraean-conduit', label: 'Condutor Utraeano · Tempestade', recipeType: 'equipment',
          ingredients: [{ kind: 'mithril_bar', count: 4 }, { kind: 'iron_bar', count: 1 }],
          inputKind: 'mithril_bar', inputCount: 4, outputKind: 'necklace', outputCount: 1,
          outputRarity: 'epico', outputSetId: 'utraean-tempest', outputSetPieceId: 'utraean-conduit', itemLevelBonus: 4, requiredLevel: 5, xpReward: 90,
        },
        {
          id: 'forge-utraean-wraps', label: 'Faixas Utraeanas · Tempestade', recipeType: 'equipment',
          ingredients: [{ kind: 'mithril_bar', count: 3 }, { kind: 'iron_bar', count: 2 }],
          inputKind: 'mithril_bar', inputCount: 3, outputKind: 'gloves', outputCount: 1,
          outputRarity: 'epico', outputSetId: 'utraean-tempest', outputSetPieceId: 'utraean-wraps', itemLevelBonus: 4, requiredLevel: 5, xpReward: 90,
        },
        {
          id: 'forge-stoneguard-maul', label: 'Malho do Guarda-Pedra · Juramento', recipeType: 'equipment',
          ingredients: [{ kind: 'mithril_bar', count: 5 }, { kind: 'iron_bar', count: 3 }],
          inputKind: 'mithril_bar', inputCount: 5, outputKind: 'war_hammer', outputCount: 1,
          outputRarity: 'epico', outputSetId: 'stoneguard-oath', outputSetPieceId: 'stoneguard-maul', itemLevelBonus: 5, requiredLevel: 6, xpReward: 110,
        },
        {
          id: 'forge-stoneguard-plate', label: 'Couraça do Guarda-Pedra · Juramento', recipeType: 'equipment',
          ingredients: [{ kind: 'mithril_bar', count: 5 }, { kind: 'iron_bar', count: 3 }],
          inputKind: 'mithril_bar', inputCount: 5, outputKind: 'armor', outputCount: 1,
          outputRarity: 'epico', outputSetId: 'stoneguard-oath', outputSetPieceId: 'stoneguard-plate', itemLevelBonus: 5, requiredLevel: 6, xpReward: 110,
        },
        {
          id: 'forge-stoneguard-crown', label: 'Coroa do Guarda-Pedra · Juramento', recipeType: 'equipment',
          ingredients: [{ kind: 'mithril_bar', count: 4 }, { kind: 'iron_bar', count: 3 }],
          inputKind: 'mithril_bar', inputCount: 4, outputKind: 'helmet', outputCount: 1,
          outputRarity: 'epico', outputSetId: 'stoneguard-oath', outputSetPieceId: 'stoneguard-crown', itemLevelBonus: 5, requiredLevel: 6, xpReward: 105,
        },
      ],
    },
    {
      id: 'npc-trainer-toren',
      kind: 'trainer',
      name: 'Toren',
      title: 'Treinador',
      zone: 'overworld',
      position: {
        x: trainerX,
        y: world.terrain.heightAt(trainerX, trainerZ),
        z: trainerZ,
      },
      rotationY: -Math.PI * 0.889,
      modelUrl: WARRIOR_NPC_MODEL_URL,
      interactRange: 2.7,
      clickRadius: 1.35,
      collisionRadius: 0.72,
      dialogue: {
        greeting: 'Treino transforma pontos guardados em poder real. Abra seus atributos e escolha o proximo passo.',
        actionLabel: 'Treinar',
      },
    },
    {
      id: 'npc-travel-edrik',
      kind: 'travel',
      name: 'Edrik',
      title: 'Guardiao do Portal',
      zone: 'overworld',
      position: {
        x: travelX,
        y: world.terrain.heightAt(travelX, travelZ),
        z: travelZ,
      },
      rotationY: Math.PI * 0.444,
      modelUrl: WARRIOR_NPC_MODEL_URL,
      interactRange: 2.7,
      clickRadius: 1.35,
      collisionRadius: 0.72,
      dialogue: {
        greeting: 'Posso abrir uma passagem segura ate a dungeon. Entre preparado; la embaixo a sombra responde de volta.',
        actionLabel: 'Viajar',
      },
    },
    {
      id: 'npc-jeweler-selene',
      kind: 'jeweler',
      name: 'Selene',
      title: 'Lapidaria',
      zone: 'overworld',
      position: {
        x: jewelerX,
        y: world.terrain.heightAt(jewelerX, jewelerZ),
        z: jewelerZ,
      },
      rotationY: Math.PI * 0.667,
      modelUrl: WARRIOR_NPC_MODEL_URL,
      interactRange: 2.7,
      clickRadius: 1.35,
      collisionRadius: 0.72,
      dialogue: {
        greeting: 'Joias pequenas podem virar uma pedra maior nas maos certas. Traga tres Bless e eu lapido uma Soul.',
        actionLabel: 'Lapidar',
      },
    },
    {
      id: 'npc-banker-maelis',
      kind: 'banker',
      name: 'Maelis',
      title: 'Banqueira',
      zone: 'overworld',
      position: {
        x: bankerX,
        y: world.terrain.heightAt(bankerX, bankerZ),
        z: bankerZ,
      },
      rotationY: -Math.PI * 0.278,
      modelUrl: WARRIOR_NPC_MODEL_URL,
      interactRange: 2.7,
      clickRadius: 1.35,
      collisionRadius: 0.72,
      dialogue: {
        greeting: 'Posso guardar pocoes e joias no cofre do acampamento. O que fica aqui volta com voce quando retornar.',
        actionLabel: 'Banco',
      },
    },
    {
      id: 'npc-guard-kael',
      kind: 'guard',
      name: 'Kael',
      title: 'Sentinela',
      zone: 'overworld',
      position: {
        x: guardX,
        y: world.terrain.heightAt(guardX, guardZ),
        z: guardZ,
      },
      rotationY: 0,
      modelUrl: WARRIOR_NPC_MODEL_URL,
      interactRange: 2.7,
      clickRadius: 1.35,
      collisionRadius: 0.72,
      dialogue: {
        greeting: 'A estrada fica mais segura quando voce observa os sinais no chao. Posso apontar o caminho ate o portal se quiser seguir para a dungeon.',
        actionLabel: 'Mostrar portal',
      },
    },
    {
      id: 'npc-travel-riven',
      kind: 'travel',
      name: 'Riven',
      title: 'Vigia da Saida',
      zone: 'dungeon',
      position: {
        x: dungeonTravelX,
        y: world.terrain.heightAt(0, 0),
        z: dungeonTravelZ,
      },
      rotationY: -Math.PI * 0.82,
      modelUrl: WARRIOR_NPC_MODEL_URL,
      interactRange: 2.7,
      clickRadius: 1.35,
      collisionRadius: 0.72,
      dialogue: {
        greeting: 'A saida ainda responde a superficie. Posso puxar voce de volta para a frente do portal antes que a dungeon feche o caminho.',
        actionLabel: 'Retornar',
      },
    },
  ];
}

export function createNpcDefinitions(world: WorldData): NpcDefinition[] {
  return npcDefinitionsFromSnapshot(fallbackNpcStates(world));
}
