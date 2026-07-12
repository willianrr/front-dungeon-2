const apiUrl = process.env.ARANNA_API_URL ?? 'http://localhost:8080/api/v1';
const wsUrl = process.env.ARANNA_WS_URL ?? 'ws://localhost:8080/ws/game';
const timeoutMs = Number(process.env.ARANNA_DOCTRINES_PROBE_TIMEOUT_MS ?? 18000);

const doctrineIds = [
  'warrior_doctrine_vanguard',
  'warrior_doctrine_arcane_convergence',
  'warrior_doctrine_guardian_cadence',
];
const expected = new Map([
  [doctrineIds[0], { mastery: 'martial', skills: ['charge', 'steel-sweep'] }],
  [doctrineIds[1], { mastery: 'arcana', skills: ['arcane-bolt', 'arcane-nova'] }],
  [doctrineIds[2], { mastery: 'survival', skills: ['iron-guard', 'bulwark-call'] }],
]);
const expectedSkillIds = [
  'arcane-nova', 'war-cry', 'charge', 'heavy-strike',
  'steel-sweep', 'iron-guard', 'arcane-bolt', 'bulwark-call',
];

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
  if (!response.ok || body.error) throw new Error(body.error ?? `HTTP ${response.status}`);
  return body.data;
}

async function createProbePlayer() {
  const configuredEmail = process.env.ARANNA_DOCTRINES_PROBE_EMAIL?.trim();
  const password = process.env.ARANNA_DOCTRINES_PROBE_PASSWORD ?? 'codex123456';
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = configuredEmail || `codex-doctrines-${stamp}@local.test`;
  const auth = configuredEmail
    ? await request('/accounts/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    : await request('/accounts/register', { method: 'POST', body: JSON.stringify({ email, password }) });
  const characters = await request('/characters', { token: auth.token });
  const requestedId = Number(process.env.ARANNA_DOCTRINES_PROBE_CHARACTER_ID ?? 0);
  let character = requestedId > 0
    ? characters.find((candidate) => Number(candidate.id) === requestedId)
    : characters[0];
  if (requestedId > 0 && !character) throw new Error(`Character ${requestedId} was not found in the configured account.`);
  character ??= await request('/characters', {
    method: 'POST',
    token: auth.token,
    body: JSON.stringify({ name: process.env.ARANNA_DOCTRINES_PROBE_NAME ?? 'DoctrineProbe' }),
  });
  return { auth, character, reusedAccount: Boolean(configuredEmail) };
}

function waitFor(predicate, label, timeout = timeoutMs) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      try {
        const value = predicate();
        if (value) return resolve(value);
      } catch (error) {
        reject(error);
        return;
      }
      if (Date.now() - startedAt > timeout) {
        reject(new Error(`Timed out waiting for ${label}`));
        return;
      }
      setTimeout(tick, 45);
    };
    tick();
  });
}

function localPlayer(state) {
  return state.snapshot?.entities?.find((entity) => entity.id === state.playerId) ?? null;
}

function activeDoctrine(talents) {
  const ranks = talents?.talents ?? {};
  for (const [id, rank] of Object.entries(ranks)) {
    if (id.startsWith('warrior_doctrine_') && !doctrineIds.includes(id) && Number(rank) > 0) {
      throw new Error(`Unknown positive doctrine rank ${id}=${JSON.stringify(rank)}.`);
    }
  }
  const active = [];
  for (const id of doctrineIds) {
    const rank = ranks[id] ?? 0;
    if (rank !== 0 && rank !== 1) throw new Error(`Malformed doctrine rank ${id}=${JSON.stringify(rank)}.`);
    if (rank === 1) active.push(id);
  }
  if (active.length > 1) throw new Error(`Multiple active doctrines: ${JSON.stringify(active)}.`);
  return active[0] ?? null;
}

