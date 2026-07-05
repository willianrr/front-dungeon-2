export interface PointerNdc {
  x: number;
  y: number;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

// Captura de entrada do usuario. Nao reage diretamente; apenas registra o que
// aconteceu para o Game consumir a cada frame.
export class Input {
  /** Posicao atual do mouse em coordenadas normalizadas (-1..1). */
  readonly pointer: PointerNdc = { x: 0, y: 0 };
  /** Direcao de rotacao da camera: -1 (Q), 0, +1 (E). */
  rotateDir = 0;
  /** True enquanto Shift estiver pressionado (correr). */
  running = false;

  private clickQueue: PointerNdc[] = [];
  private zoomDelta = 0;
  private jumpQueued = false;
  /** Slots da hotbar (1-6) pressionados desde o ultimo frame. A ACAO de cada
   * slot e decidida pelo Game via layout reorganizavel (drag & drop). */
  private hotbarQueue: number[] = [];
  private inventoryToggleQueued = false;
  private characterToggleQueued = false;
  private talentsToggleQueued = false;
  private sfxMuteToggleQueued = false;
  private qualityToggleQueued = false;
  private autorunToggleQueued = false;
  private npcInteractQueued = false;
  private npcCycleQueued = 0;
  private cancelQueued = false;
  private movementChangedQueued = false;
  private readonly movementKeys = new Set<string>();
  private primaryPointerId: number | null = null;
  private primaryActionDown = false;

  constructor(canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      this.toNDC(e, canvas, this.pointer);
      this.clickQueue.push({ x: this.pointer.x, y: this.pointer.y });
      this.primaryPointerId = e.pointerId;
      this.primaryActionDown = true;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // Pointer capture is best-effort; movement still works without it.
      }
      e.preventDefault();
    });

    canvas.addEventListener('pointermove', (e) => {
      this.toNDC(e, canvas, this.pointer);
    });

    const releasePrimaryPointer = (e: PointerEvent) => {
      if (this.primaryPointerId !== null && e.pointerId !== this.primaryPointerId) return;
      this.primaryPointerId = null;
      this.primaryActionDown = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore stale captures; browsers differ after pointercancel/blur.
      }
    };

    canvas.addEventListener('pointerup', (e) => {
      if (e.button !== 0) return;
      releasePrimaryPointer(e);
    });
    canvas.addEventListener('pointercancel', releasePrimaryPointer);

    canvas.addEventListener(
      'wheel',
      (e) => {
        this.zoomDelta += Math.sign(e.deltaY);
        e.preventDefault();
      },
      { passive: false },
    );

    // Bloqueia o menu de contexto do navegador na pagina inteira: botao direito
    // nao abre menu em cima da acao (comportamento padrao de ARPG web).
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      if (isEditableTarget(e.target)) return;
      if (e.key === 'q' || e.key === 'Q') this.rotateDir = -1;
      if (e.key === 'e' || e.key === 'E') this.rotateDir = 1;
      if (e.key === 'Shift' && !this.running) {
        this.running = true;
        this.movementChangedQueued = true;
      }
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code) && !this.movementKeys.has(e.code)) {
        this.movementKeys.add(e.code);
        this.movementChangedQueued = true;
      }
      if (e.repeat) return;
      if (e.code === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        this.npcCycleQueued = e.shiftKey ? -1 : 1;
        e.preventDefault();
      }
      if (e.code === 'Space') {
        this.jumpQueued = true;
        e.preventDefault();
      }
      if (e.code === 'Digit1') this.hotbarQueue.push(1);
      if (e.code === 'Digit2') this.hotbarQueue.push(2);
      if (e.code === 'Digit3') this.hotbarQueue.push(3);
      if (e.code === 'Digit4') this.hotbarQueue.push(4);
      if (e.code === 'Digit5') this.hotbarQueue.push(5);
      if (e.code === 'Digit6') this.hotbarQueue.push(6);
      if (e.code === 'KeyI') this.inventoryToggleQueued = true;
      if (e.code === 'KeyC') this.characterToggleQueued = true;
      if (e.code === 'KeyN') this.talentsToggleQueued = true;
      if (e.code === 'KeyM') this.sfxMuteToggleQueued = true;
      if (e.code === 'Escape') {
        this.cancelQueued = true;
        e.preventDefault();
      }
      if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        this.npcInteractQueued = true;
        e.preventDefault();
      }
      if (e.code === 'KeyF' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        this.qualityToggleQueued = true;
        e.preventDefault();
      }
      if (e.code === 'NumLock') {
        this.autorunToggleQueued = true;
        e.preventDefault();
      }
    });

    // Keyup NAO tem guard de input focado: soltar tecla e sempre seguro, e o
    // guard fazia teclas de movimento ficarem "presas" quando o keydown
    // acontecia no jogo e o keyup dentro do chat (ex.: segurando W + Enter).
    window.addEventListener('keyup', (e) => {
      if (['q', 'Q', 'e', 'E'].includes(e.key)) this.rotateDir = 0;
      if (e.key === 'Shift' && this.running) {
        this.running = false;
        this.movementChangedQueued = true;
      }
      if (this.movementKeys.delete(e.code)) this.movementChangedQueued = true;
    });

    window.addEventListener('blur', () => {
      const hadMovement = this.movementKeys.size > 0 || this.running || this.rotateDir !== 0;
      this.movementKeys.clear();
      this.running = false;
      this.rotateDir = 0;
      this.primaryPointerId = null;
      this.primaryActionDown = false;
      if (hadMovement) this.movementChangedQueued = true;
    });
  }

  takeClicks(): PointerNdc[] {
    const clicks = this.clickQueue;
    this.clickQueue = [];
    return clicks;
  }

  isPrimaryActionDown(): boolean {
    return this.primaryActionDown;
  }

  takeZoom(): number {
    const z = this.zoomDelta;
    this.zoomDelta = 0;
    return z;
  }

  takeJump(): boolean {
    const j = this.jumpQueued;
    this.jumpQueued = false;
    return j;
  }

  /** Slots (1-6) pressionados desde o ultimo frame, na ordem. */
  takeHotbarPresses(): number[] {
    if (this.hotbarQueue.length === 0) return this.hotbarQueue;
    const queued = this.hotbarQueue;
    this.hotbarQueue = [];
    return queued;
  }

  takeInventoryToggle(): boolean {
    const queued = this.inventoryToggleQueued;
    this.inventoryToggleQueued = false;
    return queued;
  }

  takeCharacterToggle(): boolean {
    const queued = this.characterToggleQueued;
    this.characterToggleQueued = false;
    return queued;
  }

  takeTalentsToggle(): boolean {
    const queued = this.talentsToggleQueued;
    this.talentsToggleQueued = false;
    return queued;
  }

  takeSfxMuteToggle(): boolean {
    const queued = this.sfxMuteToggleQueued;
    this.sfxMuteToggleQueued = false;
    return queued;
  }

  takeQualityToggle(): boolean {
    const queued = this.qualityToggleQueued;
    this.qualityToggleQueued = false;
    return queued;
  }

  takeAutorunToggle(): boolean {
    const queued = this.autorunToggleQueued;
    this.autorunToggleQueued = false;
    return queued;
  }

  takeCancel(): boolean {
    const queued = this.cancelQueued;
    this.cancelQueued = false;
    return queued;
  }

  takeNpcInteract(): boolean {
    const queued = this.npcInteractQueued;
    this.npcInteractQueued = false;
    return queued;
  }

  takeNpcCycle(): number {
    const queued = this.npcCycleQueued;
    this.npcCycleQueued = 0;
    return queued;
  }

  takeMovementChanged(): boolean {
    const queued = this.movementChangedQueued;
    this.movementChangedQueued = false;
    return queued;
  }

  getMoveAxes(): { strafe: number; forward: number } {
    const strafe = Number(this.movementKeys.has('KeyD')) - Number(this.movementKeys.has('KeyA'));
    const forward = Number(this.movementKeys.has('KeyW')) - Number(this.movementKeys.has('KeyS'));
    return { strafe, forward };
  }

  private toNDC(e: PointerEvent, canvas: HTMLCanvasElement, out: PointerNdc = { x: 0, y: 0 }): PointerNdc {
    const rect = canvas.getBoundingClientRect();
    out.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    out.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    return out;
  }
}
