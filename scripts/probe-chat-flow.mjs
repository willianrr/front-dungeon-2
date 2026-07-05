const apiUrl = process.env.ARANNA_API_URL ?? 'http://localhost:8080/api/v1';
const wsUrl = process.env.ARANNA_WS_URL ?? 'ws://localhost:8080/ws/game';
const timeoutMs = Number(process.env.ARANNA_CHAT_PROBE_TIMEOUT_MS ?? 18000);
const localChatRadius = Number(process.env.ARANNA_CHAT_PROBE_LOCAL_RADIUS ?? 30);
const quietWindowMs = Number(process.env.ARANNA_CHAT_PROBE_QUIET_MS ?? 850);

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

async function createProbePlayer(index) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const auth = await request('/accounts/register', {
    method: 'POST',
    body: JSON.stringify({ email: `codex-chat-${stamp}-${index}@local.test`, password: 'codex123456' }),
  });
  const characters = await request('/characters', { token: auth.token });
  const character = characters[0] ?? await request('/characters', {
    method: 'POST',
    token: auth.token,
    body: JSON.stringify({ name: `ChatProbe${index}` }),
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function distance2d(a, b) {
  return Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.z ?? 0) - (b?.z ?? 0));
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
    seenChatMessageIds: new Set(),
    seenChatMessages: [],
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
      for (const chat of message.snapshot.chatMessages ?? []) {
        if (!chat?.id || state.seenChatMessageIds.has(chat.id)) continue;
        state.seenChatMessageIds.add(chat.id);
        state.seenChatMessages.push(chat);
      }
    }
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error(`WebSocket connection failed for ${player.character.name}`)), { once: true });
  });
  await waitFor(() => state.playerId && state.snapshot && localPlayer(state), `initial chat snapshot for ${player.character.name}`);
  return { socket, state };
}

function send(client, command) {
  client.socket.send(JSON.stringify(command));
}

function hasChat(client, channel, text) {
  return client.state.seenChatMessages.some((message) => message.channel === channel && message.message === text);
}

function chatCount(client, channel, text) {
  return client.state.seenChatMessages.filter((message) => message.channel === channel && message.message === text).length;
}

async function assertNoChat(client, channel, text, label) {
  await delay(quietWindowMs);
  if (hasChat(client, channel, text)) {
    throw new Error(`${label}: unexpected ${channel} chat "${text}" for ${client.state.name}`);
  }
}

async function moveFarFrom(client, referenceClient) {
  const target = { x: 42, y: 0, z: 0 };
  await waitFor(() => {
    const player = localPlayer(client.state);
    const reference = localPlayer(referenceClient.state);
    if (!player || !reference) return null;
    if (distance2d(player.position, reference.position) > localChatRadius + 4) return true;
    send(client, {
      type: 'move',
      entityId: client.state.playerId,
      target,
      run: true,
    });
    return null;
  }, `${client.state.name} to move outside local chat radius`);
}

async function closeClient(client) {
  if (!client?.socket || client.socket.readyState === WebSocket.CLOSED) return;
  await new Promise((resolve) => {
    client.socket.addEventListener('close', resolve, { once: true });
    client.socket.close();
    setTimeout(resolve, 1000);
  });
}

const clients = [];

try {
  const players = await Promise.all([createProbePlayer(1), createProbePlayer(2), createProbePlayer(3)]);
  const [speaker, near, far] = await Promise.all(players.map(connectProbeClient));
  clients.push(speaker, near, far);

  await moveFarFrom(far, speaker);

  const localText = `probe local ${Date.now()}`;
  send(speaker, {
    type: 'chat_send',
    entityId: speaker.state.playerId,
    channel: 'local',
    message: localText,
  });

  const spamText = `probe spam ${Date.now()}`;
  send(speaker, {
    type: 'chat_send',
    entityId: speaker.state.playerId,
    channel: 'local',
    message: spamText,
  });

  await waitFor(
    () => hasChat(speaker, 'local', localText) && hasChat(near, 'local', localText),
    'local chat delivery to sender and nearby player',
  );
  await waitFor(
    () => hasChat(speaker, 'system', 'Aguarde um instante antes de enviar outra mensagem.'),
    'local chat cooldown system message',
  );
  await assertNoChat(far, 'local', localText, 'local proximity filter');
  await assertNoChat(near, 'local', spamText, 'cooldown should block second local chat');

  const noPartyText = `probe no party ${Date.now()}`;
  send(near, {
    type: 'chat_send',
    entityId: near.state.playerId,
    channel: 'party',
    message: noPartyText,
  });

  await waitFor(
    () => hasChat(near, 'system', 'Voce nao esta em um grupo.'),
    'party chat without party system message',
  );
  await assertNoChat(speaker, 'party', noPartyText, 'party chat without party should not leak');

  send(speaker, {
    type: 'party_invite_send',
    entityId: speaker.state.playerId,
    targetPlayerId: near.state.playerId,
  });
  const invite = await waitFor(
    () => near.state.snapshot?.partyInvites?.find((candidate) => candidate.fromPlayerId === speaker.state.playerId),
    'party invite before party chat',
  );
  send(near, {
    type: 'party_invite_accept',
    entityId: near.state.playerId,
    inviteId: invite.inviteId,
  });
  await waitFor(
    () => speaker.state.snapshot?.party?.members?.length === 2 && near.state.snapshot?.party?.members?.length === 2,
    'party ready for party chat',
  );

  const partyText = `probe party ${Date.now()}`;
  send(near, {
    type: 'chat_send',
    entityId: near.state.playerId,
    channel: 'party',
    message: partyText,
  });

  await waitFor(
    () => hasChat(speaker, 'party', partyText) && hasChat(near, 'party', partyText),
    'party chat delivery to party members',
  );
  await assertNoChat(far, 'party', partyText, 'party chat should not leak to non-member');

  const globalText = `probe global ${Date.now()}`;
  send(far, {
    type: 'chat_send',
    entityId: far.state.playerId,
    channel: 'global',
    message: globalText,
  });

  await waitFor(
    () => hasChat(speaker, 'global', globalText) && hasChat(near, 'global', globalText) && hasChat(far, 'global', globalText),
    'global chat delivery to all connected players',
  );

  console.info(JSON.stringify({
    ok: true,
    apiUrl,
    wsUrl,
    players: clients.map(({ state }) => ({
      name: state.name,
      characterId: state.characterId,
      playerId: state.playerId,
      snapshots: state.snapshots,
      messages: state.messages,
      chatMessagesSeen: state.seenChatMessages.length,
    })),
    checks: {
      localDeliveredToNearby: hasChat(near, 'local', localText),
      localDeliveredToSelf: hasChat(speaker, 'local', localText),
      localBlockedForFarPlayer: !hasChat(far, 'local', localText),
      cooldownBlockedSecondLocal: chatCount(near, 'local', spamText) === 0 && hasChat(speaker, 'system', 'Aguarde um instante antes de enviar outra mensagem.'),
      noPartyError: hasChat(near, 'system', 'Voce nao esta em um grupo.'),
      partyDeliveredToMembers: hasChat(speaker, 'party', partyText) && hasChat(near, 'party', partyText),
      partyBlockedForNonMember: !hasChat(far, 'party', partyText),
      globalDeliveredToAll: hasChat(speaker, 'global', globalText) && hasChat(near, 'global', globalText) && hasChat(far, 'global', globalText),
    },
  }, null, 2));
} finally {
  await Promise.all(clients.map(closeClient));
}
