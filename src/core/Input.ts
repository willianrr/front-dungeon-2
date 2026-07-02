export interface PointerNdc {
  x: number;
  y: number;
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
  private potionQueued = false;
  private manaPotionQueued = false;
  private arcaneNovaQueued = false;
  private inventoryToggleQueued = false;
  private characterToggleQueued = false;
  private sfxMuteToggleQueued = false;
  private qualityToggleQueued = false;
  private movementChangedQueued = false;
  private readonly movementKeys = new Set<string>();

  constructor(canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      this.clickQueue.push(this.toNDC(e, canvas));
    });

    canvas.addEventListener('pointermove', (e) => {
      this.toNDC(e, canvas, this.pointer);
    });

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
      if (e.code === 'Space') {
        this.jumpQueued = true;
        e.preventDefault();
      }
      if (e.code === 'Digit1') this.potionQueued = true;
      if (e.code === 'Digit2') this.arcaneNovaQueued = true;
      if (e.code === 'Digit3') this.manaPotionQueued = true;
      if (e.code === 'KeyI') this.inventoryToggleQueued = true;
      if (e.code === 'KeyC') this.characterToggleQueued = true;
      if (e.code === 'KeyM') this.sfxMuteToggleQueued = true;
      if (e.code === 'KeyF' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        this.qualityToggleQueued = true;
        e.preventDefault();
      }
    });

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
      if (hadMovement) this.movementChangedQueued = true;
    });
  }

  takeClicks(): PointerNdc[] {
    const clicks = this.clickQueue;
    this.clickQueue = [];
    return clicks;
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

  takeUsePotion(): boolean {
    const queued = this.potionQueued;
    this.potionQueued = false;
    return queued;
  }

  takeUseManaPotion(): boolean {
    const queued = this.manaPotionQueued;
    this.manaPotionQueued = false;
    return queued;
  }

  takeArcaneNova(): boolean {
    const queued = this.arcaneNovaQueued;
    this.arcaneNovaQueued = false;
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
