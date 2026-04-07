import type { Scene, SceneOp } from '../network/types.ts'

type Listener = (op: SceneOp, fromPeerId?: string) => void

/**
 * Shared scene graph.
 *
 * Holds the authoritative local copy of the scene. Mutations are applied via
 * `apply()` and broadcast to all listeners (the renderer + the network layer).
 */
export class SceneStore {
  readonly scene: Scene = { objects: {} }

  private listeners = new Set<Listener>()

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit(op: SceneOp, fromPeerId?: string): void {
    for (const fn of this.listeners) fn(op, fromPeerId)
  }

  /**
   * Apply an incoming operation from the network or local UI.
   * @param op - The operation to apply.
   * @param fromPeerId - Set when the op comes from a remote peer (to avoid re-broadcasting back to sender).
   */
  apply(op: SceneOp, fromPeerId?: string): void {
    switch (op.type) {
      case 'add':
        this.scene.objects[op.object.id] = op.object
        break
      case 'remove':
        delete this.scene.objects[op.id]
        break
      case 'move':
        if (this.scene.objects[op.id]) {
          this.scene.objects[op.id].transform = op.transform
        }
        break
      case 'set_color':
        if (this.scene.objects[op.id]) {
          this.scene.objects[op.id].color = op.color
        }
        break
      case 'sync':
        // Replace entire scene (used on new peer join)
        for (const id of Object.keys(this.scene.objects)) {
          delete this.scene.objects[id]
        }
        for (const [id, obj] of Object.entries(op.scene.objects)) {
          this.scene.objects[id] = obj
        }
        break
    }
    this.emit(op, fromPeerId)
  }

  snapshot(): Scene {
    return { objects: { ...this.scene.objects } }
  }
}
