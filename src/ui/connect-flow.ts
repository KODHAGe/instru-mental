import type { HostRoom } from '../network/host-room.ts'

// ── Host side ─────────────────────────────────────────────────────────────────

/**
 * Shows the host "share link" panel.
 *
 * Displays the shareable room URL, a "Copy link" button, and a live peer count.
 * Peers auto-connect when they open the link — no answer-code exchange required.
 */
export function showHostConnectPanel(room: HostRoom): void {
  const panel = document.createElement('div')
  panel.id = 'connect-panel'
  panel.className = 'connect-panel'
  panel.innerHTML = `
    <div class="panel-header">
      <span class="panel-title">Session</span>
    </div>
    <div class="invite-block">
      <label class="invite-label">Share this link to invite peers:</label>
      <div class="url-row">
        <input class="url-input" readonly value="${room.roomUrl}" />
        <button id="btn-copy-link" class="btn-copy" data-url="${room.roomUrl}">Copy</button>
      </div>
    </div>
    <div id="peer-list"><span class="peer-count">0 peers connected</span></div>
  `
  document.body.appendChild(panel)

  const peerListEl = panel.querySelector<HTMLDivElement>('#peer-list')!
  let peerCount = 0
  const updatePeerCount = () => {
    peerListEl.innerHTML = `<span class="peer-count">${peerCount} peer${peerCount !== 1 ? 's' : ''} connected</span>`
  }

  room.on('peer_connected', () => { peerCount++; updatePeerCount() })
  room.on('peer_disconnected', () => { peerCount = Math.max(0, peerCount - 1); updatePeerCount() })

  panel.querySelector<HTMLButtonElement>('#btn-copy-link')!.addEventListener('click', (e) => {
    const url = (e.currentTarget as HTMLButtonElement).dataset['url']!
    void navigator.clipboard.writeText(url).then(() => {
      const btn = e.currentTarget as HTMLButtonElement
      btn.textContent = 'Copied!'
      setTimeout(() => { btn.textContent = 'Copy' }, 2000)
    })
  })
}

