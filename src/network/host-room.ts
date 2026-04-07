import Peer, { type DataConnection } from 'peerjs'
import { generateRoomCode, buildRoomUrl } from './room-code.ts'
import type { SceneOp, PeerMessage } from './types.ts'

const MAX_RETRIES = 3

export type PeerEventMap = {
  op: (op: SceneOp, fromPeerId: string) => void
  peer_connected: (peerId: string) => void
  peer_disconnected: (peerId: string) => void
}

/**
 * Host-side room.
 *
 * Responsibilities:
 * - Generate a memorable room code and open a PeerJS signaling connection
 * - Accept incoming peers automatically (no manual SDP exchange)
 * - Maintain a list of connected peers
 * - Relay incoming SceneOp messages to all other peers (hub-and-spoke)
 */
export class HostRoom {
  private connections = new Map<string, DataConnection>()
  private listeners: Partial<{ [K in keyof PeerEventMap]: Set<PeerEventMap[K]> }> = {}

  roomCode = ''
  roomUrl = ''

  on<K extends keyof PeerEventMap>(event: K, fn: PeerEventMap[K]): void {
    if (!this.listeners[event]) this.listeners[event] = new Set() as never
    ;(this.listeners[event] as Set<PeerEventMap[K]>).add(fn)
  }

  private emit<K extends keyof PeerEventMap>(event: K, ...args: Parameters<PeerEventMap[K]>): void {
    const set = this.listeners[event] as Set<(...a: Parameters<PeerEventMap[K]>) => void> | undefined
    if (set) for (const fn of set) fn(...args)
  }

  /**
   * Open the room: generate a room code, register on the PeerJS broker,
   * and start accepting incoming peer connections.
   * Handles ID collisions by regenerating and retrying (up to MAX_RETRIES).
   */
  open(attempt = 0): Promise<void> {
    const code = generateRoomCode()
    return new Promise<void>((resolve, reject) => {
      const peer = new Peer(code)

      peer.on('open', () => {
        this.roomCode = code
        this.roomUrl = buildRoomUrl(code)

        peer.on('connection', (conn) => {
          this.handleConnection(conn)
        })

        resolve()
      })

      peer.on('error', (err) => {
        peer.destroy()
        if (err.type === 'unavailable-id' && attempt < MAX_RETRIES - 1) {
          this.open(attempt + 1).then(resolve).catch(reject)
        } else {
          reject(err)
        }
      })
    })
  }

  private handleConnection(conn: DataConnection): void {
    const peerId = conn.peer
    this.connections.set(peerId, conn)

    conn.on('open', () => {
      this.emit('peer_connected', peerId)
    })

    conn.on('data', (data) => {
      const msg = data as PeerMessage
      this.emit('op', msg.op, peerId)
      this.broadcast(msg.op, peerId)
    })

    conn.on('close', () => {
      this.connections.delete(peerId)
      this.emit('peer_disconnected', peerId)
    })

    conn.on('error', () => {
      this.connections.delete(peerId)
      this.emit('peer_disconnected', peerId)
    })
  }

  /**
   * Broadcast a SceneOp to all connected peers except the sender.
   */
  broadcast(op: SceneOp, excludePeerId?: string): void {
    const msg: PeerMessage = { from: 'host', op }
    for (const [id, conn] of this.connections) {
      if (id === excludePeerId) continue
      if (conn.open) conn.send(msg)
    }
  }

  /**
   * Send a SceneOp to a specific peer only.
   */
  sendTo(peerId: string, op: SceneOp): void {
    const conn = this.connections.get(peerId)
    if (conn?.open) {
      const msg: PeerMessage = { from: 'host', op }
      conn.send(msg)
    }
  }

  get connectedPeerIds(): string[] {
    return [...this.connections.keys()]
  }
}
