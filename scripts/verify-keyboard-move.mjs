import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(tmpdir(), 'aranna-verify-keyboard-move');

async function compileModule(relativeSource, outputName) {
  const sourcePath = path.join(root, relativeSource);
  const outPath = path.join(outDir, outputName);
  const source = await readFile(sourcePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
    },
    fileName: sourcePath,
  });
  const outputText = compiled.outputText
    .replaceAll("from './MovementCollision'", "from './MovementCollision.mjs'")
    .replaceAll("from './NpcServiceDirectory'", "from './NpcServiceDirectory.mjs'")
    .replaceAll("from './NpcQuestMarker'", "from './NpcQuestMarker.mjs'")
    .replaceAll("from './NpcTargetFrameInteraction'", "from './NpcTargetFrameInteraction.mjs'")
    .replaceAll("from './QuestNavigation'", "from './QuestNavigation.mjs'")
    .replaceAll("from '../shared/types'", "from '../shared/types.mjs'");
  await writeFile(outPath, outputText, 'utf8');
  return outPath;
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const keyboardMovePath = await compileModule('src/core/KeyboardMoveController.ts', 'KeyboardMoveController.mjs');
const autorunMovePath = await compileModule('src/core/AutorunMove.ts', 'AutorunMove.mjs');
const stationarySkillCastPath = await compileModule('src/core/StationarySkillCast.ts', 'StationarySkillCast.mjs');
const bagInventoryPath = await compileModule('src/ui/BagInventory.ts', 'BagInventory.mjs');
const chatPresentationPath = await compileModule('src/core/ChatPresentation.ts', 'ChatPresentation.mjs');
const clickAutomovePolicyPath = await compileModule('src/core/ClickAutomovePolicy.ts', 'ClickAutomovePolicy.mjs');
const clickMoveArrivalPath = await compileModule('src/core/ClickMoveArrival.ts', 'ClickMoveArrival.mjs');
const clientMovementPath = await compileModule('src/core/ClientMovementPredictor.ts', 'ClientMovementPredictor.mjs');
const facingPath = await compileModule('src/core/Facing.ts', 'Facing.mjs');
const movementCollisionPath = await compileModule('src/core/MovementCollision.ts', 'MovementCollision.mjs');
const npcActionLabelPath = await compileModule('src/core/NpcActionLabel.ts', 'NpcActionLabel.mjs');
const npcApproachPreviewPath = await compileModule('src/core/NpcApproachPreview.ts', 'NpcApproachPreview.mjs');
const npcApproachPointPath = await compileModule('src/core/NpcApproachPoint.ts', 'NpcApproachPoint.mjs');
const npcFacingFocusPath = await compileModule('src/core/NpcFacingFocus.ts', 'NpcFacingFocus.mjs');
const npcGuideTargetPath = await compileModule('src/core/NpcGuideTarget.ts', 'NpcGuideTarget.mjs');
const npcInteractionTargetPath = await compileModule('src/core/NpcInteractionTarget.ts', 'NpcInteractionTarget.mjs');
const npcMinimapMarkerPath = await compileModule('src/core/NpcMinimapMarker.ts', 'NpcMinimapMarker.mjs');
const npcQuestMarkerPath = await compileModule('src/core/NpcQuestMarker.ts', 'NpcQuestMarker.mjs');
const npcNameplatePath = await compileModule('src/core/NpcNameplate.ts', 'NpcNameplate.mjs');
const npcServiceDirectoryPath = await compileModule('src/core/NpcServiceDirectory.ts', 'NpcServiceDirectory.mjs');
const npcServiceIdentityPath = await compileModule('src/core/NpcServiceIdentity.ts', 'NpcServiceIdentity.mjs');
const npcSelectionCyclePath = await compileModule('src/core/NpcSelectionCycle.ts', 'NpcSelectionCycle.mjs');
const npcServicePropPath = await compileModule('src/core/NpcServiceProp.ts', 'NpcServiceProp.mjs');
const npcServicePriorityPath = await compileModule('src/core/NpcServicePriority.ts', 'NpcServicePriority.mjs');
const npcServiceStatusPath = await compileModule('src/core/NpcServiceStatus.ts', 'NpcServiceStatus.mjs');
const npcServiceVisualPath = await compileModule('src/core/NpcServiceVisual.ts', 'NpcServiceVisual.mjs');
const npcTargetFramePath = await compileModule('src/core/NpcTargetFrame.ts', 'NpcTargetFrame.mjs');
const npcTargetFrameInteractionPath = await compileModule('src/core/NpcTargetFrameInteraction.ts', 'NpcTargetFrameInteraction.mjs');
const npcVisualFocusPath = await compileModule('src/core/NpcVisualFocus.ts', 'NpcVisualFocus.mjs');
const pathGuidancePath = await compileModule('src/core/PathGuidance.ts', 'PathGuidance.mjs');
const pendingInteractionPath = await compileModule('src/core/PendingInteraction.ts', 'PendingInteraction.mjs');
const playerIntentCancelPath = await compileModule('src/core/PlayerIntentCancel.ts', 'PlayerIntentCancel.mjs');
const questDialogueActionPath = await compileModule('src/core/QuestDialogueAction.ts', 'QuestDialogueAction.mjs');
const questNavigationPath = await compileModule('src/core/QuestNavigation.ts', 'QuestNavigation.mjs');
const questTrackerRoutePath = await compileModule('src/core/QuestTrackerRoute.ts', 'QuestTrackerRoute.mjs');
const vendorOfferPath = await compileModule('src/core/VendorOffer.ts', 'VendorOffer.mjs');

const { KeyboardMoveController } = await import(`${pathToFileURL(keyboardMovePath).href}?t=${Date.now()}`);
const { autorunMoveState } = await import(`${pathToFileURL(autorunMovePath).href}?t=${Date.now()}`);
const { stationarySkillMovementPlan } = await import(`${pathToFileURL(stationarySkillCastPath).href}?t=${Date.now()}`);
const { bagInventoryItems } = await import(`${pathToFileURL(bagInventoryPath).href}?t=${Date.now()}`);
const { chatBubbleTextColor, chatBubbleToneFor } = await import(`${pathToFileURL(chatPresentationPath).href}?t=${Date.now()}`);
const { canStartClickAutomove, canStartNpcDestinationAutomove } = await import(`${pathToFileURL(clickAutomovePolicyPath).href}?t=${Date.now()}`);
const { clickMoveArrivalStep } = await import(`${pathToFileURL(clickMoveArrivalPath).href}?t=${Date.now()}`);
const { ClientMovementPredictor } = await import(`${pathToFileURL(clientMovementPath).href}?t=${Date.now()}`);
const { turnYawToward, yawTowardPoint } = await import(`${pathToFileURL(facingPath).href}?t=${Date.now()}`);
const {
  furthestClearPathIndex,
  findLocalPath,
  isMovementSegmentClear,
  isMoveTargetBlocked,
  resolveCircularCollisions,
  walkableGoalNear,
} = await import(`${pathToFileURL(movementCollisionPath).href}?t=${Date.now()}`);
const { npcActionLabel } = await import(`${pathToFileURL(npcActionLabelPath).href}?t=${Date.now()}`);
const {
  npcApproachPreviewTargetId,
  shouldShowNpcApproachPreview,
} = await import(`${pathToFileURL(npcApproachPreviewPath).href}?t=${Date.now()}`);
const {
  chooseNpcApproachPoint,
  npcApproachTriggerRange,
} = await import(`${pathToFileURL(npcApproachPointPath).href}?t=${Date.now()}`);
const { npcFacingFocusTargetId } = await import(`${pathToFileURL(npcFacingFocusPath).href}?t=${Date.now()}`);
const { npcGuideTargetNpcId } = await import(`${pathToFileURL(npcGuideTargetPath).href}?t=${Date.now()}`);
const { npcInteractionTargetDecision } = await import(`${pathToFileURL(npcInteractionTargetPath).href}?t=${Date.now()}`);
const { npcMinimapMarkerVisualState } = await import(`${pathToFileURL(npcMinimapMarkerPath).href}?t=${Date.now()}`);
const { npcQuestMarkerModel } = await import(`${pathToFileURL(npcQuestMarkerPath).href}?t=${Date.now()}`);
const {
  npcNameplateModel,
  npcPassiveServiceLabel,
  npcQuestStateLabel,
} = await import(`${pathToFileURL(npcNameplatePath).href}?t=${Date.now()}`);
const {
  npcServiceDestinationSubtitle,
  sortNpcServiceDestinations,
} = await import(`${pathToFileURL(npcServiceDirectoryPath).href}?t=${Date.now()}`);
const {
  npcServiceGlyph,
  npcServiceIdentity,
  npcServiceRoleLabel,
} = await import(`${pathToFileURL(npcServiceIdentityPath).href}?t=${Date.now()}`);
const { nextNpcSelectionId } = await import(`${pathToFileURL(npcSelectionCyclePath).href}?t=${Date.now()}`);
const {
  npcServicePropBlockers,
  npcServicePropPartVisualState,
  npcServicePropParts,
  npcServicePropVisualState,
} = await import(`${pathToFileURL(npcServicePropPath).href}?t=${Date.now()}`);
const { npcServicePriorityScore } = await import(`${pathToFileURL(npcServicePriorityPath).href}?t=${Date.now()}`);
const { npcServiceStatusLabel } = await import(`${pathToFileURL(npcServiceStatusPath).href}?t=${Date.now()}`);
const { npcServiceAccentCss, npcServiceAccentHex } = await import(`${pathToFileURL(npcServiceVisualPath).href}?t=${Date.now()}`);
const { npcTargetFrameModel, npcTargetFrameRenderKey } = await import(`${pathToFileURL(npcTargetFramePath).href}?t=${Date.now()}`);
const { npcTargetFrameInteractionDecision } = await import(`${pathToFileURL(npcTargetFrameInteractionPath).href}?t=${Date.now()}`);
const {
  npcHoverFocusTargetId,
  npcInteractionRingState,
  npcVisualFocusState,
  shouldCloseNpcServicePanel,
} = await import(`${pathToFileURL(npcVisualFocusPath).href}?t=${Date.now()}`);
const { samplePathGuidancePoints } = await import(`${pathToFileURL(pathGuidancePath).href}?t=${Date.now()}`);
const { pendingInteractionDecision, pendingInteractionRetryDecision } = await import(`${pathToFileURL(pendingInteractionPath).href}?t=${Date.now()}`);
const { playerIntentCancelPlan } = await import(`${pathToFileURL(playerIntentCancelPath).href}?t=${Date.now()}`);
const { questDialogueActionDecision, questDialogueActionLabel } = await import(`${pathToFileURL(questDialogueActionPath).href}?t=${Date.now()}`);
const { questNavigationHoverNpcId, questNavigationTargetNpcId } = await import(`${pathToFileURL(questNavigationPath).href}?t=${Date.now()}`);
const { questTrackerRouteLabel } = await import(`${pathToFileURL(questTrackerRoutePath).href}?t=${Date.now()}`);
const { vendorOfferModel, vendorRecommendedItemId } = await import(`${pathToFileURL(vendorOfferPath).href}?t=${Date.now()}`);

const idle = {
  dt: 1 / 60,
  movementChanged: false,
  axes: { strafe: 0, forward: 0 },
  running: false,
  player: { x: 0, z: 0 },
  direction: { x: 0, z: 0 },
};

function collect(controller, samples) {
  return samples
    .map((sample) => controller.update(sample))
    .filter((decision) => decision.type !== 'none');
}

