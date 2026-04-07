/**
 * Host opt-in modal.
 *
 * Shown to the first visitor (no offer in URL).
 * Resolves with `true` if the user opts in to host, `false` otherwise.
 */
export function showHostModal(): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay'
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-icon">⬡</div>
        <h1>instru-mental</h1>
        <p>
          You're the first here.<br>
          Would you like to <strong>host this session</strong>?
        </p>
        <p class="modal-sub">
          Your browser will act as the connection hub for others joining via your shared link.
          No data leaves your device beyond what you share with collaborators.
        </p>
        <div class="modal-actions">
          <button id="btn-host" class="btn-primary">Host session</button>
          <button id="btn-watch" class="btn-secondary">Just watch / wait</button>
        </div>
      </div>
    `
    document.body.appendChild(overlay)

    overlay.querySelector('#btn-host')!.addEventListener('click', () => {
      overlay.remove()
      resolve(true)
    })
    overlay.querySelector('#btn-watch')!.addEventListener('click', () => {
      overlay.remove()
      resolve(false)
    })
  })
}

/** Show a simple "waiting for host" message (no offer in URL, declined to host). */
export function showWaitingState(): void {
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-icon">⬡</div>
      <h1>instru-mental</h1>
      <p>Ask the host to share their session link with you.</p>
    </div>
  `
  document.body.appendChild(overlay)
}
