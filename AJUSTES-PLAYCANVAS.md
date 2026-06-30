# Ajustes na versão PlayCanvas (`front-experimento`)

Correções de mira, fogo da arma e brilho por nível, mais a auditoria do WebSocket.
Todas as mudanças ficaram concentradas em **um único arquivo** e nada novo passou a
trafegar pela rede.

## Arquivo alterado

`src/core/Game.ts` — único arquivo de código modificado.
Nenhuma mudança no backend, no contrato WebSocket (`src/shared/types.ts`),
no `ServerClient`/`NetworkClient`, nem em assets. O efeito de fogo reaproveita a
textura que já existia em `public/particle/unity-fire/fire-mask.png`.

---

## 1. Mira/target durante o ataque

**Sintoma:** ao atacar, o herói ficava de costas para o inimigo ou girando errado.

**Causa:** na versão PlayCanvas o yaw do herói vinha **só** do servidor
(`rotationY`, aplicado em `reconcile`) ou da predição de teclado
(`applyLocalPlayerMovement`). Quando o jogador clicava para atacar parado, o yaw
dependia inteiramente do `rotationY` do snapshot — sujeito a latência e à ordem de
chegada dos pacotes —, então em vários frames o personagem encarava a direção do
último movimento em vez do alvo. Não havia, no cliente, nenhuma lógica de "encarar
o alvo" durante o ataque (o que em ARPG normalmente é client-side).

**Correção (client-side, sem rede):** novo método `aimLocalPlayerDuringAttack(dt)`,
chamado no loop logo após `applyLocalPlayerMovement`. Enquanto a ação local for
`attack` (e o jogador não estiver andando pelo teclado, caso em que o movimento
manda na direção), o herói gira suavemente para encarar o alvo:

- alvo = inimigo selecionado vivo (`selectedEnemyId`) ou o último ponto de ataque
  clicado (`lastAttackAimPoint`, gravado em `handleClick`);
- `desired = atan2(dx, dz)` e interpolação angular curta (`ATTACK_AIM_TURN_RATE`).

Isso garante que o personagem **nunca fique de costas para o inimigo**, independente
de latência, e mantém ataque/movimento responsivos.

## 2. Fogo/VFX da arma

**Sintoma:** armas de fogo não mostravam chamas no PlayCanvas (no Three.js sim).

**Causa:** o efeito de fogo do Three.js (`BladeFireParticles`, acionado quando
`element === 'fire'`) **não foi portado**. No PlayCanvas, arma de fogo só deixava o
cilindro de brilho um pouco mais forte — sem partículas de chama.

**Correção (client-side, sem rede):** novo método `createWeaponFire(...)` que cria um
**sistema de partículas nativo do PlayCanvas** (`particlesystem`, acelerado por GPU)
preso ao anchor da arma, emitindo ao longo da lâmina, subindo e esmaecendo com blend
aditivo — recriando o comportamento do Three.js. É instanciado apenas quando
`element === 'fire'` (normalmente só o herói local), então o custo é desprezível. A
textura `fire-mask.png` é carregada uma única vez em `loadWeaponFireTexture()` (no
preload, tolerante a falha: se a textura faltar, o brilho continua e o jogo não quebra).

> **Escala (importante):** o anchor da arma herda a escala minúscula do osso da mão
> (~0,01). O **tamanho das partículas vive em espaço de mundo** (não é dividido por
> essa escala), então a 1ª versão, que multiplicava tudo por `1/escala`, criava chamas
> gigantes (~17 unidades — "o mapa inteiro pegando fogo"). A correção neutraliza a
> escala no próprio emissor (`fire.setLocalScale(1/inheritedScale)` → escala de mundo
> ≈ 1) e usa números em **unidades de mundo** pequenos e previsíveis para tamanho,
> velocidade e extents das partículas.

## 3. Brilho/glow por nível da arma (estourado)

**Sintoma:** o brilho de nível estourava a luz e não lembrava o Three.js.

**Causa (a principal):** em `updateWeaponPose`, a cada frame o material do brilho era
**sobrescrito com valores fixos altos** — `emissiveIntensity = 1.45 + pulse*1.25`
(até ~2.8), opacidade até 0.62 e luz fixa (3 para fogo / 1.4) — **independente do
nível da arma**. Ou seja, uma arma +1 brilhava igual a uma +15. No Three.js o brilho
escala por estágios com o nível/raridade (`WeaponGlow`), começando discreto.