{
  assert.deepEqual(
    stationarySkillMovementPlan({
      clickMoveActive: true,
      pendingInteractionActive: true,
      heldGroundMoveActive: true,
      queuedMoveActive: true,
      autorunActive: true,
    }),
    {
      clearClickMove: true,
      clearPendingInteraction: true,
      clearHeldGroundMove: true,
      clearQueuedMove: true,
      clearAutorun: true,
      suppressMovementForFrame: true,
    },
    'Iron Guard must clear every local movement source and suppress the cast frame',
  );

  const heldAfterGuard = new KeyboardMoveController();
  const heldForward = { ...idle, axes: { strafe: 0, forward: 1 }, direction: { x: 0, z: 1 } };
  assert.equal(heldAfterGuard.update(heldForward).type, 'move');
  assert.equal(heldAfterGuard.update(heldForward).type, 'none');
  heldAfterGuard.reset();
  assert.equal(
    heldAfterGuard.update(heldForward).type,
    'move',
    'movement may create a fresh command on the frame after Iron Guard resets its old intent',
  );
}

{
  const physicalItems = Array.from({ length: 44 }, (_, index) => ({
    id: `item-${index + 1}`,
    kind: 'ore',
    equipped: false,
  }));
  const visible = bagInventoryItems([
    { id: 'coins', kind: 'coin', equipped: false },
    { id: 'equipped-sword', kind: 'sword', equipped: true },
    ...physicalItems,
  ]);
  assert.equal(visible.length, 44, 'coins and equipped gear must not consume one of the 44 bag slots');
  assert.equal(visible.some((item) => item.kind === 'coin'), false, 'coin balance must never render as a bag item');
  assert.equal(visible.at(-1)?.id, 'item-44', 'filtering coins must prevent truncation of the last real bag item');
}

{
  assert.equal(chatBubbleToneFor('local'), 'local', 'local chat should create a speech bubble');
  assert.equal(chatBubbleToneFor('party'), 'party', 'party chat should create a speech bubble when the sender is visible');
  assert.equal(chatBubbleToneFor('global'), null, 'global chat should stay in the HUD feed only');
  assert.equal(chatBubbleToneFor('system'), null, 'system chat must stay in the HUD feed only');
  assert.equal(chatBubbleTextColor('party'), '#d8f7ff', 'party bubbles should use the party/social tone');
}

{
  const fullRun = clickMoveArrivalStep(8, 7.8, 1 / 60, 0.35, true, true);
  assert.equal(fullRun.running, true, 'long final click segment should keep run animation');
  assert.ok(Math.abs(fullRun.step - 7.8 / 60) < 1e-9, 'long final click segment should keep full speed');

  const intermediate = clickMoveArrivalStep(0.7, 7.8, 1 / 60, 0.35, false, true);
  assert.equal(intermediate.running, true, 'intermediate waypoints must not force walk animation');
  assert.ok(Math.abs(intermediate.step - 7.8 / 60) < 1e-9, 'intermediate waypoints must not decelerate');

  const arrival = clickMoveArrivalStep(0.7, 7.8, 1 / 60, 0.35, true, true);
  assert.equal(arrival.running, false, 'short final click segment should ease out of run animation');
  assert.ok(arrival.step < intermediate.step, 'short final click segment should reduce local step speed');
  assert.ok(arrival.step > 0, 'arrival easing must still move toward the destination');
}

{
  assert.deepEqual(
    npcMinimapMarkerVisualState({}),
    {
      tone: 'normal',
      sizeMultiplier: 1,
      haloRadius: 0,
      haloColor: 'rgba(255, 255, 255, 0)',
    },
    'normal NPC minimap markers must not draw a destination halo',
  );
  assert.equal(
    npcMinimapMarkerVisualState({ selected: true }).tone,
    'selected',
    'selected NPC minimap markers must show target focus',
  );
  assert.equal(
    npcMinimapMarkerVisualState({ hovered: true }).tone,
    'hovered',
    'hovered NPC minimap markers must preview pointer focus',
  );
  assert.equal(
    npcMinimapMarkerVisualState({ objective: true }).tone,
    'objective',
    'quest objective NPC minimap markers must show persistent objective focus',
  );
  assert.ok(
    npcMinimapMarkerVisualState({ hovered: true }).sizeMultiplier > npcMinimapMarkerVisualState({}).sizeMultiplier,
    'hovered NPC minimap markers should be larger than normal markers',
  );
  assert.ok(
    npcMinimapMarkerVisualState({ objective: true }).haloRadius > npcMinimapMarkerVisualState({ hovered: true }).haloRadius,
    'quest objective NPC minimap markers should draw a stronger halo than hover-only markers',
  );
  assert.equal(
    npcMinimapMarkerVisualState({ hovered: true, objective: true }).tone,
    'objective',
    'quest objective minimap focus should outrank hover preview',
  );
  assert.ok(
    npcMinimapMarkerVisualState({ selected: true }).sizeMultiplier > npcMinimapMarkerVisualState({ hovered: true }).sizeMultiplier,
    'selected NPC minimap markers should outrank hovered-only markers',
  );
  assert.equal(
    npcMinimapMarkerVisualState({ hovered: true, selected: true, objective: true }).tone,
    'selected',
    'selected NPC minimap focus must outrank objective and hover preview',
  );
  assert.equal(
    npcMinimapMarkerVisualState({ selected: true, pending: true }).tone,
    'pending',
    'pending NPC routes must outrank plain selected minimap focus',
  );
  assert.equal(
    npcMinimapMarkerVisualState({ selected: true, pending: true, active: true }).tone,
    'active',
    'open NPC service panels must outrank pending minimap focus',
  );
  assert.ok(
    npcMinimapMarkerVisualState({ active: true }).sizeMultiplier > npcMinimapMarkerVisualState({ selected: true }).sizeMultiplier,
    'active NPC minimap markers should be larger than selected-only markers',
  );
  assert.equal(npcServiceAccentCss('healer'), '#76e2ff', 'healer NPC service accent must stay shared across HUD and world cues');
  assert.equal(npcServiceAccentHex('healer'), 0x76e2ff, 'healer NPC route preview must use the same service accent hue');
  assert.equal(npcServiceAccentCss('blacksmith'), '#ff9d5c', 'blacksmith NPC service accent must stay shared across HUD and world cues');
  assert.equal(npcServiceAccentHex('banker'), 0xd8c6ff, 'banker NPC route preview must use the same service accent hue');
  assert.equal(npcServiceGlyph('vendor'), '$', 'vendor NPC identity must expose the classic shop glyph');
  assert.equal(npcServiceRoleLabel('banker'), 'Banco', 'banker NPC identity must expose its MMORPG role label');
  assert.deepEqual(
    npcServiceIdentity('travel'),
    { glyph: '>', roleLabel: 'Portal' },
    'travel NPC identity must stay shared by world markers, minimap, and service directory',
  );

  assert.equal(yawTowardPoint({ x: 0, z: 0 }, { x: 0, z: 0 }), null, 'overlapping positions must not produce a facing yaw');
  assert.equal(yawTowardPoint({ x: 0, z: 0 }, { x: 0, z: 5 }), 0, 'north/south facing must use PlayCanvas yaw convention');
  assert.equal(yawTowardPoint({ x: 0, z: 0 }, { x: 5, z: 0 }), Math.PI / 2, 'east-facing NPC interactions must point the hero at the NPC');
  assert.equal(turnYawToward(0, Math.PI / 2, 0, 12), Math.PI / 2, 'zero-dt turn must snap for instant interaction facing');
  const wrapped = turnYawToward(Math.PI - 0.1, -Math.PI + 0.1, 1 / 60, 12);
  assert.ok(wrapped > Math.PI - 0.1, 'active NPC facing must turn over the shortest wrapped arc');
  assert.equal(
    npcFacingFocusTargetId({
      playerReady: true,
      activeNpcId: 'npc-banker-maelis',
      selectedNpcId: 'npc-merchant-aran',
      selectedNpcNearby: true,
    }),
    'npc-banker-maelis',
    'open NPC panels must keep player facing on the active service NPC',
  );
  assert.equal(
    npcFacingFocusTargetId({
      playerReady: true,
      selectedNpcId: 'npc-merchant-aran',
      selectedNpcNearby: true,
    }),
    'npc-merchant-aran',
    'nearby selected NPC should receive idle facing focus',
  );
  assert.equal(
    npcFacingFocusTargetId({
      playerReady: true,
      selectedNpcId: 'npc-merchant-aran',
      selectedNpcNearby: false,
    }),
    null,
    'far selected NPCs must not rotate the player while idle',
  );
  assert.equal(
    npcFacingFocusTargetId({
      playerReady: true,
      selectedNpcId: 'npc-merchant-aran',
      selectedNpcNearby: true,
      keyboardMovementActive: true,
    }),
    null,
    'keyboard movement must own facing over selected NPC focus',
  );
  assert.equal(
    npcFacingFocusTargetId({
      playerReady: true,
      activeNpcId: 'npc-quest-lyra',
      attackAimActive: true,
    }),
    null,
    'attack aim must own facing over NPC focus',
  );
}

{
  assert.equal(
    canStartClickAutomove({ keyboardMovementActive: false }),
    true,
    'click-to-move may start when keyboard movement is idle',
  );
  assert.equal(
    canStartClickAutomove({ keyboardMovementActive: true }),
    false,
    'keyboard movement must own locomotion and suppress new click automove routes',
  );
  assert.equal(
    canStartNpcDestinationAutomove({ keyboardMovementActive: false }),
    true,
    'NPC service directory may start automove when keyboard movement is idle',
  );
  assert.equal(
    canStartNpcDestinationAutomove({ keyboardMovementActive: true }),
    false,
    'NPC service directory must not steal locomotion while WASD is active',
  );
}

{
  assert.deepEqual(
    autorunMoveState({
      active: false,
      toggleQueued: true,
      manualAxes: { strafe: 0, forward: 0 },
      movementChanged: false,
    }),
    { active: true, axes: { strafe: 0, forward: 1 }, movementChanged: true },
    'NumLock autorun should start a forward keyboard movement intent',
  );
  assert.deepEqual(
    autorunMoveState({
      active: true,
      toggleQueued: false,
      manualAxes: { strafe: 1, forward: 0 },
      movementChanged: false,
    }),
    { active: true, axes: { strafe: 1, forward: 1 }, movementChanged: false },
    'autorun should allow strafing while it keeps forward movement active',
  );
  assert.deepEqual(
    autorunMoveState({
      active: true,
      toggleQueued: false,
      manualAxes: { strafe: 0, forward: -1 },
      movementChanged: true,
    }),
    { active: false, axes: { strafe: 0, forward: -1 }, movementChanged: true },
    'manual forward/backward input should cancel autorun and take over movement',
  );
  assert.deepEqual(
    autorunMoveState({
      active: true,
      toggleQueued: true,
      manualAxes: { strafe: 0, forward: 0 },
      movementChanged: false,
    }),
    { active: false, axes: { strafe: 0, forward: 0 }, movementChanged: true },
    'pressing NumLock again should stop autorun and emit one movement change',
  );
}

{
  const controller = new KeyboardMoveController();
  const decisions = collect(controller, Array.from({ length: 300 }, () => idle));
  assert.equal(decisions.length, 0, 'idle player must not send commands');
}

