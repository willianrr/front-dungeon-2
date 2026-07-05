const apiUrl = process.env.ARANNA_API_URL ?? 'http://localhost:8080/api/v1';
const wsUrl = process.env.ARANNA_WS_URL ?? 'ws://localhost:8080/ws/game';
const timeoutMs = Number(process.env.ARANNA_TALENTS_PROBE_TIMEOUT_MS ?? 12000);

const TALENT_HEAVY_STRIKES = 'warrior_heavy_strikes';
const TALENT_COMBAT_FURY = 'warrior_combat_fury';

if (typeof WebSocket === 'undefined') {
  throw new Error('This Node.js runtime does not expose WebSocket. Use the bundled/current Node runtime used by the project.');
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
  };
  const response = await fetch(`${apiUrl}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) {
    throw new Error(body.error ?? `HTTP ${response.status}`);
  }
  return body.data;
}

async function createProbePlayer() {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const auth = await request('/accounts/register', {
    method: 'POST',
    body: JSON.stringify({ email: `codex-talents-${stamp}@local.test`, password: 'codex123456' }),
  });
  const characters = await request('/characters', { token: auth.token });
  const character = characters[0] ?? await request('/characters', {
    method: 'POST',
    token: auth.token,
    body: JSON.stringify({ name: 'TalentProbe' }),
  });
  return { auth, character };
}

function waitFor(predicate, label, timeout = timeoutMs) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      try {
        const value = predicate();
        if (value) {
          resolve(value);
          return;
        }
      } catch (error) {
        reject(error);
        return;
      }
      if (Date.now() - startedAt > timeout) {
        reject(new Error(`Timed out waiting for ${label}`));
        return;
      }
      setTimeout(tick, 50);
    };
    tick();
  });
}

function localPlayer(state) {
  return state.snapshot?.entities?.find((entity) => entity.id === state.playerId);
}

async function connectProbeClient(player) {
  const url = `${wsUrl}?token=${encodeURIComponent(player.auth.token)}&characterId=${player.character.id}`;
  const socket = new WebSocket(url);
  const state = {
    characterId: player.character.id,
    name: player.character.name,
    playerId: '',
    seed: 0,
    snapshot: null,
    snapshots: 0,
    messages: 0,
    sawTalentError: false,
    sawTalentLearned: false,
    sawTalentReset: false,
  };

  socket.addEventListener('message', (event) => {
    state.messages++;
    const raw = String(event.data);
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }
    if (message.type === 'welcome') {
      state.playerId = message.playerId ?? state.playerId;
      state.seed = message.seed ?? state.seed;
    }
    if (message.type === 'snapshot' && message.snapshot) {
      state.snapshot = message.snapshot;
      state.snapshots++;
      if (message.snapshot.partyEvents?.some((event) => event.type === 'talent_error')) state.sawTalentError = true;
      if (message.snapshot.partyEvents?.some((event) => event.type === 'talent_learned')) state.sawTalentLearned = true;
      if (message.snapshot.partyEvents?.some((event) => event.type === 'talent_reset')) state.sawTalentReset = true;
    }
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error(`WebSocket connection failed for ${player.character.name}`)), { once: true });
  });
  await waitFor(() => state.playerId && state.snapshot && localPlayer(state), 'initial talents snapshot');
  return { socket, state };
}

function send(client, command) {
  client.socket.send(JSON.stringify(command));
}

async function closeClient(client) {
  if (!client?.socket || client.socket.readyState === WebSocket.CLOSED) return;
  await new Promise((resolve) => {
    client.socket.addEventListener('close', resolve, { once: true });
    client.socket.close();
    setTimeout(resolve, 1000);
  });
}

let client;
let reconnectClient;
let resetReconnectClient;

try {
  const player = await createProbePlayer();
  client = await connectProbeClient(player);

  const initialTalents = client.state.snapshot.talents;
  const initialPlayer = localPlayer(client.state);
  const initialAttackDamage = initialPlayer?.attackDamage ?? 0;

  if (initialTalents.talentPoints < 1 || initialTalents.availablePoints < 1) {
    throw new Error(`Expected a fresh player to have one available talent point, got ${JSON.stringify(initialTalents)}`);
  }

  send(client, {
    type: 'talent_learn',
    entityId: client.state.playerId,
    talentId: TALENT_COMBAT_FURY,
  });

  await waitFor(
    () => client.state.sawTalentError && (client.state.snapshot?.talents?.talents?.[TALENT_COMBAT_FURY] ?? 0) === 0,
    'talent prerequisite rejection',
  );

  send(client, {
    type: 'talent_learn',
    entityId: client.state.playerId,
    talentId: TALENT_HEAVY_STRIKES,
  });

  await waitFor(
    () => {
      const talents = client.state.snapshot?.talents;
      const playerState = localPlayer(client.state);
      return (
        client.state.sawTalentLearned
        && talents?.talents?.[TALENT_HEAVY_STRIKES] === 1
        && talents.availablePoints === 0
        && (playerState?.attackDamage ?? 0) > initialAttackDamage
      );
    },
    'learned heavy strikes talent and stat increase',
  );

  const learnedAttackDamage = localPlayer(client.state)?.attackDamage ?? 0;
  await closeClient(client);
  client = null;
  await new Promise((resolve) => setTimeout(resolve, 500));

  reconnectClient = await connectProbeClient(player);
  await waitFor(
    () => reconnectClient.state.snapshot?.talents?.talents?.[TALENT_HEAVY_STRIKES] === 1,
    'persisted talent rank after reconnect',
  );
  const persistedAttackDamage = localPlayer(reconnectClient.state)?.attackDamage ?? 0;

  send(reconnectClient, {
    type: 'talent_reset',
    entityId: reconnectClient.state.playerId,
  });

  await waitFor(
    () => {
      const talents = reconnectClient.state.snapshot?.talents;
      const playerState = localPlayer(reconnectClient.state);
      return (
        reconnectClient.state.sawTalentReset
        && talents
        && Object.keys(talents.talents ?? {}).length === 0
        && talents.spentPoints === 0
        && talents.availablePoints === talents.talentPoints
        && (playerState?.attackDamage ?? Number.POSITIVE_INFINITY) < persistedAttackDamage
      );
    },
    'talent reset refunded points and removed stat bonus',
  );
  const resetAttackDamage = localPlayer(reconnectClient.state)?.attackDamage ?? 0;

  await closeClient(reconnectClient);
  reconnectClient = null;
  await new Promise((resolve) => setTimeout(resolve, 500));

  resetReconnectClient = await connectProbeClient(player);
  await waitFor(
    () => {
      const talents = resetReconnectClient.state.snapshot?.talents;
      return talents && Object.keys(talents.talents ?? {}).length === 0 && talents.spentPoints === 0;
    },
    'persisted empty talent ranks after reset reconnect',
  );

  console.info(JSON.stringify({
    ok: true,
    apiUrl,
    wsUrl,
    player: {
      name: resetReconnectClient.state.name,
      characterId: resetReconnectClient.state.characterId,
      playerId: resetReconnectClient.state.playerId,
      snapshotsAfterReconnect: resetReconnectClient.state.snapshots,
    },
    talents: {
      initial: initialTalents,
      afterReconnect: resetReconnectClient.state.snapshot.talents,
    },
    stats: {
      initialAttackDamage,
      learnedAttackDamage,
      persistedAttackDamage,
      resetAttackDamage,
      persistedResetAttackDamage: localPlayer(resetReconnectClient.state)?.attackDamage ?? 0,
    },
    checks: {
      prerequisiteRejected: true,
      heavyStrikesLearned: true,
      attackDamageIncreased: learnedAttackDamage > initialAttackDamage,
      persistedAfterReconnect: true,
      resetRefundedPoints: resetReconnectClient.state.snapshot.talents.availablePoints === resetReconnectClient.state.snapshot.talents.talentPoints,
      resetPersistedAfterReconnect: Object.keys(resetReconnectClient.state.snapshot.talents.talents ?? {}).length === 0,
    },
  }, null, 2));
} finally {
  await closeClient(client);
  await closeClient(reconnectClient);
  await closeClient(resetReconnectClient);
}
