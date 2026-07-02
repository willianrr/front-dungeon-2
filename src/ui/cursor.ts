// Cursores customizados (manoplas do HUD), aplicados NA PAGINA INTEIRA — tela
// de login, loading, canvas do jogo, HUD e menus. Estrategia:
//   1. Os PNGs (250px) sao reduzidos em runtime via canvas (navegadores ignoram
//      cursores acima de ~128px) e viram data URLs.
//   2. Uma regra `* { cursor: inherit !important }` e injetada: ela VENCE
//      qualquer `cursor:` do CSS (botoes, inputs, slots do inventario), entao
//      todo elemento herda do <html> — e trocar o cursor do <html> troca tudo.
// O jogo alterna para a manopla DOURADA ao mirar inimigo via setAttackCursor().
// Tolerante a falha: sem os arquivos, o cursor do sistema continua.

const CURSOR_DEFAULT_URL = '/hud/click.png';
const CURSOR_ATTACK_URL = '/hud/click_press.png';
const CURSOR_SIZE = 34;
/** Hotspot na ponta do dedo indicador da manopla. */
const CURSOR_HOTSPOT_X = 11;
const CURSOR_HOTSPOT_Y = 2;

let defaultCursor: string | null = null;
let attackCursor: string | null = null;
let attackActive = false;

function buildCursor(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = CURSOR_SIZE;
      canvas.height = CURSOR_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(image, 0, 0, CURSOR_SIZE, CURSOR_SIZE);
      resolve(`url(${canvas.toDataURL('image/png')}) ${CURSOR_HOTSPOT_X} ${CURSOR_HOTSPOT_Y}, pointer`);
    };
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function apply(): void {
  const cursor = attackActive ? attackCursor ?? defaultCursor : defaultCursor;
  if (cursor) document.documentElement.style.setProperty('--game-cursor', cursor);
}

/** Instala os cursores globais (chamado no boot, antes da tela de login). */
export async function installCustomCursors(): Promise<void> {
  const [normal, attack] = await Promise.all([
    buildCursor(CURSOR_DEFAULT_URL),
    buildCursor(CURSOR_ATTACK_URL),
  ]);
  defaultCursor = normal;
  attackCursor = attack ?? normal;
  if (!defaultCursor) return;
  // A regra le o cursor de uma CSS var no :root — trocar cinza<->dourada e so
  // um setProperty. O `!important` atropela `cursor: pointer` de botoes/menus.
  // NAO usar `inherit` aqui: `*` pega o proprio <html>, `!important` vence o
  // style inline, e `inherit` na raiz cai para `auto` — o cursor customizado
  // sumia (bug da 1a versao).
  const style = document.createElement('style');
  style.textContent = '*, *::before, *::after { cursor: var(--game-cursor, auto) !important; }';
  document.head.appendChild(style);
  apply();
}

/** Liga/desliga a manopla dourada (ponteiro sobre inimigo vivo). */
export function setAttackCursor(active: boolean): void {
  if (active === attackActive) return;
  attackActive = active;
  apply();
}