{
  const controller = new KeyboardMoveController();
  const first = controller.update({
    ...idle,
    movementChanged: true,
    axes: { strafe: 0, forward: 1 },
    direction: { x: 0, z: -1 },
  });
  assert.equal(first.type, 'move', 'pressing W must send one movement command');
  assert.deepEqual(first.target, { x: 0, y: 0, z: -18 });

  const heldDecisions = collect(
    controller,
    Array.from({ length: 120 }, () => ({
      ...idle,
      axes: { strafe: 0, forward: 1 },
      direction: { x: 0, z: -1 },
    })),
  );
  assert.equal(heldDecisions.length, 0, 'holding W far from target must not stream commands every frame');
}

{
  const controller = new KeyboardMoveController();
  controller.update({
    ...idle,
    movementChanged: true,
    axes: { strafe: 0, forward: 1 },
    direction: { x: 0, z: -1 },
  });
  const refresh = controller.update({
    ...idle,
    dt: 0.5,
    axes: { strafe: 0, forward: 1 },
    player: { x: 0, z: -14 },
    direction: { x: 0, z: -1 },
  });
  assert.equal(refresh.type, 'move', 'held movement may refresh only when the long target is nearly reached');
  assert.deepEqual(refresh.target, { x: 0, y: 0, z: -32 });
}

{
  const controller = new KeyboardMoveController();
  controller.update({
    ...idle,
    movementChanged: true,
    axes: { strafe: 1, forward: 0 },
    direction: { x: 1, z: 0 },
  });
  const stop = controller.update({
    ...idle,
    movementChanged: true,
    axes: { strafe: 0, forward: 0 },
    player: { x: 3, z: 2 },
  });
  assert.equal(stop.type, 'move', 'releasing WASD must send one stop command');
  assert.deepEqual(stop.target, { x: 3, y: 0, z: 2 });
  assert.equal(stop.run, false);

  const afterStop = collect(controller, Array.from({ length: 120 }, () => idle));
  assert.equal(afterStop.length, 0, 'after stop, idle frames must remain silent');
}

{
  const controller = new KeyboardMoveController();
  const shiftOnly = controller.update({ ...idle, movementChanged: true, running: true });
  assert.equal(shiftOnly.type, 'none', 'Shift without movement must not send network commands');
}

{
  const predictor = new ClientMovementPredictor();
  const terrain = { half: 100, heightAt: (x, z) => x * 0.1 + z * 0.01 };
  const idlePrediction = predictor.predict({
    dt: 1 / 60,
    axes: { strafe: 0, forward: 0 },
    running: false,
    direction: { x: 0, z: 0 },
    current: { x: 0, y: 0, z: 0 },
    terrain,
    zone: 'overworld',
  });
  assert.equal(idlePrediction, null, 'idle player must not be predicted locally');

  const walkPrediction = predictor.predict({
    dt: 1,
    axes: { strafe: 0, forward: 1 },
    running: false,
    direction: { x: 0, z: -1 },
    current: { x: 0, y: 0, z: 0 },
    terrain,
    zone: 'overworld',
  });
  assert.equal(walkPrediction.position.z, -0.21000000000000002, 'prediction clamps dt to one render frame');
  assert.equal(walkPrediction.running, false);

  const runPrediction = predictor.predict({
    dt: 1 / 60,
    axes: { strafe: 1, forward: 0 },
    running: true,
    direction: { x: 1, z: 0 },
    current: { x: 99.95, y: 0, z: 0 },
    terrain,
    zone: 'dungeon',
  });
  assert.equal(runPrediction.position.x, 100, 'prediction must respect terrain bounds');
  assert.equal(runPrediction.position.y, 0, 'dungeon prediction uses the flat floor height');
  assert.equal(runPrediction.running, true);
}

