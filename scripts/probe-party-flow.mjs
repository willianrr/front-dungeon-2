const apiUrl = process.env.ARANNA_API_URL ?? 'http://localhost:8080/api/v1';
const wsUrl = process.env.ARANNA_WS_URL ?? 'ws://localhost:8080/ws/game';
const timeoutMs = Number(process.env.ARANNA_PARTY_PROBE_TIMEOUT_MS ?? 10000);

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
    body: JSON.stringify({ email: `codex-party-${stamp}-${index}@local.test`, password: 'codex123456' }),
  });
  const characters = await request('/characters', { token: auth.token });
  const character = characters[0] ?? await request('/characters', {
    method: 'POST',
    token: auth.token,
    body: JSON.stringify({ name: `PartyProbe${index}` }),
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
    welcome: 0,
    messages: 0,
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
      state.welcome++;
    }
    if (message.type === 'snapshot' && message.snapshot) {
      state.snapshot = message.snapshot;
      state.snapshots++;
    }
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error(`WebSocket connection failed for ${player.character.name}`)), { once: true });
  });
  await waitFor(() => state.playerId && state.snapshot, `initial snapshot for ${player.character.name}`);
  return { socket, state };
}

function send(client, command) {
  client.socket.send(JSON.stringify(command));
}

const clients = [];

try {
  const [playerA, playerB, playerC] = await Promise.all([createProbePlayer(1), createProbePlayer(2), createProbePlayer(3)]);
  const [clientA, clientB, clientC] = await Promise.all([connectProbeClient(playerA), connectProbeClient(playerB), connectProbeClient(playerC)]);
  clients.push(clientA, clientB, clientC);

  send(clientA, {
    type: 'party_invite_send',
    entityId: clientA.state.playerId,
    targetPlayerId: clientB.state.playerId,
  });

  const invite = await waitFor(
    () => clientB.state.snapshot?.partyInvites?.find((candidate) => candidate.fromPlayerId === clientA.state.playerId),
    'party invite on target snapshot',
  );

  send(clientB, {
    type: 'party_invite_accept',
    entityId: clientB.state.playerId,
    inviteId: invite.inviteId,
  });

  await waitFor(
    () => {
      const partyA = clientA.state.snapshot?.party;
      const partyB = clientB.state.snapshot?.party;
      return partyA && partyB && partyA.id === partyB.id && partyA.members?.length === 2 && partyB.members?.length === 2;
    },
    'party state with both members',
  );

  send(clientA, {
    type: 'party_invite_send',
    entityId: clientA.state.playerId,
    targetPlayerId: clientC.state.playerId,
  });

  const inviteC = await waitFor(
    () => clientC.state.snapshot?.partyInvites?.find((candidate) => candidate.fromPlayerId === clientA.state.playerId),
    'party invite on third player snapshot',
  );

  send(clientC, {
    type: 'party_invite_accept',
    entityId: clientC.state.playerId,
    inviteId: inviteC.inviteId,
  });

  await waitFor(
    () => {
      const partyA = clientA.state.snapshot?.party;
      const partyB = clientB.state.snapshot?.party;
      const partyC = clientC.state.snapshot?.party;
      return partyA && partyB && partyC && partyA.id === partyB.id && partyA.id === partyC.id
        && partyA.members?.length === 3 && partyB.members?.length === 3 && partyC.members?.length === 3;
    },
    'party state with three members',
  );

  const partyChatText = `probe party chat ${Date.now()}`;
  send(clientA, {
    type: 'chat_send',
    entityId: clientA.state.playerId,
    channel: 'party',
    message: partyChatText,
  });

  await waitFor(
    () => clientB.state.snapshot?.chatMessages?.some((message) => message.channel === 'party' && message.message === partyChatText),
    'party chat delivery to second member',
  );

  send(clientA, {
    type: 'party_leader_transfer',
    entityId: clientA.state.playerId,
    targetPlayerId: clientB.state.playerId,
  });

  await waitFor(
    () => {
      const partyA = clientA.state.snapshot?.party;
      const partyB = clientB.state.snapshot?.party;
      const partyC = clientC.state.snapshot?.party;
      return partyA && partyB && partyC
        && partyA.leaderId === clientB.state.playerId
        && partyB.leaderId === clientB.state.playerId
        && partyC.leaderId === clientB.state.playerId
        && partyA.members?.length === 3 && partyB.members?.length === 3 && partyC.members?.length === 3;
    },
    'party leadership transferred to second member',
  );

  send(clientB, {
    type: 'party_kick',
    entityId: clientB.state.playerId,
    targetPlayerId: clientC.state.playerId,
  });

  await waitFor(
    () => {
      const partyA = clientA.state.snapshot?.party;
      const partyB = clientB.state.snapshot?.party;
      const partyC = clientC.state.snapshot?.party;
      const kickedEvent = clientC.state.snapshot?.partyEvents?.some((event) => event.type === 'party_kicked');
      return partyC == null && kickedEvent && partyA && partyB
        && partyA.members?.length === 2 && partyB.members?.length === 2
        && !partyA.members?.some((member) => member.id === clientC.state.playerId);
    },
    'transferred leader kick reflected in snapshots',
  );

  send(clientA, {
    type: 'party_leave',
    entityId: clientA.state.playerId,
  });

  await waitFor(
    () => {
      const partyA = clientA.state.snapshot?.party;
      const partyB = clientB.state.snapshot?.party;
      return partyA == null && partyB && partyB.members?.length === 1 && partyB.members[0]?.id === clientB.state.playerId;
    },
    'party leave reflected in snapshots',
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
    })),
    checks: {
      inviteReceived: true,
      partyCreated: true,
      partyChatDelivered: true,
      leaderTransferred: true,
      kickUpdated: true,
      leaveUpdated: true,
    },
  }, null, 2));
} finally {
  for (const { socket } of clients) {
    socket.close();
  }
}
