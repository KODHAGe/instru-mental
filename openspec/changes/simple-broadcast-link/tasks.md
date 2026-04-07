## 1. Dependencies

- [x] 1.1 Install `peerjs` npm package as a runtime dependency
- [x] 1.2 Verify TypeScript types are available (`@types/peerjs` or bundled types)

## 2. Room Code Utilities

- [x] 2.1 Create `src/network/room-code.ts` with a static word list (adjectives + nouns) and a `generateRoomCode()` function producing `<adjective>-<noun>-<number>` format
- [x] 2.2 Add `buildRoomUrl(code: string): string` helper that returns `origin + pathname + '#room=' + code`
- [x] 2.3 Add `extractRoomCodeFromHash(): string | null` helper that reads `room=` from the URL hash

## 3. Rewrite HostRoom Signaling

- [x] 3.1 Replace the `RTCPeerConnection` offer-creation flow in `HostRoom` with a PeerJS `Peer` instance using the room code as the peer ID
- [x] 3.2 Handle the PeerJS `connection` event to accept incoming peers (replaces `createOffer` / `acceptAnswer`)
- [x] 3.3 Handle room code collision: on PeerJS `error` event with type `unavailable-id`, regenerate code and retry (up to 3 attempts)
- [x] 3.4 Remove `createOffer()` and `acceptAnswer()` public methods from `HostRoom`
- [x] 3.5 Expose `roomCode: string` and `roomUrl: string` as `HostRoom` properties

## 4. Rewrite PeerConn Signaling

- [x] 4.1 Replace `connectToOffer(offerSdp)` in `PeerConn` with `connectToRoom(roomCode: string)` that creates a PeerJS `Peer` and opens a data connection to the host's peer ID
- [x] 4.2 Wire the PeerJS `DataConnection` open/data/close events to the existing `connected` / `op` / `disconnected` events
- [x] 4.3 Remove `connectToOffer` from `PeerConn`

## 5. Remove SDP URL Helpers

- [x] 5.1 Delete or gut `src/network/sdp.ts` — remove `buildOfferUrl`, `buildAnswerUrl`, `extractOfferFromHash`, `extractAnswerFromHash`, `encodeSdp`, `decodeSdp` (keep `waitForIceComplete` only if still needed by PeerJS internals, otherwise delete the file)

## 6. Simplify Connect UI

- [x] 6.1 Remove `showPeerConnectFlow` from `src/ui/connect-flow.ts` (peer no longer sees an answer-code overlay)
- [x] 6.2 Rewrite `showHostConnectPanel` to show only the share URL and a "Copy link" button (remove the answer-paste textarea and "Invite peer" button for SDP entry)
- [x] 6.3 Update peer count display in the host panel to use existing `peer_connected` / `peer_disconnected` events

## 7. Update App Startup Logic

- [x] 7.1 In `src/main.ts`, replace the `extractOfferFromHash()` branch with `extractRoomCodeFromHash()` to determine if the user is a joining peer
- [x] 7.2 Update the peer startup path to call `conn.connectToRoom(roomCode)` instead of `conn.connectToOffer(offerSdp)`
- [x] 7.3 Update the host startup path to instantiate `HostRoom` and read `room.roomUrl` for display (no separate offer generation step)
- [x] 7.4 Remove any remaining references to old SDP URL helpers

## 8. Cleanup & Verification

- [x] 8.1 Delete any dead imports left over from the SDP-based flow
- [x] 8.2 Confirm TypeScript compiles with no errors (`tsc --noEmit`)
- [ ] 8.3 Manual smoke test: host opens app → copies room link → peer opens link → both see the shared canvas
- [ ] 8.4 Manual smoke test: two peers join the same room link simultaneously and both connect successfully