{
  const npcKinds = ['vendor', 'quest', 'healer', 'blacksmith', 'trainer', 'travel', 'jeweler', 'banker', 'guard'];
  for (const kind of npcKinds) {
    const parts = npcServicePropParts(kind);
    assert.ok(parts.length >= 3, `${kind} NPC service props must create a readable world marker`);
    for (const part of parts) {
      assert.ok(part.scale.x > 0 && part.scale.y > 0 && part.scale.z > 0, `${kind}/${part.id} service prop scale must be positive`);
    }
  }
  assert.ok(
    npcServicePropParts('vendor').some((part) => part.id === 'counter'),
    'vendor NPC must have a stall/counter prop',
  );
  assert.ok(
    npcServicePropParts('healer').some((part) => part.id === 'cross-vertical'),
    'healer NPC must have a readable healing cross prop',
  );
  assert.ok(
    npcServicePropParts('travel').some((part) => part.id === 'portal-glow'),
    'travel NPC must have a portal glow prop',
  );
  assert.ok(
    npcServicePropParts('guard').some((part) => part.id === 'watch-post'),
    'guard NPC must have a readable sentry post prop',
  );
  const vendorCounterPart = npcServicePropParts('vendor').find((part) => part.id === 'counter');
  assert.ok(vendorCounterPart, 'vendor counter prop must exist for service blocking');
  assert.deepEqual(
    npcServicePropPartVisualState({ part: vendorCounterPart, time: 9, active: true }),
    {
      position: vendorCounterPart.position,
      scale: vendorCounterPart.scale,
      rotation: { x: 0, y: 0, z: 0 },
    },
    'blocking vendor counter should not drift with ambient service prop animation',
  );
  const vendorCoinPart = npcServicePropParts('vendor').find((part) => part.id === 'coin-stack');
  assert.ok(vendorCoinPart, 'vendor coin stack prop must exist for ambient shop motion');
  assert.notEqual(
    npcServicePropPartVisualState({ part: vendorCoinPart, time: 0 }).rotation.y,
    npcServicePropPartVisualState({ part: vendorCoinPart, time: 1 }).rotation.y,
    'vendor coin stack should rotate as an ambient shop cue',
  );
  const questSparkPart = npcServicePropParts('quest').find((part) => part.id === 'quest-spark');
  assert.ok(questSparkPart, 'quest spark prop must exist for quest readability');
  assert.notEqual(
    npcServicePropPartVisualState({ part: questSparkPart, time: 0 }).position.y,
    npcServicePropPartVisualState({ part: questSparkPart, time: 0.8 }).position.y,
    'quest spark should bob as an ambient quest cue',
  );
  const portalGlowPart = npcServicePropParts('travel').find((part) => part.id === 'portal-glow');
  assert.ok(portalGlowPart, 'portal glow prop must exist for travel readability');
  assert.ok(
    npcServicePropPartVisualState({ part: portalGlowPart, time: 0, active: true }).scale.y
      > npcServicePropPartVisualState({ part: portalGlowPart, time: 0 }).scale.y,
    'active travel portal glow should pulse stronger than idle ambient glow',
  );
  const trainerBannerPart = npcServicePropParts('trainer').find((part) => part.id === 'banner-cloth');
  assert.ok(trainerBannerPart, 'trainer banner cloth prop must exist for ambient training motion');
  assert.notEqual(
    npcServicePropPartVisualState({ part: trainerBannerPart, time: 0 }).rotation.z,
    npcServicePropPartVisualState({ part: trainerBannerPart, time: 1 }).rotation.z,
    'trainer banner should sway as an ambient service cue',
  );
  const vendorPropBlockers = npcServicePropBlockers({
    kind: 'vendor',
    x: 5.6,
    z: -6.4,
    rotationY: 0,
  });
  assert.equal(vendorPropBlockers.length, 1, 'vendor NPC should expose one ground service-prop blocker');
  assert.deepEqual(
    vendorPropBlockers[0],
    { x: 4.55, z: -5.760000000000001, radius: 0.46 },
    'vendor service prop blocker should be derived from the counter local transform',
  );
  const travelPropBlockers = npcServicePropBlockers({
    kind: 'travel',
    x: 0,
    z: 0,
    rotationY: Math.PI / 2,
  });
  assert.equal(travelPropBlockers.length, 2, 'travel NPC should block both portal pillars but not the portal glow');
  assert.ok(
    travelPropBlockers.every((blocker) => blocker.radius > 0 && Math.hypot(blocker.x, blocker.z) > 0.7),
    'travel service prop blockers must produce real rotated world positions',
  );
  assert.deepEqual(
    npcServicePropVisualState({ time: 1.2 }),
    { scale: 1, lift: 0 },
    'idle NPC service props must stay stable without focus',
  );
  const nearbyProps = npcServicePropVisualState({ nearby: true, time: 0 });
  const selectedProps = npcServicePropVisualState({ selected: true, time: 0 });
  const activeProps = npcServicePropVisualState({ active: true, time: 0 });
  assert.ok(nearbyProps.scale > 1 && nearbyProps.lift > 0, 'nearby NPC service props should lift and grow subtly');
  assert.ok(selectedProps.scale > nearbyProps.scale, 'selected NPC service props should be more prominent than nearby props');
  assert.ok(activeProps.scale > selectedProps.scale, 'active NPC service props should be the strongest visual focus');

  assert.deepEqual(
    npcInteractionTargetDecision({
      nearestPromptNpcId: 'npc-healer-mira',
      selectedNpcId: 'npc-merchant-aran',
      selectedNpcAvailable: true,
      keyboardMovementActive: false,
    }),
    { npcId: 'npc-healer-mira', allowAutomove: true, source: 'prompt' },
    'nearby NPC prompt must keep priority over a different selected NPC target',
  );
  assert.deepEqual(
    npcInteractionTargetDecision({
      nearestPromptNpcId: null,
      selectedNpcId: 'npc-merchant-aran',
      selectedNpcAvailable: true,
      keyboardMovementActive: false,
    }),
    { npcId: 'npc-merchant-aran', allowAutomove: true, source: 'selected' },
    'interact key must start an approach to the selected NPC when keyboard movement is idle',
  );
  assert.deepEqual(
    npcInteractionTargetDecision({
      nearestPromptNpcId: null,
      selectedNpcId: 'npc-merchant-aran',
      selectedNpcAvailable: true,
      keyboardMovementActive: true,
    }),
    { npcId: 'npc-merchant-aran', allowAutomove: false, source: 'selected' },
    'interact key must not start selected-NPC automove while WASD is controlling movement',
  );
  assert.deepEqual(
    npcInteractionTargetDecision({
      nearestPromptNpcId: null,
      selectedNpcId: 'npc-merchant-aran',
      selectedNpcAvailable: false,
      questNpcId: 'npc-travel-edrik',
      keyboardMovementActive: false,
    }),
    { npcId: 'npc-travel-edrik', allowAutomove: true, source: 'quest' },
    'interact key should fall back to the current quest NPC route when no selected NPC is available',
  );
  assert.deepEqual(
    npcInteractionTargetDecision({
      nearestPromptNpcId: null,
      selectedNpcId: 'npc-merchant-aran',
      selectedNpcAvailable: true,
      questNpcId: 'npc-travel-edrik',
      keyboardMovementActive: false,
    }),
    { npcId: 'npc-merchant-aran', allowAutomove: true, source: 'selected' },
    'selected NPC targets should keep priority over the quest route fallback',
  );
  assert.deepEqual(
    npcInteractionTargetDecision({
      nearestPromptNpcId: null,
      selectedNpcId: null,
      selectedNpcAvailable: false,
      questNpcId: 'npc-travel-edrik',
      keyboardMovementActive: true,
    }),
    { npcId: 'npc-travel-edrik', allowAutomove: false, source: 'quest' },
    'quest route fallback must not steal locomotion while WASD is active',
  );
  assert.deepEqual(
    npcInteractionTargetDecision({
      nearestPromptNpcId: null,
      selectedNpcId: 'npc-merchant-aran',
      selectedNpcAvailable: false,
      keyboardMovementActive: false,
    }),
    { npcId: null, allowAutomove: false, source: null },
    'stale selected NPC targets without a quest route must not create interactions',
  );
  assert.equal(
    npcApproachPreviewTargetId({
      hoveredNpcId: 'npc-banker-maelis',
      selectedNpcId: null,
    }),
    'npc-banker-maelis',
    'hovered NPCs should show an approach preview when no stronger target exists',
  );
  assert.equal(
    npcApproachPreviewTargetId({
      hoveredNpcId: 'npc-banker-maelis',
      selectedNpcId: 'npc-merchant-aran',
    }),
    'npc-merchant-aran',
    'selected NPC approach previews should outrank hover previews',
  );
  assert.equal(
    npcApproachPreviewTargetId({
      hoveredNpcId: 'npc-banker-maelis',
      selectedNpcId: 'npc-merchant-aran',
      pendingNpcId: 'npc-merchant-aran',
    }),
    null,
    'active NPC routes should hide idle approach previews',
  );
  assert.equal(
    npcApproachPreviewTargetId({
      hoveredNpcId: 'npc-banker-maelis',
      activeNpcId: 'npc-banker-maelis',
    }),
    null,
    'open NPC service panels should hide idle approach previews',
  );
  assert.equal(
    npcApproachPreviewTargetId({
      selectedNpcId: 'npc-merchant-aran',
      automoveActive: true,
    }),
    null,
    'click-to-move path guidance should own the ground preview while automove is active',
  );
  assert.equal(
    shouldShowNpcApproachPreview({
      targetAvailable: true,
      distanceToNpc: 12,
      interactRange: 2.7,
    }),
    true,
    'far NPC targets should show their approach point preview',
  );
  assert.equal(
    shouldShowNpcApproachPreview({
      targetAvailable: true,
      distanceToNpc: 2.9,
      interactRange: 2.7,
    }),
    false,
    'nearby NPC targets should not need an approach point preview',
  );
  assert.equal(
    shouldShowNpcApproachPreview({
      targetAvailable: false,
      distanceToNpc: 12,
      interactRange: 2.7,
    }),
    false,
    'unavailable NPC targets must hide approach point previews',
  );

  assert.equal(npcPassiveServiceLabel('banker'), 'Banco', 'banker nameplate must advertise stash service');
  assert.equal(npcPassiveServiceLabel('guard'), 'Sentinela', 'guard nameplate must advertise passive sentry role');
  assert.equal(
    npcActionLabel({ kind: 'vendor', zone: 'overworld' }),
    'R Loja',
    'vendor NPC action label must expose the shop keybind',
  );
  assert.equal(
    npcActionLabel({ kind: 'travel', zone: 'dungeon' }),
    'R Retornar',
    'dungeon travel NPC action label must expose the return action',
  );
  assert.equal(
    npcActionLabel({ kind: 'guard', zone: 'overworld' }),
    'R Falar',
    'guard NPC action label must expose passive dialogue instead of a service command',
  );
  assert.equal(
    npcActionLabel({
      kind: 'quest',
      zone: 'overworld',
      quest: { accepted: false, completed: false, rewardClaimed: false },
    }),
    'R Aceitar',
    'new quest NPC action label must invite accepting the quest',
  );
  assert.equal(
    npcActionLabel({
      kind: 'quest',
      zone: 'overworld',
      quest: { accepted: true, completed: true, rewardClaimed: false },
    }),
    'R Recompensa',
    'reward-ready quest NPC action label must invite claiming the reward',
  );
  assert.equal(
    npcActionLabel({ kind: 'banker', zone: 'overworld', pending: true }),
    'Indo ate',
    'pending NPC action label must show the active route instead of a service action',
  );
  assert.equal(
    npcServiceStatusLabel({ kind: 'guard' }),
    'Ronda segura',
    'guard NPC service status should expose passive world state',
  );
  const vendorItems = [
    { id: 'vendor-health-potion', price: 12 },
    { id: 'vendor-starter-sword', price: 85, rarity: 'incomum', stock: 1 },
    { id: 'vendor-jewel-soul', price: 140, rarity: 'raro', stock: 0 },
  ];
  assert.equal(
    vendorRecommendedItemId({ coins: 100, items: vendorItems }),
    'vendor-starter-sword',
    'vendor recommendations should prefer the highest-value affordable available item',
  );
  assert.equal(
    vendorOfferModel({ coins: 100, items: vendorItems, item: vendorItems[1] }).badgeLabel,
    'Sugerido',
    'affordable recommended vendor item should receive a suggested badge',
  );
  assert.deepEqual(
    vendorOfferModel({ coins: 8, items: vendorItems, item: vendorItems[0] }),
    {
      id: 'vendor-health-potion',
      soldOut: false,
      affordable: false,
      missingCoins: 4,
      metaLabel: '12 moedas',
      statusLabel: 'Faltam 4 moedas',
      badgeLabel: 'Proxima',
      tone: 'save-up',
    },
    'vendor offer model should show the next purchase target when the player is short on coins',
  );
  assert.equal(
    vendorOfferModel({ coins: 300, items: vendorItems, item: vendorItems[2] }).tone,
    'sold-out',
    'sold-out limited vendor items should not be recommended even if the player can pay',
  );
  const guideNpcs = [
    { id: 'npc-guard-kael', kind: 'guard', zone: 'overworld' },
    { id: 'npc-travel-edrik', kind: 'travel', zone: 'overworld' },
    { id: 'npc-travel-riven', kind: 'travel', zone: 'dungeon' },
  ];
  assert.equal(
    npcGuideTargetNpcId({ sourceKind: 'guard', zone: 'overworld', npcs: guideNpcs }),
    'npc-travel-edrik',
    'guard guide dialogue should route overworld players to the portal NPC',
  );
  assert.equal(
    npcGuideTargetNpcId({ sourceKind: 'guard', zone: 'dungeon', npcs: guideNpcs }),
    'npc-travel-riven',
    'guard guide dialogue should choose the travel NPC in the active zone',
  );
  assert.equal(
    npcGuideTargetNpcId({ sourceKind: 'vendor', zone: 'overworld', npcs: guideNpcs }),
    null,
    'non-guide service NPCs must not hijack passive guard routing',
  );
  assert.equal(
    npcQuestStateLabel({ accepted: false, completed: false, rewardClaimed: false }),
    'Missao disponivel',
    'unaccepted quest NPCs must advertise an available quest',
  );
  assert.equal(
    npcQuestStateLabel({ accepted: true, completed: true, rewardClaimed: false }),
    'Recompensa pronta',
    'completed quest NPCs must advertise a ready reward',
  );
  assert.deepEqual(
    npcQuestMarkerModel({ accepted: false, completed: false, rewardClaimed: false }),
    { marker: '!', label: 'Missao disponivel', tone: 'quest-new', actionable: true },
    'available quest NPCs must use the classic MMORPG exclamation marker',
  );
  assert.deepEqual(
    npcQuestMarkerModel({ accepted: true, completed: false, rewardClaimed: false }),
    { marker: '...', label: 'Missao em andamento', tone: 'quest-progress', actionable: false },
    'in-progress quest NPCs must not look reward-ready',
  );
  assert.deepEqual(
    npcQuestMarkerModel({ accepted: true, completed: true, rewardClaimed: false }),
    { marker: '?', label: 'Recompensa pronta', tone: 'quest-ready', actionable: true },
    'reward-ready quest NPCs must use the classic MMORPG question marker',
  );
  assert.deepEqual(
    npcQuestMarkerModel({ accepted: true, completed: true, rewardClaimed: true }),
    { marker: 'OK', label: 'Concluida', tone: 'quest-done', actionable: false },
    'finished quest NPCs must downgrade to a completed marker',
  );
  const questNavigationNpcs = [
    { id: 'npc-quest-lyra', kind: 'quest', zone: 'overworld' },
    { id: 'npc-travel-edrik', kind: 'travel', zone: 'overworld' },
    { id: 'npc-travel-riven', kind: 'travel', zone: 'dungeon' },
  ];
  assert.equal(
    questNavigationTargetNpcId({
      quest: { accepted: false, completed: false, rewardClaimed: false, progress: 0, goal: 1 },
      zone: 'overworld',
      npcs: questNavigationNpcs,
    }),
    'npc-quest-lyra',
    'quest tracker navigation should route new quests to the quest giver',
  );
  assert.equal(
    questNavigationTargetNpcId({
      quest: { accepted: true, completed: false, rewardClaimed: false, progress: 2, goal: 4 },
      zone: 'overworld',
      npcs: questNavigationNpcs,
    }),
    null,
    'quest tracker navigation should stay idle while the local kill objective is active',
  );
  assert.equal(
    questNavigationTargetNpcId({
      quest: { accepted: true, completed: false, rewardClaimed: false, progress: 4, goal: 4 },
      zone: 'overworld',
      npcs: questNavigationNpcs,
    }),
    'npc-travel-edrik',
    'quest tracker navigation should route overworld travel steps to the portal NPC',
  );
  assert.equal(
    questNavigationTargetNpcId({
      quest: { accepted: true, completed: true, rewardClaimed: false, progress: 6, goal: 6 },
      zone: 'overworld',
      npcs: questNavigationNpcs,
    }),
    'npc-quest-lyra',
    'quest tracker navigation should route completed quests back to the quest giver',
  );
  assert.equal(
    questNavigationTargetNpcId({
      quest: { accepted: true, completed: true, rewardClaimed: false, progress: 6, goal: 6 },
      zone: 'dungeon',
      npcs: questNavigationNpcs,
    }),
    'npc-travel-riven',
    'quest tracker navigation should route completed dungeon quests to the return NPC first',
  );
  assert.equal(
    questNavigationTargetNpcId({
      quest: { accepted: true, completed: true, rewardClaimed: true, progress: 6, goal: 6 },
      zone: 'overworld',
      npcs: questNavigationNpcs,
    }),
    null,
    'quest tracker navigation should disable after the reward is claimed',
  );
  assert.equal(
    questNavigationHoverNpcId('npc-travel-edrik', true),
    'npc-travel-edrik',
    'quest tracker hover should expose the routed NPC for linked world focus',
  );
  assert.equal(
    questNavigationHoverNpcId('npc-travel-edrik', false),
    null,
    'quest tracker hover should clear linked NPC focus on leave',
  );
  assert.equal(
    questNavigationHoverNpcId(null, true),
    null,
    'quest tracker hover should be empty-safe when no route is actionable',
  );
  assert.equal(
    questTrackerRouteLabel({ kind: 'quest', name: 'Lyra', title: 'Guia de Missoes' }),
    'Fale com Lyra - Guia de Missoes',
    'quest tracker route label should name quest NPC contacts directly',
  );
  assert.equal(
    questTrackerRouteLabel({ kind: 'travel', name: 'Edrik', title: 'Guardiao do Portal' }),
    'Siga ate Edrik - Guardiao do Portal',
    'quest tracker route label should name travel NPC contacts as route steps',
  );
  assert.equal(
    questTrackerRouteLabel(null),
    '',
    'quest tracker route label should stay empty when no NPC route is active',
  );
  assert.deepEqual(
    questDialogueActionDecision(
      { accepted: false, completed: false, rewardClaimed: false },
      'npc-quest-lyra',
    ),
    { action: 'accept', targetNpcId: null },
    'quest dialogue action must accept new quests instead of routing away',
  );
  assert.deepEqual(
    questDialogueActionDecision(
      { accepted: true, completed: true, rewardClaimed: false },
      'npc-travel-edrik',
    ),
    { action: 'claim', targetNpcId: null },
    'quest dialogue action must claim ready rewards before tracking any route',
  );
  assert.deepEqual(
    questDialogueActionDecision(
      { accepted: true, completed: false, rewardClaimed: false },
      'npc-travel-edrik',
    ),
    { action: 'track', targetNpcId: 'npc-travel-edrik' },
    'quest dialogue follow action should route to the current NPC objective when one exists',
  );
  assert.equal(
    questDialogueActionLabel(
      { accepted: true, completed: false, rewardClaimed: false },
      'npc-travel-edrik',
      'Acompanhar',
    ),
    'Ir para objetivo',
    'quest dialogue label should update when the accepted quest gains an NPC route',
  );
  assert.equal(
    questDialogueActionLabel(
      { accepted: true, completed: false, rewardClaimed: false },
      null,
      'Acompanhar',
    ),
    'Acompanhar',
    'quest dialogue label should keep the fallback while the active objective is local combat',
  );
  assert.deepEqual(
    questDialogueActionDecision(
      { accepted: true, completed: false, rewardClaimed: false },
      null,
    ),
    { action: 'close', targetNpcId: null },
    'quest dialogue follow action should close when the active objective is local combat',
  );
  assert.deepEqual(
    questDialogueActionDecision(
      { accepted: true, completed: true, rewardClaimed: true },
      'npc-quest-lyra',
    ),
    { action: 'close', targetNpcId: null },
    'quest dialogue action should close after the reward is already claimed',
  );
  assert.deepEqual(
    npcNameplateModel({
      kind: 'quest',
      name: 'Lyra',
      title: 'Guia de Missoes',
      marker: '?',
      distanceLabel: '4m',
      quest: { accepted: true, completed: true, rewardClaimed: false },
    }),
    {
      marker: '?',
      name: 'Lyra',
      detail: 'Guia de Missoes - 4m',
      state: 'Recompensa pronta',
      tone: 'quest-ready',
      focused: false,
      visible: true,
      compact: false,
    },
    'quest nameplate must expose reward-ready state and distance',
  );
  assert.deepEqual(
    npcNameplateModel({
      kind: 'quest',
      name: 'Lyra',
      title: 'Guia de Missoes',
      marker: '...',
      distanceLabel: '6m',
      quest: { accepted: true, completed: false, rewardClaimed: false },
    }),
    {
      marker: '...',
      name: 'Lyra',
      detail: 'Guia de Missoes - 6m',
      state: 'Missao em andamento',
      tone: 'quest-progress',
      focused: false,
      visible: true,
      compact: false,
    },
    'in-progress quest nameplates must be visually distinct from new and reward-ready states',
  );
  assert.deepEqual(
    npcNameplateModel({
      kind: 'vendor',
      name: 'Aran',
      title: 'Mercador',
      marker: '$',
      distanceLabel: '12m',
      pending: true,
      focused: true,
    }),
    {
      marker: '$',
      name: 'Aran',
      detail: 'Mercador - 12m',
      state: 'Indo ate',
      tone: 'pending',
      focused: true,
      visible: true,
      compact: false,
    },
    'pending NPC route must override passive service text in the world nameplate',
  );
  assert.deepEqual(
    npcNameplateModel({
      kind: 'vendor',
      name: 'Aran',
      title: 'Mercador',
      marker: '$',
      distance: 2,
      distanceLabel: 'Perto',
      serviceLabel: '2/4 compraveis',
      actionLabel: 'R Loja',
      nearby: true,
      focused: true,
    }),
    {
      marker: '$',
      name: 'Aran',
      detail: 'Mercador - Perto',
      state: 'R Loja',
      tone: 'nearby',
      focused: true,
      visible: true,
      compact: false,
    },
    'nearby NPC nameplates should show the actual interaction keybind in world space',
  );
  assert.deepEqual(
    npcNameplateModel({
      kind: 'trainer',
      name: 'Toren',
      title: 'Treinador',
      marker: 'T',
      distanceLabel: '7m',
      serviceLabel: '3 pontos',
      selected: true,
    }),
    {
      marker: 'T',
      name: 'Toren',
      detail: 'Treinador - 7m',
      state: '3 pontos',
      tone: 'selected',
      focused: false,
      visible: true,
      compact: false,
    },
    'service NPC nameplates should expose actionable service state',
  );
  assert.deepEqual(
    npcNameplateModel({
      kind: 'vendor',
      name: 'Aran',
      title: 'Mercador',
      marker: '$',
      distance: 16,
      distanceLabel: '16m',
      serviceLabel: '2/4 compraveis',
      actionLabel: 'R Aproximar',
      selected: true,
    }),
    {
      marker: '$',
      name: 'Aran',
      detail: 'Mercador - 16m',
      state: 'R Aproximar',
      tone: 'selected',
      focused: false,
      visible: true,
      compact: true,
    },
    'selected far NPC nameplates should show the approach keybind instead of a passive service label',
  );
  assert.deepEqual(
    npcNameplateModel({
      kind: 'banker',
      name: 'Maelis',
      title: 'Banqueira',
      marker: 'B',
      distance: 22,
      distanceLabel: '22m',
      serviceLabel: '5 guardados',
      actionLabel: 'Clique Aproximar',
      hovered: true,
      focused: true,
    }),
    {
      marker: 'B',
      name: 'Maelis',
      detail: 'Banqueira - 22m',
      state: 'Clique Aproximar',
      tone: 'hovered',
      focused: true,
      visible: true,
      compact: false,
    },
    'hovered NPC nameplates should preview click-to-approach without selecting the NPC',
  );
  assert.deepEqual(
    npcNameplateModel({
      kind: 'travel',
      name: 'Edrik',
      title: 'Guardiao do Portal',
      marker: '>',
      distance: 32,
      distanceLabel: '32m',
      serviceLabel: 'Para dungeon',
      objective: true,
      focused: true,
    }),
    {
      marker: '>',
      name: 'Edrik',
      detail: 'Guardiao do Portal - 32m',
      state: 'Objetivo',
      tone: 'objective',
      focused: true,
      visible: true,
      compact: false,
    },
    'quest objective NPC nameplates should stay visible in world space from far away',
  );
  assert.deepEqual(
    npcNameplateModel({
      kind: 'banker',
      name: 'Maelis',
      title: 'Banqueira',
      marker: 'B',
      distance: 20,
      distanceLabel: '20m',
    }),
    {
      marker: 'B',
      name: 'Maelis',
      detail: 'Banqueira - 20m',
      state: 'Banco',
      tone: 'banker',
      focused: false,
      visible: true,
      compact: true,
    },
    'mid-distance NPC nameplates should stay visible but compact',
  );
  assert.equal(
    npcNameplateModel({
      kind: 'vendor',
      name: 'Aran',
      title: 'Mercador',
      marker: '$',
      distance: 40,
      distanceLabel: '40m',
    }).visible,
    false,
    'far passive service NPC nameplates should hide to reduce town clutter',
  );

  assert.equal(
    pendingInteractionDecision({
      playerReady: false,
      targetAvailable: true,
      distanceToTarget: 1,
      range: 2.7,
    }),
    'cancel',
    'pending interactions must cancel when the local player is not ready',
  );
  assert.equal(
    pendingInteractionDecision({
      playerReady: true,
      targetAvailable: false,
      distanceToTarget: 1,
      range: 2.7,
    }),
    'cancel',
    'pending interactions must cancel when their target disappeared',
  );
  assert.equal(
    pendingInteractionDecision({
      playerReady: true,
      targetAvailable: true,
      distanceToTarget: 4.1,
      range: 2.7,
    }),
    'wait',
    'pending interactions must keep walking while outside interaction range',
  );
  assert.equal(
    pendingInteractionDecision({
      playerReady: true,
      targetAvailable: true,
      distanceToTarget: Infinity,
      range: 2.7,
    }),
    'cancel',
    'pending interactions must cancel when distance cannot be resolved',
  );
  assert.equal(
    pendingInteractionDecision({
      playerReady: true,
      targetAvailable: true,
      distanceToTarget: 2.7,
      range: 2.7,
    }),
    'trigger',
    'pending interactions must trigger as soon as the player reaches interaction range',
  );
  assert.equal(
    pendingInteractionDecision({
      playerReady: true,
      targetAvailable: true,
      distanceToTarget: 2.55,
      range: 2.7,
      distanceToApproachTarget: 1.1,
      approachRange: 0.57,
    }),
    'wait',
    'NPC pending interactions must keep walking until the chosen approach point is reached',
  );
  assert.equal(
    pendingInteractionDecision({
      playerReady: true,
      targetAvailable: true,
      distanceToTarget: 2.55,
      range: 2.7,
      distanceToApproachTarget: 0.5,
      approachRange: 0.57,
    }),
    'trigger',
    'NPC pending interactions should open once range and approach arrival are both satisfied',
  );
  assert.equal(
    pendingInteractionDecision({
      playerReady: true,
      targetAvailable: true,
      distanceToTarget: 2.55,
      range: 2.7,
      approachRange: 0.57,
    }),
    'cancel',
    'NPC approach-gated interactions must cancel when their approach distance cannot be resolved',
  );
  assert.equal(
    pendingInteractionRetryDecision({
      decision: 'wait',
      kind: 'npc',
      automoveActive: false,
      now: 2,
      lastRetryAt: 1,
      retryInterval: 0.35,
      distanceToApproachTarget: 1.1,
      approachRange: 0.57,
    }),
    'retry',
    'stalled NPC pending interactions should restart approach movement after the retry interval',
  );
  assert.equal(
    pendingInteractionRetryDecision({
      decision: 'wait',
      kind: 'npc',
      automoveActive: true,
      now: 2,
      distanceToApproachTarget: 1.1,
      approachRange: 0.57,
    }),
    'wait',
    'NPC pending interactions must not restart while automove is already active',
  );
  assert.equal(
    pendingInteractionRetryDecision({
      decision: 'wait',
      kind: 'npc',
      automoveActive: false,
      now: 1.2,
      lastRetryAt: 1,
      retryInterval: 0.35,
      distanceToApproachTarget: 1.1,
      approachRange: 0.57,
    }),
    'wait',
    'NPC pending interaction retries should be throttled',
  );
  assert.equal(
    pendingInteractionRetryDecision({
      decision: 'wait',
      kind: 'loot',
      automoveActive: false,
      now: 2,
      distanceToApproachTarget: 1.1,
      approachRange: 0.57,
    }),
    'wait',
    'only NPC approach interactions should use the stalled route retry',
  );
  assert.deepEqual(
    playerIntentCancelPlan({
      automoveActive: false,
      npcPanelOpen: false,
      enemySelected: false,
    }),
    { handled: false, clearAutomove: false, closeNpcPanels: false, clearAutorun: false, clearEnemy: false, clearNpcSelection: false },
    'Escape cancel must be a no-op when the player has no active target or automove',
  );
  assert.deepEqual(
    playerIntentCancelPlan({
      automoveActive: true,
      npcPanelOpen: true,
      enemySelected: false,
      npcSelected: true,
    }),
    { handled: true, clearAutomove: true, closeNpcPanels: true, clearAutorun: false, clearEnemy: false, clearNpcSelection: true },
    'Escape cancel must clear NPC automove and open NPC panels together',
  );
  assert.deepEqual(
    playerIntentCancelPlan({
      automoveActive: false,
      autorunActive: true,
      npcPanelOpen: false,
      enemySelected: false,
    }),
    { handled: true, clearAutomove: false, closeNpcPanels: false, clearAutorun: true, clearEnemy: false, clearNpcSelection: false },
    'Escape cancel must stop MMORPG autorun even without a selected target',
  );
  assert.deepEqual(
    playerIntentCancelPlan({
      automoveActive: false,
      npcPanelOpen: false,
      enemySelected: true,
    }),
    { handled: true, clearAutomove: false, closeNpcPanels: false, clearAutorun: false, clearEnemy: true, clearNpcSelection: false },
    'Escape cancel must clear combat target selection when there is no NPC intent',
  );
  assert.deepEqual(
    playerIntentCancelPlan({
      automoveActive: false,
      npcPanelOpen: false,
      enemySelected: false,
      npcSelected: true,
    }),
    { handled: true, clearAutomove: false, closeNpcPanels: false, clearAutorun: false, clearEnemy: false, clearNpcSelection: true },
    'Escape cancel must clear a selected NPC target even without an active route',
  );
  assert.deepEqual(
    npcTargetFrameModel({
      kind: 'vendor',
      name: 'Aran',
      title: 'Mercador',
      marker: '$',
      distanceLabel: '12m',
      pending: true,
    }),
    {
      name: 'Aran',
      marker: '$',
      subtitle: 'Mercador - 12m',
      status: 'Indo ate',
      tone: 'pending',
    },
    'pending NPC target frame must show the current route target',
  );
  assert.deepEqual(
    npcTargetFrameModel({
      kind: 'guard',
      name: 'Kael',
      title: 'Sentinela',
      marker: 'G',
      serviceLabel: 'Ronda segura',
      distanceLabel: 'Perto',
      nearby: true,
      actionLabel: 'R Falar',
    }),
    {
      name: 'Kael',
      marker: 'G',
      subtitle: 'Sentinela - Ronda segura - Perto',
      status: 'R Falar',
      tone: 'nearby',
    },
    'passive guard NPCs must target like a dialogue NPC instead of a shop service',
  );
  const farVendorTarget = npcTargetFrameModel({
    kind: 'vendor',
    name: 'Aran',
    title: 'Mercador',
    marker: '$',
    distanceLabel: '12m',
    pending: true,
  });
  const nearVendorTarget = npcTargetFrameModel({
    kind: 'vendor',
    name: 'Aran',
    title: 'Mercador',
    marker: '$',
    distanceLabel: '11m',
    pending: true,
  });
  assert.notEqual(
    npcTargetFrameRenderKey('npc-merchant-aran', farVendorTarget),
    npcTargetFrameRenderKey('npc-merchant-aran', nearVendorTarget),
    'npc target frame render key must change as route distance changes',
  );
  assert.deepEqual(
    npcTargetFrameInteractionDecision({
      npcTargetId: 'npc-merchant-aran',
      keyboardMovementActive: false,
    }),
    { npcId: 'npc-merchant-aran', allowAutomove: true },
    'NPC target frame clicks should start the same approach flow when movement is idle',
  );
  assert.deepEqual(
    npcTargetFrameInteractionDecision({
      npcTargetId: 'npc-merchant-aran',
      keyboardMovementActive: true,
    }),
    { npcId: 'npc-merchant-aran', allowAutomove: false },
    'NPC target frame clicks must not steal locomotion while WASD is active',
  );
  assert.deepEqual(
    npcTargetFrameInteractionDecision({ npcTargetId: null }),
    { npcId: null, allowAutomove: false },
    'NPC target frame interaction must be empty-safe for non-NPC target frames',
  );
  assert.deepEqual(
    npcTargetFrameModel({
      kind: 'banker',
      name: 'Maelis',
      title: 'Banqueira',
      marker: 'B',
      distanceLabel: 'Perto',
      active: true,
    }),
    {
      name: 'Maelis',
      marker: 'B',
      subtitle: 'Banqueira - Perto',
      status: 'Servico aberto',
      tone: 'active',
    },
    'open NPC service panels must keep the NPC visible in the target frame',
  );
  assert.equal(
    npcTargetFrameModel({
      kind: 'quest',
      name: 'Lyra',
      title: 'Guia de Missoes',
      marker: '?',
      quest: { accepted: true, completed: true, rewardClaimed: false },
    }).status,
    'Recompensa pronta',
    'quest NPC target frame must surface reward-ready state',
  );
  assert.deepEqual(
    npcTargetFrameModel({
      kind: 'quest',
      name: 'Lyra',
      title: 'Guia de Missoes',
      marker: '...',
      quest: { accepted: true, completed: false, rewardClaimed: false },
    }),
    {
      name: 'Lyra',
      marker: '...',
      subtitle: 'Guia de Missoes',
      status: 'Missao em andamento',
      tone: 'quest-progress',
    },
    'quest NPC target frame must show the in-progress quest marker state',
  );
  assert.deepEqual(
    npcTargetFrameModel({
      kind: 'vendor',
      name: 'Aran',
      title: 'Mercador',
      marker: '$',
      distanceLabel: '9m',
      serviceLabel: '2/4 compraveis',
      actionLabel: 'R Aproximar',
      selected: true,
    }),
    {
      name: 'Aran',
      marker: '$',
      subtitle: 'Mercador - 2/4 compraveis - 9m',
      status: 'R Aproximar',
      tone: 'selected',
    },
    'selected far NPC target frame must expose the approach action without pretending a route is active',
  );
  assert.deepEqual(
    npcTargetFrameModel({
      kind: 'banker',
      name: 'Maelis',
      title: 'Banqueira',
      marker: 'B',
      distanceLabel: '18m',
      serviceLabel: '5 guardados',
      actionLabel: 'Clique Aproximar',
      hovered: true,
    }),
    {
      name: 'Maelis',
      marker: 'B',
      subtitle: 'Banqueira - 5 guardados - 18m',
      status: 'Clique Aproximar',
      tone: 'hovered',
    },
    'hovered far NPC target frame must preview click-to-approach without selecting the NPC',
  );
  assert.deepEqual(
    npcTargetFrameModel({
      kind: 'healer',
      name: 'Mira',
      title: 'Curandeira',
      marker: '+',
      distanceLabel: 'Perto',
      serviceLabel: '18 moedas',
      actionLabel: 'R Curar',
      hovered: true,
      nearby: true,
    }),
    {
      name: 'Mira',
      marker: '+',
      subtitle: 'Curandeira - 18 moedas - Perto',
      status: 'R Curar',
      tone: 'nearby',
    },
    'hovered nearby NPC target frame must still expose the concrete service action',
  );
  assert.deepEqual(
    npcTargetFrameModel({
      kind: 'vendor',
      name: 'Aran',
      title: 'Mercador',
      marker: '$',
      distanceLabel: 'Perto',
      serviceLabel: '2/4 compraveis',
      actionLabel: 'R Loja',
      selected: true,
      nearby: true,
    }),
    {
      name: 'Aran',
      marker: '$',
      subtitle: 'Mercador - 2/4 compraveis - Perto',
      status: 'R Loja',
      tone: 'nearby',
    },
    'selected nearby NPC target frame must expose the concrete service action',
  );
  assert.equal(
    npcTargetFrameModel({
      kind: 'banker',
      name: 'Maelis',
      title: 'Banqueira',
      marker: 'B',
      distanceLabel: 'Perto',
      serviceLabel: '5 itens guardados',
      active: true,
    }).subtitle,
    'Banqueira - 5 itens guardados - Perto',
    'NPC target frame subtitle must include live service state',
  );

  assert.equal(
    npcServiceStatusLabel({ kind: 'vendor', vendorAvailableItems: 4, vendorAffordableItems: 2 }),
    '2/4 compraveis',
    'vendor service state should summarize available and affordable stock',
  );
  assert.equal(
    npcServiceStatusLabel({ kind: 'healer', healer: { needsService: true, canPay: false, cost: 18 } }),
    'Sem moedas',
    'healer service state should report when the player cannot pay',
  );
  assert.equal(
    npcServiceStatusLabel({ kind: 'trainer', trainer: { unspentPoints: 1 } }),
    '1 ponto',
    'trainer service state should surface available attribute points',
  );
  assert.equal(
    npcServiceStatusLabel({ kind: 'jeweler', jeweler: { blessCount: 2, requiredBless: 3 } }),
    'Bless 2/3',
    'jeweler service state should show transmutation progress',
  );
  assert.equal(
    npcServiceStatusLabel({ kind: 'banker', banker: { stashItems: 6 } }),
    '6 itens guardados',
    'banker service state should summarize stash contents',
  );
  assert.ok(
    npcServicePriorityScore({ kind: 'quest', quest: { accepted: true, completed: true, rewardClaimed: false } })
      > npcServicePriorityScore({ kind: 'vendor', vendorAvailableItems: 4, vendorAffordableItems: 4 }),
    'reward-ready quest NPCs should outrank normal shopping opportunities',
  );
  assert.ok(
    npcServicePriorityScore({ kind: 'healer', healer: { needsService: true, canPay: true } })
      > npcServicePriorityScore({ kind: 'healer', healer: { needsService: false, canPay: true } }),
    'healer priority should rise only when the player needs the service',
  );
  assert.equal(
    npcServicePriorityScore({ kind: 'travel', questRouteTarget: true }),
    100,
    'NPCs targeted by quest routing should become the top idle service destination',
  );

  const sorted = sortNpcServiceDestinations([
    { id: 'vendor', name: 'Aran', distance: 3 },
    { id: 'trainer', name: 'Toren', distance: 8, selected: true },
    { id: 'healer', name: 'Mira', distance: 2, nearby: true },
    { id: 'banker', name: 'Maelis', distance: 12, pending: true },
    { id: 'jeweler', name: 'Selene', distance: 1 },
    { id: 'stash', name: 'Cofre', distance: 20, active: true },
  ]);
  assert.deepEqual(
    sorted.map((destination) => destination.id),
    ['stash', 'banker', 'trainer', 'healer', 'jeweler', 'vendor'],
    'npc service directory must prioritize open panel, active route, selected target, nearby NPCs, then distance',
  );
  const prioritySorted = sortNpcServiceDestinations([
    { id: 'vendor', name: 'Aran', distance: 1, priority: 56 },
    { id: 'quest', name: 'Lyra', distance: 18, priority: 92 },
    { id: 'travel', name: 'Edrik', distance: 9, priority: 100 },
    { id: 'banker', name: 'Maelis', distance: 2, priority: 14, active: true },
  ]);
  assert.deepEqual(
    prioritySorted.map((destination) => destination.id),
    ['banker', 'travel', 'quest', 'vendor'],
    'npc service directory priority should guide idle rows while preserving open panels first',
  );
  const hoverSorted = sortNpcServiceDestinations([
    { id: 'vendor', name: 'Aran', distance: 3, hovered: true },
    { id: 'healer', name: 'Mira', distance: 2 },
  ]);
  assert.deepEqual(
    hoverSorted.map((destination) => destination.id),
    ['healer', 'vendor'],
    'npc service directory hover should highlight rows without reordering distance navigation',
  );
  const cycleCandidates = [
    { id: 'vendor', name: 'Aran', zone: 'overworld', distance: 3 },
    { id: 'healer', name: 'Mira', zone: 'overworld', distance: 2 },
    { id: 'banker', name: 'Maelis', zone: 'overworld', distance: 12 },
    { id: 'return', name: 'Riven', zone: 'dungeon', distance: 1 },
  ];
  assert.equal(
    nextNpcSelectionId(cycleCandidates, null, 'overworld', 1),
    'healer',
    'NPC target cycling should begin with the nearest visible NPC in the current zone',
  );
  assert.equal(
    nextNpcSelectionId(cycleCandidates, 'healer', 'overworld', 1),
    'vendor',
    'Tab should advance to the next NPC without changing zones',
  );
  assert.equal(
    nextNpcSelectionId(cycleCandidates, 'healer', 'overworld', -1),
    'banker',
    'Shift+Tab should wrap to the previous NPC in the current zone',
  );
  assert.equal(
    nextNpcSelectionId(cycleCandidates, null, 'dungeon', 1),
    'return',
    'NPC target cycling should respect the current world zone',
  );
  assert.equal(
    nextNpcSelectionId([], null, 'overworld', 1),
    null,
    'NPC target cycling should be empty-safe',
  );
  assert.equal(
    nextNpcSelectionId([
      { id: 'vendor', name: 'Aran', zone: 'overworld', distance: 3 },
      { id: 'trainer', name: 'Toren', zone: 'overworld', distance: 8, selected: true },
      { id: 'healer', name: 'Mira', zone: 'overworld', distance: 2, nearby: true },
    ], 'trainer', 'overworld', 1),
    'healer',
    'NPC target cycling should not get trapped by the currently selected row priority',
  );
  assert.equal(
    npcServiceDestinationSubtitle({ title: 'Banqueira', distanceLabel: 'Perto', active: true }),
    'Aberto - Banqueira - Perto',
    'active NPC service destination must show that its service panel is open',
  );
  assert.equal(
    npcServiceDestinationSubtitle({ title: 'Banqueira', distanceLabel: '12m', pending: true }),
    'Indo - Banqueira - 12m',
    'pending NPC service destination must show that the route is active',
  );
  assert.equal(
    npcServiceDestinationSubtitle({ title: 'Curandeira', distanceLabel: 'Perto' }),
    'Curandeira - Perto',
    'nearby NPC service destination must keep the compact title and distance',
  );
  assert.equal(
    npcServiceDestinationSubtitle({ title: 'Mercador', statusLabel: '2/4 compraveis', distanceLabel: '8m' }),
    'Mercador - 2/4 compraveis - 8m',
    'service directory subtitles must include live service state before distance',
  );
  assert.equal(
    npcServiceDestinationSubtitle({ title: 'Guardiao do Portal', statusLabel: 'Para dungeon', distanceLabel: '9m', objective: true }),
    'Objetivo - Guardiao do Portal - Para dungeon - 9m',
    'quest-route NPC service destination must be labeled as the current objective',
  );
  assert.equal(
    npcServiceDestinationSubtitle({ title: 'Mercador', statusLabel: '2/4 compraveis', distanceLabel: '8m', selected: true, objective: true }),
    'Alvo - Mercador - 2/4 compraveis - 8m',
    'selected NPC service destination must outrank objective labeling',
  );
}

