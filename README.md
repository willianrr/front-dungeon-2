# Aranna — ARPG Web 3D

Action-RPG isométrico 3D para navegador, construído com
**PlayCanvas + TypeScript + Vite** e servidor autoritativo em Go.

## Como rodar

Pré-requisitos: [Node.js](https://nodejs.org) 18+ (testado no Node 22).

```bash
npm install      # instala as dependências
npm run dev      # abre em http://localhost:5174
```

O front usa o servidor Go por padrão. Deixe o backend rodando e acesse a URL principal do Vite,
sem `?server`.

Outros scripts:

```bash
npm run build    # type-check + bundle de produção em dist/
npm run preview  # serve o build de produção
npm run probe:forge # valida catálogo/fluxo de Borin contra um backend ativo
npm run verify:ranged-enemy # valida identidade, paleta, movimento e lifecycle do projétil
npm run verify:ash-corruptor # valida identidade, gates wire, Véu e lifecycle do suporte
npm run verify:boss-seal-rupture # valida fase II, pulso anular, HUD e lifecycle do boss
npm run verify:runic-elites # valida Égide/Fúria, wire, recompensas, HUD e VFX dos elites
npm run probe:ranged # valida conjurador/warning/projétil contra um backend ativo
npm run verify:skill-catalog # valida metadados/fallbacks de cast e Maestria Marcial
npm run probe:mastery # valida +5 XP, cooldown e persistência contra um backend ativo
npm run verify:hotbar-loadout # valida storage v2, migração v1 e escolha 6-de-11
npm run verify:arcana # valida Dardo, Maestria Arcana, projétil, slow e compat antiga
npm run verify:arcane-resonance # valida combo Dardo→Marca→Nova, aura, Ruptura e mana
npm run verify:guardian-retaliation # valida Guarda perfeita→alvo marcado→Golpe Pesado
npm run verify:active-evasion # valida RMB/Ctrl, sweep autoritativo, janela e HUD
npm run verify:storm-orb # valida nona skill, quatro cargas, órbita, descarga e hotbar 6-de-11
npm run verify:feral-form # valida décima skill, transformação, travas e hotbar 6-de-11
npm run verify:root-snare # valida 11ª skill, mira no chão, zona, status e lifecycle
npm run verify:cooperative-revive # valida canal, interrupção, proteção e santuário
npm run verify:arhok-frost-coast # valida região fria, exposição, calor e neve
npm run verify:corrupted-jungle # valida flora tóxica, warnings, pulsos e doença
npm run verify:advanced-mining # valida picaretas, veios ricos, Golpe Perfeito e forja
npm run probe:arcana # valida Nova/Dardo/impacto/slow/XP/reconnect contra backend ativo
npm run verify:survival # valida Clamor, Maestria de Sobrevivência, loadout e compat antiga
npm run probe:survival # valida cast vazio, taunt, bloqueio, +5 XP e reconnect
npm run verify:doctrines # valida gate estrito, locks, modifiers, badges e VFX das Doutrinas
npm run probe:doctrines # valida catálogo, rejeição por maestria e persistência/reset quando elegível
```

O probe ranged cria uma conta efêmera por padrão. Para reutilizar um personagem,
defina `ARANNA_RANGED_PROBE_EMAIL`, `ARANNA_RANGED_PROBE_PASSWORD` e, opcionalmente,
`ARANNA_RANGED_PROBE_CHARACTER_ID`.

O probe de maestria também cria uma conta efêmera e entra na dungeon via NPC de viagem.
Para reutilizar um personagem, use `ARANNA_MASTERY_PROBE_EMAIL`,
`ARANNA_MASTERY_PROBE_PASSWORD` e, opcionalmente, `ARANNA_MASTERY_PROBE_CHARACTER_ID`.

O probe de Arcana também usa uma conta efêmera e entra via Edrik. Para reutilizar
um personagem, defina `ARANNA_ARCANA_PROBE_EMAIL`, `ARANNA_ARCANA_PROBE_PASSWORD`
e, opcionalmente, `ARANNA_ARCANA_PROBE_CHARACTER_ID`.

O probe de Sobrevivência cria uma conta efêmera, valida um cast vazio no overworld
e um bloqueio real na dungeon. Para reutilizar um personagem, defina
`ARANNA_SURVIVAL_PROBE_EMAIL`, `ARANNA_SURVIVAL_PROBE_PASSWORD` e, opcionalmente,
`ARANNA_SURVIVAL_PROBE_CHARACTER_ID`.

O probe de Doutrinas também cria uma conta efêmera e sempre valida o contrato
wire e a rejeição abaixo de Maestria 3. Para cobrir escolha e persistência com
um personagem elegível, use `ARANNA_DOCTRINES_PROBE_EMAIL`,
`ARANNA_DOCTRINES_PROBE_PASSWORD` e, opcionalmente,
`ARANNA_DOCTRINES_PROBE_CHARACTER_ID`. Em conta reutilizada, o reset só é
executado com `ARANNA_DOCTRINES_PROBE_ALLOW_RESET=1`.

> Se existir uma pasta `node_modules` vazia, pode apagá-la — o `npm install` recria tudo.
> Contas, personagens e progresso ficam no backend.

## Controles

| Ação | Comando |
| --- | --- |
| Mover o herói | Clique esquerdo ou `WASD` |
| Atacar | Clique esquerdo num inimigo |
| Girar a câmera | Teclas `Q` / `E` |
| Zoom | Scroll do mouse |
| Pular | `Espaço` |
| Usar a hotbar reorganizável | `1` a `8` |
| Esquiva ativa na direção do cursor | Botão direito |
| Esquiva ativa na direção do WASD/facing | `Ctrl` |
| Interagir com NPC selecionado | `R` |
| Alternar/ciclar NPC | `Tab` / `Shift+Tab` |
| Abrir mochila / personagem / talentos | `I` / `C` / `N` |
| Alternar corrida automática | `Num Lock` |
| Mutar/desmutar efeitos sonoros | `M` |
| Alternar qualidade/performance | `F` |

## O que já funciona

- Mundo 3D com chão, grade tática, iluminação e sombras.
- Herói controlado por **clique-para-mover** (raycast no chão), com câmera 3/4 que o segue.
- Zumbis 3D animados que nascem em ondas, perseguem e atacam o herói (aggro).
- Combate em tempo real, barras de vida flutuantes, morte, drops e **renascimento**.
- Progressão: XP ao matar inimigos, subida de nível (mais vida e dano).
- Hotbar reorganizável de oito slots: duas poções obrigatórias e seis habilidades escolhidas entre as anunciadas; o painel `N` permite equipar uma habilidade substituindo explicitamente o mesmo slot.
- Catálogo de habilidades dirigido por metadados autoritativos de disciplina, alvo, arma e interrupção de movimento, com fallback para servidores anteriores.
- Maestria Marcial persistente por uso efetivo de Investida, Golpe Pesado e Varredura de Aço, exibida acima das árvores de talento com progresso e bônus de dano.
- Maestria Arcana persistente para Nova e Dardo Arcano, com barra própria, curva limitada e bônus de dano; servidores antigos continuam mostrando apenas Marcial.
- Ressonância Arcana na Maestria 5 conecta Dardo e Nova: o projétil marca, a explosão consome uma marca própria, reforça o alvo, rompe até três adjacentes e devolve mana.
- Dardo Arcano autoritativo de alvo: persegue até o alcance, lança projétil branco-ciano, colide com o primeiro inimigo/parede e aplica Descompasso por 1,6 s somente após dano efetivo.
- Maestria de Sobrevivência persistente para Guarda de Ferro e Clamor do Baluarte, com bônus de potência defensiva e barra exibida somente quando anunciada pelo servidor.
- Retaliação do Guardião na Sobrevivência 5 marca o agressor após Guarda perfeita efetiva; Golpe Pesado no alvo correto recebe +40% e atrasa a próxima ação sem cancelar impactos já comprometidos.
- Orbe da Tempestade inaugurou a nona skill: quatro cargas autônomas buscam o inimigo visível mais próximo, com alvo, linha de visão, dano e XP decididos no servidor; a hotbar continua escolhendo seis skills entre onze.
- Conjuntos de Aranna ganham nomes próprios, brilho no chão, nove receitas avançadas, tooltip de peças/bônus e progresso 1/3–3/3 recebido do servidor; Arhok, Utraeano e Guarda-Pedra alteram ciclos de habilidade distintos.
- Forma Feral é a décima skill: transforma o perfil de movimento e ataque básico por 7 s, bloqueia só as skills ofensivas e desenha uma silhueta bestial pública estritamente a partir do buff do servidor.
- Círculo de Raízes é a 11ª skill: mira livre no chão, cria uma zona autoritativa de 4 s, reduz movimento em 35% e atrasa uma vez a próxima ação de até oito inimigos; raízes, status e minimapa seguem o wire.
- Grupos podem reanimar aliados caídos com canal de 3 s: o botão conduz até o alvo, dano/movimento interrompem, anéis e tether mostram o progresso, e o aliado retorna no local com proteção breve; o santuário no acampamento é o fallback.
- A Costa Fria de Arhok transforma o norte em bioma mecânico: frio sobe fora de três braseiros, reduz movimento em dois estágios e causa dano não letal no limite; tracker, fogueiras, neve e minimapa seguem o estado autoritativo.
- A Selva Corrompida de Ironwood cria cinco flores tóxicas em ciclos defasados: warnings de 2 s permitem sair antes do pulso letal, que aplica doença de movimento; flora, motes, tracker e minimapa seguem o servidor.
- Clamor do Baluarte provoca inimigos em 8,5 m por quatro segundos; cast, provocação e bloqueios têm leitura âmbar, enquanto mitigação, alvo e XP permanecem autoritativos.
- Varredura muda com a arma equipada: espada favorece críticos, machado aplica sangramento e martelo causa abalo; badges, tooltips e VFX indicam a versão ativa.
- Formas da Varredura liberadas na Maestria Marcial 5: Órbita de Aço amplia controle 360° e Cunha Rompedora concentra um cone direcional, sem criar outra tecla nem apagar a identidade da arma.
- Mineração autoritativa com veios compartilhados de cobre, ferro e mithril, depleção e respawn.
- Mineração e Ferraria possuem XP, níveis persistentes, desbloqueios e bônus por domínio.
- Picaretas permanentes de cobre, ferro e mithril reduzem o intervalo de extração e liberam veios ricos; três golpes ritmados no mesmo veio executam um Golpe Perfeito com bônus determinístico.
- Cinco Displacers persistentes transformam descoberta física em viagem rápida entre overworld e dungeon, com totens procedurais, combate bloqueando uso e destinos no minimapa.
- Normal, Veterano e Elite são tiers compartilhados da sala selecionados no Displacer do Acampamento; afixos, halos, chips, XP e loot refletem somente o estado autoritativo.
- A Jazida do Coração de Ferro converte mineração rica em duas ondas de emboscada, tracker, arena procedural e cofre mineral recorrente.
- Ferreiro com fundição, receitas de equipamento por material, raridade garantida, stats, afixos e contrato tutorial resgatável.
- Equipamentos 1H/2H, armaduras e acessórios; stash, drop, comparação, upgrade e persistência.
- Atributos e árvores de talentos do Warrior com efeitos autoritativos em combate.
- Doutrinas de Combate exclusivas no painel `N`: Vanguarda, Convergência Arcana e Cadência do Guardião modificam pares de habilidades por dados autoritativos, com gate fechado para servidores/catálogos antigos ou parciais.
- Persistência via backend para personagem, nível, atributos, quest, inventário e equipamento.
- Efeitos sonoros procedurais para loot, baús, poções, magia e impacto, com mute persistente.
- Impactos 3D curtos para golpes físicos e dano mágico, sincronizados com os eventos de combate.
- Números flutuantes de combate para dano causado, dano recebido e esquivas.
- Camera shake curto quando o herói sofre dano e no impacto do slam do boss.
- Boss zumbi da dungeon com slam telegrafado no chão; pule para evitar o impacto.
- Conjurador de Estilhaços com identidade violeta, warning travado no chão e projétil autoritativo interpolado visualmente.
- Corruptor de Cinzas com identidade verde-cinza/âmbar, runas e tethers por alvo autoritativo, interrupção legível e overlay temporal do Véu sem simulação local.
- Bruto da Ruína com placas e maça pesada, golpe em setor orientado pelo wire e janela `Exposto` aberta pela Guarda de Ferro perfeita.
- Boss Zumbi com segunda fase `Ruptura do Selo`, identidade persistente e pulso anular que mantém o núcleo interno seguro.
- Elites Rúnicos ambientes com Égide acima de 50%, Fúria abaixo de 50%, duas runas sempre legíveis e recompensa ampliada.
- Câmara do Selo com três ondas autoritativas, barreira apenas visual no cliente, tracker de recompensa e marcador próprio no minimapa.
- Loot clicável e mochila com ícones dos itens; poções recuperam vida e mana.
- Drops probabilísticos para inimigos comuns, com recompensas garantidas e melhores no boss.
- Minimap/radar circular com jogador, inimigos, loot, baús e portal/saída.
- Qualidade de render ajustável e modo automático que reduz resolução/bloom quando o FPS cai.
- Baús 3D clicáveis na dungeon, com estado persistente no servidor e drops próprios.
- Dungeon com decoração 3D instanciada: pilares quebrados, cristais, entulho e sigilo do boss.
- Quest guiada: limpe o exterior, entre no portal e conclua a primeira dungeon.
- Navegação A* para o herói contornar árvores, rochas e ruínas.
- HUD com nível, vida, experiência, quest e inventário.
- **Camada de rede abstraída** (`NetworkClient`): o front fala com o servidor Go
  por REST e WebSocket.
- Rooms públicas automáticas no backend, com até 25 jogadores por room.

## Estrutura

```
src/
├── main.ts            Ponto de entrada
├── audio/
│   └── Sfx.ts          Efeitos sonoros procedurais via Web Audio
├── shared/            Tipos e matemática SEM Three.js (portável p/ servidor)
│   ├── types.ts         Command, EntityState, WorldSnapshot
│   ├── SkillCatalog.ts  Catálogo normalizado e progressão de maestrias
│   ├── CombatDoctrines.ts Gate canônico, exclusividade e modifiers de Doutrinas
│   ├── AshCorruptorPresentation.ts Gates fail-closed dos eventos/status de suporte
│   ├── RuinBrutePresentation.ts Gate fail-closed do setor e da exposição do Bruto
│   ├── BossSealRupturePresentation.ts Gates fail-closed da fase II e do pulso anular
│   ├── RunicElites.ts    Gates fail-closed da identidade, fase e eventos dos elites
│   ├── SealChamberPresentation.ts Gate fail-closed do estado/eventos da sala estruturada
│   ├── Displacers.ts     Catálogo e gate fail-closed da rede pessoal de viagem
│   ├── DifficultyTiers.ts Perfil, fallback e gates fail-closed de tier/afixos
│   ├── TreasureLode.ts    Gate fail-closed e apresentação da jazida recorrente
│   ├── RootSnare.ts       Gates fail-closed de skill, zona, status e evento
│   ├── CooperativeRevive.ts Gates fail-closed de canal, proteção e ação do grupo
│   ├── ArhokFrostCoast.ts Gate fail-closed de região, exposição e fontes de calor
│   ├── CorruptedJungle.ts Gate fail-closed de pods, fases e timers tóxicos
│   ├── HotbarLoadout.ts Storage v2, migração e invariantes 6-de-11
│   ├── ProjectileMotion.ts Apresentação/lifecycle de projéteis autoritativos
│   └── mathx.ts         Vetores e helpers
├── net/
│   ├── NetworkClient.ts Interface cliente <-> servidor (a "costura")
│   ├── ServerClient.ts  Cliente WebSocket do jogo
│   └── api.ts           Cliente REST de contas/personagens
├── core/
│   ├── Game.ts          Loop, render dos snapshots, tradução de input -> comandos
│   └── Input.ts         Mouse e teclado
├── playcanvas/
│   ├── PcWorld.ts       Cena, câmera, luzes, terreno e primitivas
│   ├── OreNodeVisual.ts Renderização/interação dos veios
│   └── MapArt.ts        Composição visual do mapa
└── ui/
    └── HUD.ts           Interface em DOM (vida, XP, tela de morte)
```

Veja **[ARQUITETURA.md](./ARQUITETURA.md)** para a explicação das decisões
(incluindo por que Go fica no backend e não no cliente) e o roadmap.
