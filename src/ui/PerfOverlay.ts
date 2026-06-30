export interface RenderStats {
  drawCalls: number;
  triangles: number;
  textures: number;
  vramMb?: number;
}

// Overlay de diagnostico de render. Liga/desliga com F3.
export class PerfOverlay {
  private readonly el: HTMLDivElement;
  private visible = false;
  private fps = 60;
  private accMs = 0;
  private frames = 0;

  constructor() {
    this.el = document.createElement('div');
    this.el.style.cssText = [
      'position:fixed', 'top:8px', 'left:8px', 'z-index:99999',
      'font:12px/1.45 ui-monospace,Menlo,Consolas,monospace',
      'color:#9eff9e', 'background:rgba(0,0,0,0.62)', 'padding:6px 9px',
      'border-radius:6px', 'white-space:pre', 'pointer-events:none', 'display:none',
    ].join(';');
    (document.body ?? document.documentElement).appendChild(this.el);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  toggle(): void {
    this.visible = !this.visible;
    this.el.style.display = this.visible ? 'block' : 'none';
  }

  update(frameMs: number, stats: RenderStats, quality: string): void {
    this.accMs += frameMs;
    this.frames++;
    if (this.accMs >= 500) {
      this.fps = (this.frames * 1000) / this.accMs;
      this.accMs = 0;
      this.frames = 0;
    }
    if (!this.visible) return;
    this.el.textContent =
      `FPS ${this.fps.toFixed(0)}  (${frameMs.toFixed(1)} ms)\n`
      + `draw calls ${stats.drawCalls}\n`
      + `triangulos ${(stats.triangles / 1000).toFixed(1)}k\n`
      + `texturas  ${stats.textures}\n`
      + `VRAM      ${stats.vramMb === undefined ? '-' : stats.vramMb.toFixed(1) + ' MB'}\n`
      + `qualidade ${quality}  [F3]`;
  }
}