function talentRankKey(talents) {
  return Object.entries(talents?.talents ?? {}).sort(([left], [right]) => left.localeCompare(right));
}

function validateCatalog(state) {
  const talents = state.snapshot?.talents;
  if (talents?.signatureVersion !== 1) throw new Error(`signatureVersion=${JSON.stringify(talents?.signatureVersion)}.`);
  const choices = talents.signatureChoices;
  if (!Array.isArray(choices) || choices.length !== 3) throw new Error(`Malformed signatureChoices: ${JSON.stringify(choices)}.`);
  if (new Set(choices.map((choice) => choice.id)).size !== 3) throw new Error('Duplicate doctrine choice IDs.');
  for (const id of doctrineIds) {
    const choice = choices.find((candidate) => candidate.id === id);
    const contract = expected.get(id);
    if (!choice || !contract) throw new Error(`Missing ${id}.`);
    if (choice.choiceGroup !== 'warrior_combat_doctrine' || choice.cost !== 1) throw new Error(`Malformed ${id} group/cost.`);
    if (choice.requiredMasteryId !== contract.mastery || choice.requiredMasteryLevel !== 3) throw new Error(`Malformed ${id} mastery requirement.`);
    if (!Array.isArray(choice.modifiesSkills)
      || choice.modifiesSkills.length !== 2
      || contract.skills.some((skill) => !choice.modifiesSkills.includes(skill))) {
      throw new Error(`Malformed ${id} skill pair.`);
    }
    if (typeof choice.label !== 'string' || !choice.label.trim() || typeof choice.description !== 'string' || !choice.description.trim()) {
      throw new Error(`Malformed ${id} display metadata.`);
    }
  }
  const skills = localPlayer(state)?.skills;
  if (!Array.isArray(skills)
    || skills.length !== expectedSkillIds.length
    || expectedSkillIds.some((id, index) => skills[index]?.id !== id)) {
    throw new Error(`Non-canonical skill catalog: ${JSON.stringify(skills?.map((skill) => skill.id))}.`);
  }
}

function validateActiveModifiers(state, doctrineId) {
  const contract = expected.get(doctrineId);
  const skills = localPlayer(state)?.skills ?? [];
  if (!contract) throw new Error(`Unknown active doctrine ${doctrineId}.`);
  for (const skill of skills) {
    const doctrineModifiers = (skill.modifiers ?? []).filter((modifier) => String(modifier.id).startsWith('warrior_doctrine_'));
    if (contract.skills.includes(skill.id)) {
      if (doctrineModifiers.length !== 1 || doctrineModifiers[0].id !== doctrineId) {
        throw new Error(`Missing ${doctrineId} modifier on ${skill.id}: ${JSON.stringify(doctrineModifiers)}.`);
      }
      if (!doctrineModifiers[0].label?.trim() || !doctrineModifiers[0].description?.trim()) {
        throw new Error(`Malformed modifier metadata on ${skill.id}.`);
      }
    } else if (doctrineModifiers.length > 0) {
      throw new Error(`Unexpected doctrine modifier on ${skill.id}: ${JSON.stringify(doctrineModifiers)}.`);
    }
  }
}

async function connectProbeClient(player) {
  const socket = new WebSocket(`${wsUrl}?token=${encodeURIComponent(player.auth.token)}&characterId=${player.character.id}`);
  const state = {
    playerId: '',
    snapshot: null,
    snapshots: 0,
    events: [],
  };
  socket.addEventListener('message', (event) => {
    let message;
    try {
      message = JSON.parse(String(event.data));
    } catch {
      return;
    }
    if (message.type === 'welcome') state.playerId = message.playerId ?? state.playerId;
    if (message.type !== 'snapshot' || !message.snapshot) return;
    state.snapshot = message.snapshot;
    state.snapshots++;
    for (const partyEvent of message.snapshot.partyEvents ?? []) {
      if (partyEvent?.id && !state.events.some((candidate) => candidate.id === partyEvent.id)) state.events.push(partyEvent);
    }
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error('Doctrines probe WebSocket connection failed.')), { once: true });
  });
  await waitFor(() => state.playerId && state.snapshot && localPlayer(state), 'initial Doctrines snapshot');
  validateCatalog(state);
  return { socket, state };
}

