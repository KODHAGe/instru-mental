## Context

instru-mental currently uses a fully serverless WebRTC handshake: the host's full SDP offer is base64-encoded into the URL (hundreds of characters long), and the peer must manually copy their answer code back to the host via a text area. This is technically sound but unusable in practice. The app is intended for casual collaborative broadcasting, not secure private sessions, so the complexity of manual SDP exchange has no security benefit — it is pure friction.

The goal is to replace the manual two-step handshake with a single shareable link, automatic signaling, and no user-visible SDP blobs.

## Goals / Non-Goals

**Goals:**
- A host produces one short, human-readable link to share (e.g. `/#room=swift-drum-bass`)
- Peers who open the link connect automatically — zero copy-paste required
- Links work for multiple peers (n-to-1, hub-and-spoke model preserved)
- No change to the WebRTC data transport or scene broadcasting logic

**Non-Goals:**
- Security or authentication — rooms are open to anyone with the link
- Persistent rooms or reconnection across page reloads
- Mobile or native client support

## Decisions

### D1: Use PeerJS for signaling

**Choice:** Adopt the [PeerJS](https://peerjs.com/) library (`peerjs` npm package).

PeerJS wraps WebRTC and provides a public signaling broker (`broker.peerjs.com`). The host creates a `Peer` with a custom short ID; peers connect to it by ID. SDP exchange is handled entirely by PeerJS — neither host nor peer ever sees raw SDP.

**Alternatives considered:**
- *Keep manual SDP exchange, just shorten URLs via compression* — still requires the peer to paste an answer code back. Does not meet the goal.
- *Custom WebSocket signaling server* — fully controlled but requires deployed infrastructure. Over-engineered for a broadcasting toy.
- *Firebase / Supabase Realtime as signaling relay* — adds a large SDK dependency and account setup for a minor benefit over PeerJS.

**Trade-off:** Takes a runtime dependency on `broker.peerjs.com`. If the broker is down, new connections fail. Existing WebRTC data channels are unaffected once connected.

---

### D2: Memorable room codes, not UUIDs

**Choice:** Generate the room ID as `<adjective>-<noun>-<noun>` (e.g. `swift-drum-bass`) using a small static word list baked into the client. This ID is used directly as the PeerJS peer ID for the host.

**Alternatives considered:**
- *Use PeerJS-assigned random IDs* — opaque, ugly, not memorable.
- *UUIDs or random hex* — similarly opaque.
- *word-word-number format* — the trailing number feels technical; three words are more natural to read aloud and no less memorable.

The three-word format is short (~18 chars), easy to read aloud, and has sufficient collision resistance (1000 adjectives × 1000 nouns × 1000 nouns = 1 000 000 000 combinations — no number suffix needed for entropy).

---

### D3: URL format `#room=<code>`

**Choice:** Room code lives in the URL fragment as `#room=<code>`. The app startup logic already reads the hash to determine the user's role (`offer=` presently); this replaces that with `room=`.

On load:
- Hash has `room=<code>` → user is a **peer**, connect to that room
- Hash is empty → user is a **host candidate** (show host modal as today)

---

### D4: Remove answer-code UI, simplify host panel

**Choice:** Delete `showPeerConnectFlow` entirely. The peer-side overlay that asks users to copy an answer code is no longer needed. The host panel keeps only the share link and a live peer count.

## Risks / Trade-offs

- **[Broker availability]** → PeerJS public broker may be rate-limited or unavailable. Mitigation: document how to self-host the PeerJS server (`peer` npm package) and configure a custom host via PeerJS options. The code should accept a `signalingServer` config option.
- **[Room ID collision]** → Two hosts could independently generate the same room code. Mitigation: PeerJS will surface an error ("ID taken"); the client should regenerate and retry once automatically.
- **[Peer discovery ordering]** → Peer opens the link before the host's PeerJS connection is established. Mitigation: PeerJS handles this via the broker; peers will retry connection until the host ID appears.
- **[SDP encoding removed from URLs]** → Old `#offer=…` links stop working. This is acceptable; there are no persistent links to migrate.

## Migration Plan

1. Install `peerjs` as a runtime dependency
2. Replace `src/network/sdp.ts` URL helpers with room-code generation utilities
3. Rewrite `HostRoom` to use a PeerJS `Peer` instance for signaling
4. Rewrite `PeerConn` to connect via PeerJS to the host's peer ID
5. Simplify `connect-flow.ts`: remove answer-code UI, keep share-link panel
6. Update `main.ts` startup logic to branch on `#room=` instead of `#offer=`
7. No server changes needed; no data migration required

## Open Questions

- Should the room code regenerate on every "Host session" click, or persist for the browser session (e.g. via `sessionStorage`)? Leaning toward regenerating each time for simplicity.
- Should the host panel include a "Copy link" button or rely on the browser URL bar? Leaning toward an explicit copy button for usability.
