import { Game } from './core/Game';
import type { NetworkClient } from './net/NetworkClient';
import { ServerClient } from './net/ServerClient';
import { createWarriorProfile, type PlayerProfile } from './shared/playerProfile';
import { installCustomCursors } from './ui/cursor';
import { showServerEntry } from './ui/ServerEntry';
import './styles.css';

// Ponto de entrada: login/cadastro no backend -> personagem -> mundo via servidor.
// game.run() mostra a tela de loading, carrega o heroi e so entao comeca o loop.
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const uiLayer = document.getElementById('ui-layer') as HTMLElement;
const loading = document.getElementById('loading') as HTMLElement | null;
const loadingBar = document.getElementById('loading-bar') as HTMLElement | null;
const loadingPct = document.getElementById('loading-pct') as HTMLElement | null;

// Cursor customizado desde o PRIMEIRO pixel (login, loading, jogo, menus).
void installCustomCursors();

void bootstrap();

async function bootstrap(): Promise<void> {
	const session = await showServerEntry();
	const server = new ServerClient(session.token, session.characterId);
	server.onDisconnect = (reason) => showDisconnectOverlay(reason);
	try {
		await server.connect();
	} catch (error) {
		window.alert(`Falha ao conectar no servidor: ${error instanceof Error ? error.message : String(error)}`);
		throw error;
	}
	await startGame(server, createWarriorProfile(session.name));
}

// Overlay bloqueante quando o WebSocket cai depois do jogo iniciado. Sem ele o
// jogo congelava em silencio (snapshot parado, comandos descartados).
function showDisconnectOverlay(reason: string): void {
	if (document.getElementById('disconnect-overlay')) return;
	const overlay = document.createElement('div');
	overlay.id = 'disconnect-overlay';
	overlay.style.cssText =
		'position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:rgba(8,6,12,0.85);color:#f4e8d0;text-align:center;padding:24px;';
	const title = document.createElement('h2');
	title.textContent = 'Conexao perdida';
	title.style.cssText = 'margin:0;font-size:28px;';
	const text = document.createElement('p');
	text.textContent = reason;
	text.style.cssText = 'margin:0;opacity:0.85;';
	const button = document.createElement('button');
	button.type = 'button';
	button.textContent = 'Reconectar';
	button.style.cssText =
		'margin-top:8px;padding:10px 26px;font-size:16px;cursor:pointer;background:#7a5b2e;color:#fff;border:1px solid #c9a35c;border-radius:6px;';
	button.addEventListener('click', () => window.location.reload());
	overlay.append(title, text, button);
	document.body.append(overlay);
}

async function startGame(net: NetworkClient, profile: PlayerProfile): Promise<void> {
	if (loadingBar) loadingBar.style.width = '0%';
	if (loadingPct) loadingPct.textContent = '0%';
	loading?.removeAttribute('style');
	loading?.classList.remove('hidden');
	loading?.classList.add('active');
	try {
		const game = new Game(canvas, uiLayer, net, profile);
		await game.run();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error('[main] falha ao iniciar o jogo:', error);
		if (loadingPct) loadingPct.textContent = 'erro';
		const loadingText = loading?.querySelector('p');
		if (loadingText) loadingText.textContent = `Falha ao iniciar: ${message}`;
		throw error;
	}
}