{
  const direct = samplePathGuidancePoints(
    { x: 0, y: 0, z: 0 },
    [{ x: 0, y: 0, z: 10 }],
    3,
    5,
  );
  assert.deepEqual(
    direct.map((point) => ({ z: point.z, terminal: point.terminal })),
    [
      { z: 3, terminal: false },
      { z: 6, terminal: false },
      { z: 9, terminal: false },
      { z: 10, terminal: true },
    ],
    'path guidance must sample direct click routes and keep the final destination visible',
  );

  const curved = samplePathGuidancePoints(
    { x: 0, y: 0, z: 0 },
    [{ x: 0, y: 0, z: 4 }, { x: 3, y: 0, z: 4 }],
    2,
    3,
  );
  assert.deepEqual(
    curved.map((point) => ({ x: point.x, z: point.z, terminal: point.terminal })),
    [
      { x: 0, z: 2, terminal: false },
      { x: 0, z: 4, terminal: false },
      { x: 3, z: 4, terminal: true },
    ],
    'path guidance must follow local NPC detours without dropping the final marker',
  );

  const npcPreviewPath = samplePathGuidancePoints(
    { x: 0, y: 0, z: 0 },
    [{ x: 0, y: 0, z: 3 }, { x: 4, y: 0, z: 3 }, { x: 4, y: 0, z: 6 }],
    2.35,
    8,
  );
  assert.equal(npcPreviewPath.at(-1)?.terminal, true, 'NPC approach preview path must keep the approach point visible');
  assert.ok(npcPreviewPath.length <= 8, 'NPC approach preview path must stay compact enough for hover preview');
}

