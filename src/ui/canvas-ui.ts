import type { SceneObject, ObjectType, Transform } from '../network/types.ts'
import type { SceneStore } from '../scene/store.ts'

type EmitFn = (op: import('../network/types.ts').SceneOp) => void

const COLORS: [number, number, number, number][] = [
  [0.96, 0.36, 0.44, 1],  // coral
  [0.36, 0.72, 0.96, 1],  // sky blue
  [0.52, 0.96, 0.56, 1],  // mint
  [0.96, 0.82, 0.32, 1],  // gold
  [0.76, 0.44, 0.96, 1],  // violet
]
let colorIdx = 0

function nextColor(): [number, number, number, number] {
  return COLORS[colorIdx++ % COLORS.length]!
}

// ── Canvas interaction ────────────────────────────────────────────────────────

type DragState = {
  objectId: string
  startMouseX: number
  startMouseY: number
  startObjX: number
  startObjY: number
}

export class CanvasUI {
  private peerId: string
  private store: SceneStore
  private emit: EmitFn
  private canvas: HTMLCanvasElement
  private overlay: HTMLDivElement
  private drag: DragState | null = null
  private selectedId: string | null = null

  constructor(peerId: string, store: SceneStore, canvas: HTMLCanvasElement, emit: EmitFn) {
    this.peerId = peerId
    this.store = store
    this.canvas = canvas
    this.emit = emit

    this.overlay = document.getElementById('canvas-overlay') as HTMLDivElement
    this.buildToolbar()
    this.bindCanvasEvents()
  }

  // ── Toolbar ─────────────────────────────────────────────────────────────────

  private buildToolbar(): void {
    const toolbar = document.getElementById('toolbar')!
    toolbar.innerHTML = `
      <button class="tool-btn" data-shape="quad" title="Add quad">▭</button>
      <button class="tool-btn" data-shape="circle" title="Add circle">◯</button>
      <div class="tool-divider"></div>
      <button class="tool-btn" id="btn-delete" title="Delete selected" disabled>⌫</button>
    `

    toolbar.querySelectorAll<HTMLButtonElement>('[data-shape]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.dataset['shape'] as ObjectType
        this.addObject(type)
      })
    })

    toolbar.querySelector<HTMLButtonElement>('#btn-delete')!.addEventListener('click', () => {
      if (this.selectedId) this.deleteSelected()
    })
  }

  private setDeleteEnabled(enabled: boolean): void {
    const btn = document.querySelector<HTMLButtonElement>('#btn-delete')
    if (btn) btn.disabled = !enabled
  }

  // ── Object creation ──────────────────────────────────────────────────────────

  private addObject(type: ObjectType): void {
    const object: SceneObject = {
      id: crypto.randomUUID(),
      type,
      transform: {
        x: (Math.random() * 1.4) - 0.7,
        y: (Math.random() * 1.4) - 0.7,
        scaleX: type === 'circle' ? 0.3 : 0.4,
        scaleY: type === 'circle' ? 0.3 : 0.25,
        rotation: 0,
      },
      color: nextColor(),
      ownerId: this.peerId,
    }
    const op = { type: 'add' as const, object }
    this.store.apply(op)
    this.emit(op)
    this.selectObject(object.id)
  }

  private deleteSelected(): void {
    if (!this.selectedId) return
    const op = { type: 'remove' as const, id: this.selectedId }
    this.store.apply(op)
    this.emit(op)
    this.selectedId = null
    this.setDeleteEnabled(false)
  }

  // ── Canvas events ────────────────────────────────────────────────────────────

  private bindCanvasEvents(): void {
    this.overlay.addEventListener('pointerdown', (e) => this.onPointerDown(e))
    this.overlay.addEventListener('pointermove', (e) => this.onPointerMove(e))
    this.overlay.addEventListener('pointerup', () => this.onPointerUp())
    this.overlay.addEventListener('pointercancel', () => this.onPointerUp())
  }

  private clientToNdc(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 2 - 1
    const y = -(((clientY - rect.top) / rect.height) * 2 - 1)
    return { x, y }
  }

  private onPointerDown(e: PointerEvent): void {
    const ndc = this.clientToNdc(e.clientX, e.clientY)
    const hit = this.hitTest(ndc.x, ndc.y)

    if (hit) {
      this.selectObject(hit.id)
      const obj = this.store.scene.objects[hit.id]!
      this.drag = {
        objectId: hit.id,
        startMouseX: ndc.x,
        startMouseY: ndc.y,
        startObjX: obj.transform.x,
        startObjY: obj.transform.y,
      }
      this.overlay.setPointerCapture(e.pointerId)
    } else {
      this.selectedId = null
      this.setDeleteEnabled(false)
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.drag) return
    const ndc = this.clientToNdc(e.clientX, e.clientY)
    const dx = ndc.x - this.drag.startMouseX
    const dy = ndc.y - this.drag.startMouseY

    const obj = this.store.scene.objects[this.drag.objectId]
    if (!obj) return

    const transform: Transform = {
      ...obj.transform,
      x: this.drag.startObjX + dx,
      y: this.drag.startObjY + dy,
    }

    const op = { type: 'move' as const, id: this.drag.objectId, transform }
    this.store.apply(op)
    this.emit(op)
  }

  private onPointerUp(): void {
    this.drag = null
  }

  // ── Hit testing ──────────────────────────────────────────────────────────────

  private hitTest(ndcX: number, ndcY: number): SceneObject | null {
    const aspect = this.canvas.width / this.canvas.height
    // Reverse iteration — top-most objects checked first
    const objects = (Object.values(this.store.scene.objects) as SceneObject[]).reverse()
    for (const obj of objects) {
      const { x, y, scaleX, scaleY } = obj.transform
      // Account for the same aspect ratio correction the renderer applies
      const hw = (scaleX / aspect) / 2
      const hh = scaleY / 2
      const dx = ndcX - x
      const dy = ndcY - y
      if (obj.type === 'circle') {
        // Ellipse test
        if ((dx * dx) / (hw * hw) + (dy * dy) / (hh * hh) <= 1) return obj
      } else {
        if (Math.abs(dx) <= hw && Math.abs(dy) <= hh) return obj
      }
    }
    return null
  }

  // ── Selection ────────────────────────────────────────────────────────────────

  private selectObject(id: string): void {
    this.selectedId = id
    this.setDeleteEnabled(true)
  }
}