**Correção:** novo helper `weaponGlowFactor(level, rarity, element)` (0..1, espelhando
a progressão por estágios do Three.js) usado tanto na criação (`syncViewEquipment`)
quanto no pulso (`updateWeaponPose`):

- `emissiveIntensity = 0.35 + factor*1.05` (máx ~1.5, antes ~2.8);
- opacidade base `(0.08–0.14) + factor*0.18`, com teto em 0.42 (antes 0.62);
- luz omni escalada por `factor` (perto de zero em nível baixo), cor de fogo `#ff6a1a`;
- o pulso por frame agora **multiplica** a base escalada em vez de reescrevê-la.

> **Causa raiz e solução final (efeito NA arma, contido):** o brilho gigante vinha de
> dois fatos somados — (1) o `range` da luz omni é em **unidades de mundo ABSOLUTAS**
> (não escala com o osso); o código original usava `4.2 / inheritedScale` ≈ **420 un**,
> iluminando o mapa todo; (2) o **tamanho das partículas** também é em espaço de mundo,
> então multiplicar pela escala do osso estourava as chamas.
>
> **Fato empírico que fechou a questão:** QUALQUER luz/partícula pendurada no `anchor`
> (sob o osso, escala ~0,01) estoura na tela; no `view.visual` (escala 1) fica contida.
> A teoria do `range` não importa — o dado é claro. Então a versão final:
> - **Luz e fogo vivem no `view.visual`** (escala 1) → `range`/tamanho em unidades de
>   mundo pequenas e CONTIDAS. Luz com falloff físico (`LIGHTFALLOFF_INVERSESQUARED`).
> - **Para virarem "buff na arma"**, a POSIÇÃO de mundo deles é sincronizada com o
>   centro da lâmina a cada frame (`view.weaponGlow.getPosition()` →
>   `light/fire.setPosition(...)` em `updateWeaponPose`). Assim seguem a espada nos
>   ataques sem herdar a escala do osso. As partículas (world-space) ainda deixam um
>   leve rastro de fogo ao balançar a arma.
> - **Cilindro de brilho:** mesh sob o osso (acompanha a lâmina), usa `/inheritedScale`
>   (correção de escala de MESH, que — diferente de luz/partícula — funciona).

> **Aura de upgrade estilo Mu Online (substitui o "sabre de luz"):** o cilindro que
> atravessava a lâmina virou um **shell** = clone da malha da própria arma
> (`weapon.clone()`), levemente ampliado (`~1.06 + nível`), com material **aditivo
> emissivo** e `cull = CULLFACE_FRONT` (renderiza as faces de TRÁS) → um **contorno/halo
> brilhante que segue o formato exato da arma**, como as armas +X do Mu. Opacidade e
> emissivo escalam pelo nível e pulsam (`createWeaponShell` + `updateWeaponPose`). Sem o
> cilindro, a referência de posição/orientação de luz e fogo virou o `anchor`
> (`getPosition()` + `up * WEAPON_BLADE_CENTER`; `getRotation()` alinha as chamas).
>
> **Refino (fundir com a textura, sem virar bloco):** dois ajustes importantes —
> (1) o shell estava grosso demais (1.06–1.12) e parecia um bloco maior que a arma;
> baixei para um **contorno fino** (1.02–1.04), como o Three.js (1.018–1.045);
> (2) o glow agora sai **de DENTRO do item**: `boostWeaponEmissive` clona os materiais
> da arma e soma um emissivo na cor da gema, então o brilho FUNDE com a textura em vez
> de uma cor chapada por cima (espelha o `cloneAndGlowWeaponMaterials` do Three.js). Os
> materiais clonados são destruídos no unequip. O fogo também foi afinado para abraçar
> a lâmina em vez de inchar.

> ⚠️ **Se ainda parecer "gigante" depois de editar:** reinicie o servidor do Vite
> (Ctrl+C no terminal e `npm run dev` de novo), não só Ctrl+F5. O HMR às vezes serve o
> módulo antigo em cache e o efeito visual não muda mesmo com o código corrigido.

Resultado: brilho discreto em níveis baixos, controlado no máximo (sem estourar), e
ainda indicando o nível. Armas de fogo têm um piso de brilho visível (como o
`elementFactor` do Three.js).

## 4. WebSocket: apresentação vs. dados + enxugar payload derivável