function send(client, command) {
  client.socket.send(JSON.stringify(command));
}

async function closeClient(client, reason = 'doctrines probe reconnect') {
  if (!client || client.socket.readyState >= WebSocket.CLOSING) return;
  const closed = new Promise((resolve) => client.socket.addEventListener('close', resolve, { once: true }));
  client.socket.close(1000, reason);
  await Promise.race([closed, new Promise((resolve) => setTimeout(resolve, 1600))]);
}

let client;
let reconnectClient;
try {
  const player = await createProbePlayer();
  client = await connectProbeClient(player);
  const initial = client.state.snapshot.talents;
  let currentDoctrine = activeDoctrine(initial);
  if (currentDoctrine) validateActiveModifiers(client.state, currentDoctrine);

  const masteryLevels = new Map((client.state.snapshot.masteries ?? []).map((mastery) => [mastery.id, mastery.level]));
  const belowRequirement = doctrineIds.find((id) => (masteryLevels.get(expected.get(id).mastery) ?? 0) < 3);
  let rejectedBelowMastery = false;
  if (!currentDoctrine && belowRequirement && initial.availablePoints >= 1) {
    const baselineEvents = new Set(client.state.events.map((event) => event.id));
    const beforeRejected = structuredClone(client.state.snapshot.talents);
    send(client, { type: 'talent_learn', entityId: client.state.playerId, talentId: belowRequirement });
    await waitFor(() => (
      client.state.events.some((event) => !baselineEvents.has(event.id) && event.type === 'talent_error')
      && !activeDoctrine(client.state.snapshot?.talents)
    ), 'doctrine rejection below mastery level 3');
    const afterRejected = client.state.snapshot.talents;
    if (afterRejected.spentPoints !== beforeRejected.spentPoints
      || afterRejected.availablePoints !== beforeRejected.availablePoints
      || JSON.stringify(talentRankKey(afterRejected)) !== JSON.stringify(talentRankKey(beforeRejected))) {
      throw new Error('Below-mastery rejection mutated talent points or ranks.');
    }
    rejectedBelowMastery = true;
  }

  const configuredChoice = process.env.ARANNA_DOCTRINES_PROBE_CHOICE?.trim();
  if (configuredChoice && !doctrineIds.includes(configuredChoice)) {
    throw new Error(`ARANNA_DOCTRINES_PROBE_CHOICE must be one of ${JSON.stringify(doctrineIds)}, got ${configuredChoice}.`);
  }
  if (configuredChoice && currentDoctrine && configuredChoice !== currentDoctrine) {
    throw new Error(`Configured doctrine ${configuredChoice} does not match the already active ${currentDoctrine}.`);
  }
  const learnable = doctrineIds.find((id) => (
    (!configuredChoice || configuredChoice === id)
    && (masteryLevels.get(expected.get(id).mastery) ?? 0) >= 3
  ));
  let learned = false;
  let persisted = false;
  let reset = false;
  let exclusivityRejected = false;
  let exclusivityEligible = false;
  if (!currentDoctrine && learnable && initial.availablePoints >= 1) {
    const baselineEvents = new Set(client.state.events.map((event) => event.id));
    const beforeSpent = client.state.snapshot.talents.spentPoints;
    const beforeAvailable = client.state.snapshot.talents.availablePoints;
    send(client, { type: 'talent_learn', entityId: client.state.playerId, talentId: learnable });
    await waitFor(() => {
      const talents = client.state.snapshot?.talents;
      return activeDoctrine(talents) === learnable
        && talents.spentPoints === beforeSpent + 1
        && talents.availablePoints === beforeAvailable - 1
        && client.state.events.some((event) => !baselineEvents.has(event.id) && event.type === 'talent_learned');
    }, `learn ${learnable}`);
    currentDoctrine = learnable;
    validateActiveModifiers(client.state, currentDoctrine);
    learned = true;
  }

  if (currentDoctrine) {
    const rejectedChoice = doctrineIds.find((id) => (
      id !== currentDoctrine && (masteryLevels.get(expected.get(id).mastery) ?? 0) >= 3
    ));
    exclusivityEligible = Boolean(rejectedChoice && client.state.snapshot.talents.availablePoints >= 1);
    if (rejectedChoice && exclusivityEligible) {
      const baselineEvents = new Set(client.state.events.map((event) => event.id));
      const beforeTalents = structuredClone(client.state.snapshot.talents);
      send(client, { type: 'talent_learn', entityId: client.state.playerId, talentId: rejectedChoice });
      await waitFor(() => (
        client.state.events.some((event) => !baselineEvents.has(event.id) && event.type === 'talent_error')
        && activeDoctrine(client.state.snapshot?.talents) === currentDoctrine
      ), 'exclusive doctrine rejection');
      const afterRejected = client.state.snapshot.talents;
      if (afterRejected.spentPoints !== beforeTalents.spentPoints
        || afterRejected.availablePoints !== beforeTalents.availablePoints
        || JSON.stringify(talentRankKey(afterRejected)) !== JSON.stringify(talentRankKey(beforeTalents))) {
        throw new Error('Rejected second doctrine mutated talent points or ranks.');
      }
      exclusivityRejected = true;
    }

    await closeClient(client);
    client = null;
    await new Promise((resolve) => setTimeout(resolve, 350));
    reconnectClient = await connectProbeClient(player);
    await waitFor(() => activeDoctrine(reconnectClient.state.snapshot?.talents) === currentDoctrine, 'persisted doctrine after reconnect');
    validateActiveModifiers(reconnectClient.state, currentDoctrine);
    persisted = true;

    const allowReset = !player.reusedAccount || process.env.ARANNA_DOCTRINES_PROBE_ALLOW_RESET === '1';
    if (allowReset) {
      const baselineEvents = new Set(reconnectClient.state.events.map((event) => event.id));
      send(reconnectClient, { type: 'talent_reset', entityId: reconnectClient.state.playerId });
      await waitFor(() => (
        activeDoctrine(reconnectClient.state.snapshot?.talents) === null
        && reconnectClient.state.snapshot.talents.spentPoints === 0
        && reconnectClient.state.snapshot.talents.availablePoints === reconnectClient.state.snapshot.talents.talentPoints
        && reconnectClient.state.events.some((event) => !baselineEvents.has(event.id) && event.type === 'talent_reset')
      ), 'doctrine reset');
      for (const skill of localPlayer(reconnectClient.state)?.skills ?? []) {
        if ((skill.modifiers ?? []).some((modifier) => String(modifier.id).startsWith('warrior_doctrine_'))) {
          throw new Error(`Doctrine modifier survived reset on ${skill.id}.`);
        }
      }
      reset = true;
    }
  }

  console.info(JSON.stringify({
    ok: true,
    apiUrl,
    wsUrl,
    player: { characterId: player.character.id, reusedAccount: player.reusedAccount },
    checks: {
      signatureCatalog: true,
      canonicalSkillCatalog: true,
      rejectedBelowMastery,
      learnedWhenEligible: learned,
      exclusivityEligible,
      exclusivityRejected,
      persistedWhenSelected: persisted,
      resetWhenAuthorized: reset,
    },
    note: !learned && !currentDoctrine
      ? 'No mastery-3 eligible doctrine was available; catalog and below-mastery rejection remain covered.'
      : undefined,
  }, null, 2));
} finally {
  await closeClient(client);
  await closeClient(reconnectClient);
}
