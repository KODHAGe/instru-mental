import './style.css'
import { extractRoomCodeFromHash } from './network/room-code.ts'
import { HostRoom } from './network/host-room.ts'
import { PeerConn } from './network/peer-conn.ts'
import { SceneStore } from './scene/store.ts'
import { Renderer } from './scene/renderer.ts'
import { showHostModal, showWaitingState } from './ui/host-modal.ts'
import { showHostConnectPanel } from './ui/connect-flow.ts'
import { CanvasUI } from './ui/canvas-ui.ts'
import type { SceneOp } from './network/types.ts'

async function main() {
  const store = new SceneStore()
  const renderer = new Renderer()
  const canvasEl = await renderer.init(store)

  const roomCode = extractRoomCodeFromHash()

  // ── Peer flow ──────────────────────────────────────────────────────────────

  if (roomCode) {
    history.replaceState(null, '', location.pathname + location.search)

    const conn = new PeerConn()

    // Wire incoming ops from host → local store
    conn.on('op', (op) => {
      store.apply(op, 'host')
    })

    conn.on('connected', () => {
      const emit = (op: SceneOp) => conn.send(op)
      new CanvasUI(conn.peerId, store, canvasEl, emit)
    })

    conn.connectToRoom(roomCode)
    return
  }

  // ── Host/undecided flow ────────────────────────────────────────────────────

  const wantsToHost = await showHostModal()

  if (!wantsToHost) {
    showWaitingState()
    return
  }

  const room = new HostRoom()

  // Wire incoming peer ops → local store
  room.on('op', (op, fromPeerId) => {
    store.apply(op, fromPeerId)
  })

  // When a peer connects, send them the full current scene
  room.on('peer_connected', (peerId) => {
    const syncOp: SceneOp = { type: 'sync', scene: store.snapshot() }
    room.sendTo(peerId, syncOp)
  })

  await room.open()

  showHostConnectPanel(room)

  const emit = (op: SceneOp) => {
    room.broadcast(op)
  }

  // Host's peer ID is a fixed string so objects they create are attributed correctly
  const hostPeerId = 'host'
  new CanvasUI(hostPeerId, store, canvasEl, emit)
}

main().catch((err: unknown) => {
  console.error('instru-mental startup error:', err)
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#fff;font-family:sans-serif;">
      <div>
        <h2>⚠ Failed to start</h2>
        <p>${err instanceof Error ? err.message : String(err)}</p>
        <p style="opacity:0.5">WebGPU is required. Use Chrome 113+, Edge 113+, or Safari 18+.</p>
      </div>
    </div>
  `
})

