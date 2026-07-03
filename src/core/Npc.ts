import { itemDisplayName, itemIconFor } from '../shared/itemMeta';
import type { ItemKind, ItemRarity, NpcKind, NpcShopItemState, NpcState, WorldZone } from '../shared/types';
import type { WorldData } from '../shared/worldgen';

export interface VendorShopItem {
  id: string;
  kind: ItemKind;
  name: string;
  icon: string;
  price: number;
  rarity?: ItemRarity;
  stock?: number;
  tagline?: string;
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
};

function shopItemFromState(item: NpcShopItemState): VendorShopItem {
  return {
    id: item.id,
    kind: item.kind,
    name: itemDisplayName(item),
    icon: itemIconFor(item.kind),
    price: item.price,
    rarity: item.rarity || undefined,
    stock: item.stock,
    tagline: NPC_ITEM_TAGLINES[item.id],
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
        greeting: 'Traga uma joia e uma arma equipada. Eu bato o metal, voce segura firme.',
        actionLabel: 'Forjar',
      },
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

