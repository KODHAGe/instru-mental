// ── Scene data types ────────────────────────────────────────────────────────

export type ObjectType = 'quad' | 'circle'

export interface Transform {
  x: number
  y: number
  scaleX: number
  scaleY: number
  rotation: number
}

export interface SceneObject {
  id: string
  type: ObjectType
  transform: Transform
  color: [number, number, number, number]
  ownerId: string
}

export interface Scene {
  objects: Record<string, SceneObject>
}

// ── Scene operations (sent over DataChannel) ────────────────────────────────

export type SceneOp =
  | { type: 'add'; object: SceneObject }
  | { type: 'remove'; id: string }
  | { type: 'move'; id: string; transform: Transform }
  | { type: 'set_color'; id: string; color: [number, number, number, number] }
  | { type: 'sync'; scene: Scene }

// ── Network messages ─────────────────────────────────────────────────────────

export interface PeerMessage {
  from: string
  op: SceneOp
}

// ── Connection roles ─────────────────────────────────────────────────────────

export type Role = 'undecided' | 'host' | 'peer'
