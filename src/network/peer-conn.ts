import Peer, { type PeerError } from 'peerjs'
import type { SceneOp, PeerMessage } from './types.ts'

export type PeerConnEventMap = {
  op: (op: SceneOp) => void
  connected: () => void
  disconnected: () => void
}

const RETRY_INTERVAL_MS = 2000
const RETRY_TIMEOUT_MS = 30000

/**
 * Peer-side connection manager.
 *
 * Responsibilities:
 * - Connect to a host room via a short room code (PeerJS signaling)
 * - Open a DataChannel to the host
 * - Send and receive SceneOp messages
 */
export class PeerConn {
  readonly peerId = crypto.randomUUID()

  private listeners: Partial<{ [K in keyof PeerConnEventMap]: Set<PeerConnEventMap[K]> }> = {}

  on<K extends keyof PeerConnEventMap>(event: K, fn: PeerConnEventMap[K]): void {
    if (!this.listeners[event]) this.listeners[event] = new Set() as never
    ;(this.listeners[event] as Set<PeerConnEventMap[K]>).add(fn)
  }

  private emit<K extends keyof PeerConnEventMap>(event: K, ...args: Parameters<PeerConnEventMap[K]>): void {
    const set = this.listeners[event] as Set<(...a: Parameters<PeerConnEventMap[K]>) => void> | undefined
    if (set) for (const fn of set) fn(...args)
  }

  /**
   * Connect to the host identified by `roomCode`.
   * PeerJS handles the full offer/answer exchange automatically.
   * Fires `connected` when the data channel opens, `disconnected` on close/error.
   * If the host is not yet available (`peer-unavailable`), retries every
   * RETRY_INTERVAL_MS until RETRY_TIMEOUT_MS is reached.
   */
  connectToRoom(roomCode: string): void {
    const deadline = Date.now() + RETRY_TIMEOUT_MS

    const attempt = (peer: Peer) => {
      peer.on('open', () => {
        const conn = peer.connect(roomCode, { serialization: 'json', reliable: true })

        conn.on('open', () => {
          this.conn = conn
          this.emit('connected')
        })

        conn.on('data', (data) => {
          const msg = data as PeerMessage
          this.emit('op', msg.op)
        })

        conn.on('close', () => {
          this.emit('disconnected')
        })

        conn.on('error', () => {
          this.emit('disconnected')
        })
      })

      peer.on('error', (err: PeerError<string>) => {
        if (err.type === 'peer-unavailable' && Date.now() < deadline) {
          peer.destroy()
          setTimeout(() => attempt(new Peer()), RETRY_INTERVAL_MS)
        } else {
          this.emit('disconnected')
        }
      })
    }

    attempt(new Peer())
  }

  private conn: import('peerjs').DataConnection | null = null

  /**
   * Send a SceneOp to the host.
   */
  send(op: SceneOp): void {
    if (this.conn?.open) {
      const msg: PeerMessage = { from: this.peerId, op }
      this.conn.send(msg)
    }
  }
}