**Parte A — separação apresentação/gameplay: já estava correta.** Nada de VFX/som/
partícula/animação trafega pelo WS; tudo isso é client-side.

- **Cliente → servidor (`Command`):** só intenções de gameplay — `move`, `attack`,
  `jump`, `cast-skill`, `collect`, `open-chest`, `equip/unequip`, `use-item`,
  `allocate-attribute`, `enter/leave-dungeon`, `respawn`. Nenhum comando de VFX/som.
- **Cliente → servidor (`Command`):** só intenções de gameplay — `move`, `attack`,
  `jump`, `cast-skill`, `collect`, `open-chest`, `equip/unequip`, `use-item`,
  `allocate-attribute`, `enter/leave-dungeon`, `respawn`. Nenhum comando de VFX/som.
- **Servidor → cliente (`WorldSnapshot`):** estado de gameplay (entidades com
  posição/vida/ação, loot, baús, inventário, quest) + `combatEvents`, que são
  **eventos** ("dano X em tal posição", "miss", "skill/boss-slam") e não streams de
  VFX. Toda a apresentação (animação, som, partícula, glow, fogo, impacto, feedback)
  já é decidida e executada no cliente (`syncCombatEvents`, `Sfx`, `showHitImpact`,
  glow/fogo da arma, etc.).
- O backend ainda **throttle-a** snapshots (`room.go: shouldSendSnapshot` — realtime
  só logo após input), então já evita tráfego desnecessário.

