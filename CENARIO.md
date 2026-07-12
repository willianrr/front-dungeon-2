# Cenário 3D de Aranna

O mapa usa um mundo procedural determinístico para gameplay e uma camada
artística client-side para transformar os pontos importantes em lugares
reconhecíveis. A mesma seed continua gerando o mesmo relevo, props e blockers;
a composição visual não altera os contratos autoritativos do servidor.

## Composição atual

- **Santuário central:** praça circular em camadas, anéis de bronze, mosaico,
  sigilo central, caminhos radiais e estações organizadas para os nove NPCs.
- **Estrada principal:** trilha de terra spawn → portal, pedras de borda e
  waystones luminosos que mantêm a direção legível durante a exploração.
- **Biomas visuais:** bordos no campo aberto, bétulas no bosque do noroeste e
  árvores mortas na região corrompida em torno do portal.
- **Natureza:** cinco variações de rocha, dez variações de árvores mortas,
  gramíneas, arbustos e flores distribuídos em manchas determinísticas.
- **Água:** base profunda com uma segunda lâmina translúcida para brilho.
- **Marcos distantes:** pedreira de cristais e poço lunar substituem visualmente
  dois rochedos existentes, preservando exatamente os blockers desses props.
- **Santuário do portal:** plataforma ritual, escadaria, arco, cristais, véus e
  partículas, alinhado com a chegada da estrada.
- **Câmara das Sombras:** piso modular, círculos rituais de boss/tesouro,
  contrafortes, escombros de borda, cristais, luzes e portal de saída próprio.

## Arquivos responsáveis

| Arquivo | Responsabilidade |
| --- | --- |
| `src/shared/Terrain.ts` | Função determinística de altura e inclinação. |
| `src/shared/worldgen.ts` | Seed, tamanho, água, props, blockers, spawn e portal. |
| `src/playcanvas/PcWorld.ts` | Terreno, iluminação, materiais, água, modelos e biomas. |
| `src/playcanvas/MapArt.ts` | Composição artística do acampamento, estrada, landmarks, portal e dungeon. |
| `src/core/Game.ts` | Integração das entidades e altura visual de elementos interativos. |

`MapArt` prefere malhas combinadas para mosaicos, pedras e arquitetura repetida.
Isso permite dezenas de elementos organizados com poucas draw calls adicionais.
Partículas e luzes são animadas por zona; o restante da arquitetura é estático.

## Regras para expandir sem quebrar gameplay

1. O cliente recebe a seed e reconstrói o mundo. Qualquer mudança em relevo,
   props ou blockers deve continuar idêntica no TypeScript e no Go.
2. Decoração baixa e atravessável pode existir somente no cliente.
3. Uma peça sólida nova precisa de colisão equivalente no servidor e no cliente.
   Não use apenas uma parede visual: isso cria dessincronização de movimento.
4. Preserve as áreas livres do santuário, da trilha e da entrada do portal.
5. Landmarks apoiados em props existentes devem caber no blocker que substituem.
6. Na dungeon, mantenha livres o spawn, Riven, os três baús, o boss e a saída.

## Ajustes rápidos

- Paleta e materiais: `PcWorld.createTerrainEntity()` e `MapArt`.
- Luz do overworld: `AMBIENT_OVERWORLD`, `SUN_INTENSITY`, `FILL_INTENSITY`.
- Densidade de névoa: `FOG_DENSITY_OVERWORLD`.
- Distribuição dos biomas: `PcWorld.buildNatureProps()`.
- Quantidade de decoração: presets de qualidade que chamam
  `preloadEnvironment(decorCount)`.
- Posição do portal: `src/shared/worldgen.ts` (`dungeon`).
- Novas composições: mantenha-as em `MapArt` e use `createBoxCluster()` ou
  `createFlatRing()` quando houver repetição.

## Validação recomendada

Após alterar o cenário:

```bash
npm run build
npm run verify:movement
```

Também valide no navegador o percurso completo: spawn → Edrik → portal →
entrada da dungeon → baús → saída. Verifique especialmente se elementos visuais
não cobrem NPCs, marcadores, inimigos ou áreas interativas.