{
  assert.equal(
    npcHoverFocusTargetId({
      pointerNpcId: 'npc-merchant-aran',
      serviceNpcId: null,
    }),
    'npc-merchant-aran',
    'world pointer hover should drive NPC focus when the service list is idle',
  );
  assert.equal(
    npcHoverFocusTargetId({
      pointerNpcId: 'npc-merchant-aran',
      serviceNpcId: 'npc-banker-maelis',
    }),
    'npc-banker-maelis',
    'service directory hover should outrank world pointer hover for linked NPC focus',
  );
  assert.equal(
    npcHoverFocusTargetId({
      pointerNpcId: 'npc-merchant-aran',
      targetFrameNpcId: 'npc-healer-mira',
    }),
    'npc-healer-mira',
    'NPC target frame hover should drive linked NPC focus over world pointer hover',
  );
  assert.equal(
    npcHoverFocusTargetId({
      pointerNpcId: 'npc-merchant-aran',
      targetFrameNpcId: 'npc-healer-mira',
      serviceNpcId: 'npc-banker-maelis',
    }),
    'npc-banker-maelis',
    'service directory hover should outrank target frame hover when both are active',
  );
  assert.equal(
    npcHoverFocusTargetId({
      pointerNpcId: null,
      serviceNpcId: null,
    }),
    null,
    'NPC hover focus should clear when neither world nor service directory is hovered',
  );
  assert.deepEqual(
    npcVisualFocusState({
      npcId: 'npc-merchant-aran',
      pendingNpcId: 'npc-merchant-aran',
      activeNpcId: null,
      distanceToPlayer: 18,
      interactRange: 2.6,
    }),
    { selected: false, pending: true, active: false, hovered: false, objective: false, nearby: false, focused: true, destination: true },
    'pending NPC route must be rendered as the current destination even from far away',
  );
  assert.deepEqual(
    npcVisualFocusState({
      npcId: 'npc-merchant-aran',
      selectedNpcId: 'npc-merchant-aran',
      pendingNpcId: null,
      activeNpcId: null,
      distanceToPlayer: 18,
      interactRange: 2.6,
    }),
    { selected: true, pending: false, active: false, hovered: false, objective: false, nearby: false, focused: true, destination: false },
    'selected NPC targets should be focused without being rendered as an automove destination',
  );
  assert.deepEqual(
    npcVisualFocusState({
      npcId: 'npc-trainer-toren',
      pendingNpcId: null,
      activeNpcId: 'npc-trainer-toren',
      distanceToPlayer: 2.4,
      interactRange: 2.7,
    }),
    { selected: false, pending: false, active: true, hovered: false, objective: false, nearby: true, focused: true, destination: true },
    'open NPC service panels must keep the NPC highlighted as the active destination',
  );
  assert.deepEqual(
    npcVisualFocusState({
      npcId: 'npc-healer-mira',
      pendingNpcId: null,
      activeNpcId: null,
      distanceToPlayer: 2.9,
      interactRange: 2.7,
    }),
    { selected: false, pending: false, active: false, hovered: false, objective: false, nearby: true, focused: true, destination: false },
    'nearby NPC prompts should focus the NPC without using the destination highlight',
  );
  assert.deepEqual(
    npcVisualFocusState({
      npcId: 'npc-banker-maelis',
      hoveredNpcId: 'npc-banker-maelis',
      pendingNpcId: null,
      activeNpcId: null,
      distanceToPlayer: 18,
      interactRange: 2.7,
    }),
    { selected: false, pending: false, active: false, hovered: true, objective: false, nearby: false, focused: true, destination: false },
    'hovered NPCs should receive visual focus without becoming automove destinations',
  );
  assert.deepEqual(
    npcVisualFocusState({
      npcId: 'npc-travel-edrik',
      objectiveNpcId: 'npc-travel-edrik',
      pendingNpcId: null,
      activeNpcId: null,
      distanceToPlayer: 30,
      interactRange: 2.7,
    }),
    { selected: false, pending: false, active: false, hovered: false, objective: true, nearby: false, focused: true, destination: false },
    'quest objective NPCs should receive persistent world focus without becoming active destinations',
  );
  assert.equal(
    shouldCloseNpcServicePanel(5.09, 2.7),
    false,
    'open NPC service panels should stay open inside the leash range',
  );
  assert.equal(
    shouldCloseNpcServicePanel(5.11, 2.7),
    true,
    'open NPC service panels should close after the player leaves the leash range',
  );
  assert.equal(
    shouldCloseNpcServicePanel(Infinity, 2.7),
    true,
    'open NPC service panels should close when player distance cannot be resolved',
  );
  assert.deepEqual(
    npcInteractionRingState({
      distanceToPlayer: 24,
      interactRange: 2.7,
      nearby: false,
      destination: false,
    }).visible,
    false,
    'far unfocused NPC interaction rings should stay hidden',
  );
  const hoveredRing = npcInteractionRingState({
    distanceToPlayer: 24,
    interactRange: 2.7,
    nearby: false,
    hovered: true,
    destination: false,
  });
  assert.equal(hoveredRing.visible, true, 'hovered NPC interaction rings should preview the target from far away');
  const objectiveRing = npcInteractionRingState({
    distanceToPlayer: 30,
    interactRange: 2.7,
    nearby: false,
    objective: true,
    destination: false,
  });
  assert.equal(objectiveRing.visible, true, 'quest objective NPC interaction rings should stay visible from far away');
  assert.ok(objectiveRing.scale > hoveredRing.scale, 'quest objective rings should be stronger than hover-only rings');
  const nearbyRing = npcInteractionRingState({
    distanceToPlayer: 2.9,
    interactRange: 2.7,
    nearby: true,
    destination: false,
  });
  assert.equal(nearbyRing.visible, true, 'nearby NPC interaction rings should become visible');
  assert.ok(nearbyRing.scale >= 2.7 * 0.72, 'nearby NPC interaction rings should expand toward interaction range');
  assert.ok(hoveredRing.scale < nearbyRing.scale, 'hovered NPC rings should stay subtler than nearby interaction rings');
  const destinationRing = npcInteractionRingState({
    distanceToPlayer: 30,
    interactRange: 2.7,
    nearby: false,
    destination: true,
  });
  assert.equal(destinationRing.visible, true, 'pending NPC destination rings should stay visible from far away');
  assert.ok(destinationRing.scale > nearbyRing.scale, 'destination NPC interaction rings should be more prominent than nearby-only rings');
}