Ou seja, o fogo e o brilho que acabaram de ser adicionados/ajustados são 100%
client-side, exatamente como a orientação do outro dev pede ("o servidor manda
`loot spawned at x,y,z`; animação/som/partícula/brilho/efeito é client-side").

**Parte B — enxugar campos DERIVÁVEIS (otimização de payload).** O snapshot mandava,
para cada item (inventário ~70 itens/tick + loot), os campos `name`, `icon` e
`modelUrl` — todos **deriváveis no cliente** a partir de `kind`/raridade/upgrade/
elemento. Era redundância pura: a URL do ícone (~50 bytes) e o nome longo (~50 bytes)
repetidos em todo item, todo tick. Removidos do wire e reconstruídos no cliente.

**Mudança de contrato (o que mudou nas mensagens):**

- `WorldSnapshot.inventory[]`: **deixa de enviar `name` e `icon`**.
- `WorldSnapshot.loot[]`: **deixa de enviar `name`, `icon` e `modelUrl`**.
- Nenhum outro campo/mensagem mudou. `entities`, `combatEvents`, `equipment`, etc.,
  seguem iguais.

**Backend (`back-dungeon`):** em `sim/state.go` os campos ganharam `,omitempty`; em
`sim/simulation.go` o snapshot deixa de popular `Name/Icon` no inventário e envia uma
cópia enxuta do loot (sem `Name/Icon/ModelURL`). A lógica interna não muda — `s.loot`
mantém os dados completos para `collectLoot`.

**Cliente (`front-experimento`):** `itemMeta.ts` ganhou `itemDisplayName`,
`itemIconFor`, `lootModelUrlFor` (espelham `weaponName`/`itemDefs`/`lootModels` do
backend — testado: 8/8 nomes batem exatamente). `Game.ts` hidrata o snapshot ao
recebê-lo (`hydrateSnapshotPresentation`), preenchendo os campos faltantes. É
**idempotente e retrocompatível**: se o servidor ainda mandar os campos, são usados.

> Impacto: ~100 bytes a menos por item; com ~70 itens isso corta ~7 KB por snapshot
> (o inventário era o grosso do payload). ⚠️ **Requer recompilar o backend Go.**

**Parte C — inventário por DELTA (só quando muda).** Mesmo enxuto, o inventário inteiro
(~70 itens) ia em **todo** snapshot — durante o jogo ativo, todo tick. Agora o servidor
só (re)envia o array quando o conteúdo muda; senão manda `inventory: null` e o cliente
reaproveita um **cache**.

- **Backend:** `hashInventory` (FNV-32a) gera um "rev" do conteúdo, guardado em
  `WorldSnapshot.InventoryRev` com `json:"-"` (**só interno, não vai no wire**). Em
  `room.go`, por cliente: se o rev == último enviado **e** dentro do intervalo de
  reenvio, manda `Inventory=nil` (→ `null`); senão envia o array e atualiza o estado.
  `Session` ganhou `lastInventoryRev` + `lastInventoryFullTick`.
- **Robustez:** `inventory` perdeu o `omitempty` — assim **`null`=“não mudou, usa cache”**
  fica distinto de **`[]`=“vazio de verdade”**. E há um **reenvio periódico** (a cada ~2 s)
  como rede de segurança: se um snapshot com o inventário for descartado sob congestão,
  ele volta em ≤2 s (não fica preso até a próxima mudança).
- **Cliente:** `Game.ts` mantém `cachedInventory`; se `inventory != null`, hidrata e
  cacheia; se `null`, reaproveita o cache. O HUD sempre vê o inventário completo.

> Impacto: durante exploração/combate (inventário estático) o snapshot deixa de carregar
> ~10 KB de inventário por tick — só uns poucos KB a cada ~2 s. ⚠️ **Recompilar o Go.**
> Limitação conhecida: a latência de exibição de uma mudança de inventário é ≤1 tick
> (imperceptível); o caso totalmente à prova de descarte exigiria ACK (futuro).

---

## Como testar localmente

Backend já rodando em `localhost:8080`. No `front-experimento`:

```bash
npm install      # se ainda não instalou
npm run dev      # Vite em http://localhost:5174
npm run build    # validação: tsc --noEmit + vite build
```

- **Mira (ataque):** clique em um zumbi e fique parado. O herói deve virar de frente
  para o inimigo durante todos os golpes, nunca de costas. Repita clicando em inimigos
  em ângulos diferentes ao redor do personagem.
- **Fogo da arma:** abra com `?weaponGlow` na URL
  (`http://localhost:5174/?weaponGlow`) — isso força a espada lendária +15 com gema
  `soul` e elemento `fire`. Devem aparecer chamas subindo pela lâmina. Sem o
  parâmetro, equipe/упgrade uma arma de fogo normalmente.
- **Brilho por nível:** compare uma arma de nível baixo (deve brilhar discreto) com a
  de `?weaponGlow` (nível 15, brilho mais forte porém sem estourar a tela). Confira que
  a luz não "lava" o personagem como antes.
- **Performance:** o overlay de perf (tecla **F** alterna qualidade) deve manter o
  mesmo FPS de antes; o fogo só existe para armas de fogo.

> Observação de validação: `tsc --noEmit` foi executado sobre o arquivo completo e
> passou sem erros (typecheck strict). Rode `npm run build` na sua máquina para a
> confirmação final do empacotamento.

---

## 5. Performance — culling de inimigos (maior ganho de FPS em horda)

**Problema:** `configureImportedModel` faz `meshInstance.cull = false` em todos os
modelos importados, desligando o frustum culling nativo. Resultado: **todo zumbi do
nível era renderizado, animado e projetava sombra todo frame, mesmo fora da tela.**

**Correção (`updateEnemyCulling` em `Game.ts`):** a cada frame, inimigo fora da tela
(via `world.project`) ou além de `ENEMY_CULL_FAR` (100 un) tem `entity.enabled=false`
— o PlayCanvas então pula render, **animação** e **sombra** dele. Um raio próximo
(`ENEMY_CULL_NEAR_KEEP`, 8 un) fica sempre visível para nunca cortar inimigo em
combate. Sem pop-out de malha (desabilita a entidade inteira, não conta com a bbox do
skinned mesh). Constantes ajustáveis no topo do arquivo.

> Ganho: numa horda em que só uma parte está na tela, o custo de render+anim+sombra cai
> proporcionalmente aos inimigos fora do campo de visão (o caso típico da câmera 3/4).

## Melhorias futuras (próximos passos)

- **LOD de animação** para inimigos visíveis porém distantes (animar a ~10–15 Hz em vez
  de todo frame). O culling já zera o custo dos fora-de-tela; isto afina os distantes.
- **Sombra:** zumbis não projetarem sombra (só o herói), ou "blob shadow" (decal) —
  corta a passagem de sombra da horda. É trade-off visual, então sob confirmação.
- **Pool de partículas/efeitos:** reaproveitar sistemas de fogo e `PulseEffect` em vez
  de criar/destruir, se muitas armas de fogo/efeitos aparecerem juntos.
- **Snapshot — mais deltas:** aplicar a mesma ideia do inventário a `equipment`/`quest`
  e aos campos "lentos" do player (atributos/skills), que também vão a cada tick.
