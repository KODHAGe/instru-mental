## Why

The current connection flow requires a two-step manual SDP exchange: the host shares a long URL-encoded offer, the peer opens it and must copy-paste a separate answer code back to the host. This friction is unnecessary for a tool built around open broadcasting rather than secure peer-to-peer sessions. A single shareable link — short and memorable — is all that should be needed.

## What Changes

- Replace the manual SDP copy-paste handshake with a room-code-based signaling flow
- Introduce a lightweight signaling relay so SDP exchange happens automatically in the background
- Make the join URL short and human-readable (e.g. `/#room=jazz-piano-7`) instead of containing raw base64 SDP
- Remove the peer-side "answer code" overlay and the host-side "paste answer" textarea
- The host creates a room, gets a short link, shares it — peers who open the link connect automatically

## Capabilities

### New Capabilities
- `room-signaling`: Lightweight signaling mechanism that brokers the WebRTC offer/answer exchange using a short room code, so no manual SDP copy-paste is needed

### Modified Capabilities
- (none — existing peer-to-peer data transport and scene broadcasting remain unchanged)

## Impact

- `src/network/`: new signaling module; `HostRoom` and `PeerConn` wiring to signaling
- `src/network/sdp.ts`: URL hash helpers no longer needed for full SDP embedding; room code URL helpers replace them
- `src/ui/connect-flow.ts`: host panel simplified to show only the share link; peer overlay removed entirely
- `src/ui/host-modal.ts`: may need update if it references the old connect flow
- External dependency: a signaling relay (e.g. PeerJS public server, or a minimal custom WebSocket server) is introduced