{
  const blockers = [{ x: 5, z: -6, radius: 0.72 }];
  const start = { x: 10, y: 0, z: -6 };
  const target = { x: 5, y: 0, z: -6 };
  const goal = walkableGoalNear(start, target, blockers, 98);
  assert.equal(isMoveTargetBlocked(target.x, target.z, blockers, 98), true, 'raw npc center target is blocked');
  assert.equal(isMoveTargetBlocked(goal.x, goal.z, blockers, 98), false, 'adjusted target must be walkable');
  assert.ok(Math.hypot(goal.x - blockers[0].x, goal.z - blockers[0].z) <= 2.6, 'adjusted npc target stays within interaction range');

  const resolved = resolveCircularCollisions(
    { x: 5, y: 0, z: -6 },
    blockers,
    98,
    0.5,
    (x, z) => x * 0.1 + z * 0.01,
    { x: 1, z: 0 },
  );
  assert.ok(Math.hypot(resolved.x - blockers[0].x, resolved.z - blockers[0].z) >= 1.219, 'local collision pushes player outside blocker');
  assert.equal(resolved.y, resolved.x * 0.1 + resolved.z * 0.01, 'local collision restores terrain height');

  const slid = resolveCircularCollisions(
    { x: 3.94, y: 0, z: -5.7 },
    blockers,
    98,
    0.5,
    (x, z) => x * 0.1 + z * 0.01,
    { x: 1, z: 1 },
    { x: 3.78, y: 0, z: -6 },
  );
  assert.ok(Math.abs(slid.x - 3.78) < 0.02, 'local collision should preserve the obstacle edge while sliding');
  assert.ok(slid.z > -5.75, 'local collision should advance along the obstacle tangent');
  assert.ok(Math.hypot(slid.x - blockers[0].x, slid.z - blockers[0].z) >= 1.219, 'slid position must stay outside blocker');

  const path = findLocalPath(
    { x: 0, y: 0, z: -6 },
    { x: 0, y: 0, z: 6 },
    [{ x: 0, z: 0, radius: 1.5 }],
    98,
  );
  assert.ok(path.length > 1, 'local click path must add waypoints around blockers');
  assert.ok(path.some((point) => Math.abs(point.x) >= 2), 'local click path should route sideways around the blocker');
  assert.equal(isMoveTargetBlocked(path[path.length - 1].x, path[path.length - 1].z, [{ x: 0, z: 0, radius: 1.5 }], 98), false, 'local click path final waypoint must be walkable');

  const routeBlockers = [{ x: 0, z: 0, radius: 1.5 }];
  const route = [
    { x: 0, y: 0, z: -2.4 },
    { x: 4, y: 0, z: -2.4 },
    { x: 0, y: 0, z: 6 },
  ];
  assert.equal(
    isMovementSegmentClear({ x: 0, y: 0, z: -6 }, { x: 0, y: 0, z: 6 }, routeBlockers),
    false,
    'direct route through a blocker must remain blocked',
  );
  assert.equal(
    furthestClearPathIndex({ x: 0, y: 0, z: -6 }, route, routeBlockers),
    1,
    'click prediction may skip to the furthest clear waypoint before the obstacle',
  );
  assert.equal(
    furthestClearPathIndex({ x: 4, y: 0, z: -2.4 }, route, routeBlockers),
    2,
    'click prediction should skip remaining waypoints once the final destination is visible',
  );

  const approach = chooseNpcApproachPoint({
    npc: { x: 0, y: 0, z: 0 },
    player: { x: 4, z: 0 },
    rotationY: 0,
    interactRange: 2.7,
    blockers: [
      { x: 0, z: 0, radius: 0.72 },
      { x: 1.85, z: 0, radius: 0.62 },
    ],
    bound: 98,
  });
  assert.equal(
    isMoveTargetBlocked(approach.x, approach.z, [
      { x: 0, z: 0, radius: 0.72 },
      { x: 1.85, z: 0, radius: 0.62 },
    ], 98),
    false,
    'NPC approach point must avoid blocked service props or neighboring blockers',
  );
  assert.ok(
    Math.hypot(approach.x, approach.z) <= 2.7,
    'NPC approach point must stay inside the interaction radius',
  );
  assert.ok(
    Math.hypot(approach.x - 1.85, approach.z) > 0.62 + 0.75,
    'NPC approach point should not choose the blocked player-side slot',
  );

  const fallbackApproach = chooseNpcApproachPoint({
    npc: { x: 0, y: 0, z: 0 },
    rotationY: Math.PI / 2,
    interactRange: 2.7,
    blockers: [{ x: 0, z: 0, radius: 0.72 }],
    bound: 98,
  });
  assert.ok(fallbackApproach.x > 1.4, 'NPC approach without a player position should use the NPC facing direction');
  assert.equal(
    isMoveTargetBlocked(fallbackApproach.x, fallbackApproach.z, [{ x: 0, z: 0, radius: 0.72 }], 98),
    false,
    'fallback NPC approach point must be walkable',
  );

  const playerSideApproach = chooseNpcApproachPoint({
    npc: { x: 0, y: 0, z: 0 },
    player: { x: 0, z: -4 },
    rotationY: 0,
    interactRange: 2.7,
    blockers: [{ x: 0, z: 0, radius: 0.72 }],
    bound: 98,
  });
  assert.ok(playerSideApproach.z < -1.4, 'default NPC approach should still allow the nearest player-side slot');

  const serviceSideApproach = chooseNpcApproachPoint({
    npc: { x: 0, y: 0, z: 0 },
    player: { x: 0, z: -4 },
    rotationY: 0,
    interactRange: 2.7,
    blockers: [{ x: 0, z: 0, radius: 0.72 }],
    bound: 98,
    preferFacing: true,
  });
  assert.ok(serviceSideApproach.z > 1.4, 'service NPC approach should prefer the NPC facing/service side');
  const serviceTriggerRange = npcApproachTriggerRange({
    npc: { x: 0, z: 0 },
    approach: serviceSideApproach,
    interactRange: 2.7,
  });
  assert.ok(
    serviceTriggerRange > Math.hypot(serviceSideApproach.x, serviceSideApproach.z),
    'NPC service trigger range should allow a small arrival cushion around the approach spot',
  );
  assert.ok(serviceTriggerRange < 2.7, 'NPC service trigger range should be tighter than the full interaction radius');
  assert.equal(
    npcApproachTriggerRange({
      npc: { x: 0, z: 0 },
      approach: { x: 0, z: 9 },
      interactRange: 2.7,
    }),
    2.7,
    'NPC service trigger range must never exceed the server interaction range',
  );
  assert.equal(
    npcApproachTriggerRange({
      npc: { x: 0, z: 0 },
      approach: { x: 0, z: 0.6 },
      interactRange: 1,
    }),
    1,
    'NPC service trigger cushion must stay capped for small interaction ranges',
  );
}

{
  // Anel de NPCs ao redor do spawn — deve espelhar src/core/Npc.ts e
  // back-dungeon/sim/npc.go (posicao, rotacao base e kind, usados tambem
  // para os blockers dos cenarios de servico).
  const campNpcs = [
    { id: 'npc-merchant-aran', kind: 'vendor', x: 9.46, z: -0.83, rotationY: -Math.PI * 0.472, radius: 0.72, interactRange: 2.6 },
    { id: 'npc-quest-lyra', kind: 'quest', x: -3.18, z: 8.74, rotationY: Math.PI * 0.889, radius: 0.72, interactRange: 2.7 },
    { id: 'npc-healer-mira', kind: 'healer', x: -5.79, z: -6.89, rotationY: Math.PI * 0.222, radius: 0.72, interactRange: 2.7 },
    { id: 'npc-blacksmith-borin', kind: 'blacksmith', x: 8.14, z: 4.70, rotationY: -Math.PI * 0.667, radius: 0.72, interactRange: 2.7 },
    { id: 'npc-trainer-toren', kind: 'trainer', x: 3.15, z: 8.65, rotationY: -Math.PI * 0.889, radius: 0.72, interactRange: 2.7 },
    { id: 'npc-travel-edrik', kind: 'travel', x: -9.45, z: -1.67, rotationY: Math.PI * 0.444, radius: 0.72, interactRange: 2.7 },
    { id: 'npc-banker-maelis', kind: 'banker', x: 6.74, z: -5.66, rotationY: -Math.PI * 0.278, radius: 0.72, interactRange: 2.7 },
    { id: 'npc-jeweler-selene', kind: 'jeweler', x: -7.79, z: 4.50, rotationY: Math.PI * 0.667, radius: 0.72, interactRange: 2.7 },
    { id: 'npc-guard-kael', kind: 'guard', x: 0.0, z: -9.5, rotationY: 0, radius: 0.72, interactRange: 2.7 },
  ];
  const dungeonNpcs = [
    { id: 'npc-travel-riven', kind: 'travel', x: 3.2, z: -17.2, rotationY: -Math.PI * 0.82, radius: 0.72, interactRange: 2.7 },
  ];
  const npcLayoutBlockers = (npcs) => npcs.flatMap(({ kind, x, z, rotationY, radius }) => [
    { x, z, radius },
    ...npcServicePropBlockers({ kind, x, z, rotationY }),
  ]);
  const start = { x: 0, y: 0, z: 0 };

  for (const npc of campNpcs) {
    const blockers = npcLayoutBlockers(campNpcs);
    const target = { x: npc.x, y: 0, z: npc.z };
    const goal = walkableGoalNear(start, target, blockers, 98);
    assert.equal(isMoveTargetBlocked(target.x, target.z, blockers, 98), true, `${npc.id} center must stay blocked`);
    assert.equal(isMoveTargetBlocked(goal.x, goal.z, blockers, 98), false, `${npc.id} interaction goal must be walkable`);
    assert.ok(
      Math.hypot(goal.x - npc.x, goal.z - npc.z) <= npc.interactRange,
      `${npc.id} interaction goal must remain within range`,
    );

    const path = findLocalPath(start, target, blockers, 98);
    assert.ok(path.length > 0, `${npc.id} local click path must produce at least one waypoint`);
    const finalWaypoint = path[path.length - 1];
    assert.equal(
      isMoveTargetBlocked(finalWaypoint.x, finalWaypoint.z, blockers, 98),
      false,
      `${npc.id} local click path final waypoint must be walkable`,
    );
    assert.ok(
      Math.hypot(finalWaypoint.x - npc.x, finalWaypoint.z - npc.z) <= npc.interactRange,
      `${npc.id} local click path final waypoint must remain within interaction range`,
    );
  }

  for (const npc of dungeonNpcs) {
    const blockers = npcLayoutBlockers(dungeonNpcs);
    const dungeonStart = { x: 0, y: 0, z: -12 };
    const target = { x: npc.x, y: 0, z: npc.z };
    const goal = walkableGoalNear(dungeonStart, target, blockers, 98);
    assert.equal(isMoveTargetBlocked(target.x, target.z, blockers, 98), true, `${npc.id} center must stay blocked`);
    assert.equal(isMoveTargetBlocked(goal.x, goal.z, blockers, 98), false, `${npc.id} interaction goal must be walkable`);
    assert.ok(
      Math.hypot(goal.x - npc.x, goal.z - npc.z) <= npc.interactRange,
      `${npc.id} interaction goal must remain within range`,
    );

    const path = findLocalPath(dungeonStart, target, blockers, 98);
    assert.ok(path.length > 0, `${npc.id} local click path must produce at least one waypoint`);
    const finalWaypoint = path[path.length - 1];
    assert.equal(
      isMoveTargetBlocked(finalWaypoint.x, finalWaypoint.z, blockers, 98),
      false,
      `${npc.id} local click path final waypoint must be walkable`,
    );
    assert.ok(
      Math.hypot(finalWaypoint.x - npc.x, finalWaypoint.z - npc.z) <= npc.interactRange,
      `${npc.id} local click path final waypoint must remain within interaction range`,
    );
  }
}

console.info('keyboard move verification passed');
