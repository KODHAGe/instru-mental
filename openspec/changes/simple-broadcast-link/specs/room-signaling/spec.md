## ADDED Requirements

### Requirement: Host creates a room with a short memorable code
When a user opts to host a session, the system SHALL generate a short room code (format: `<adjective>-<noun>-<noun>`) and establish a signaling connection using that code as the host identity.

#### Scenario: Room code is generated on host start
- **WHEN** the user clicks "Host session"
- **THEN** the system SHALL generate a unique room code matching the pattern `<word>-<word>-<word>`

#### Scenario: Room link is displayed to the host
- **WHEN** the host room is ready
- **THEN** the host panel SHALL display a full URL containing `#room=<code>` that can be shared

#### Scenario: Host copy link button
- **WHEN** the host clicks the copy button next to the share link
- **THEN** the full room URL SHALL be written to the clipboard

---

### Requirement: Peer joins by opening the room link
A peer SHALL be able to join a session by opening a URL that contains `#room=<code>` in the hash. No manual SDP exchange or code pasting SHALL be required.

#### Scenario: Peer auto-connects on link open
- **WHEN** a peer opens a URL with `#room=<code>` in the hash
- **THEN** the app SHALL automatically initiate a WebRTC connection to the host identified by `<code>` without any user interaction

#### Scenario: Peer connected state
- **WHEN** the WebRTC data channel is open
- **THEN** the peer view SHALL transition to the canvas without showing any connection code or overlay

#### Scenario: Host not yet ready
- **WHEN** a peer opens the link before the host has established their signaling connection
- **THEN** the system SHALL retry the connection until the host is available or a timeout is reached

---

### Requirement: Multiple peers can join the same room
The system SHALL support multiple concurrent peers connecting to the same room code in a hub-and-spoke topology (all peers connect to the host).

#### Scenario: Second peer joins while first is already connected
- **WHEN** a second peer opens the same room link
- **THEN** the second peer SHALL connect to the host independently without affecting the first peer's connection

#### Scenario: Host peer count updates
- **WHEN** a peer connects or disconnects
- **THEN** the host panel SHALL reflect the current number of connected peers

---

### Requirement: No SDP visible to users
The system SHALL handle the full WebRTC offer/answer exchange automatically. Users SHALL never be shown raw SDP data or asked to copy-paste connection codes.

#### Scenario: No answer code UI shown to peer
- **WHEN** a peer opens a room link
- **THEN** the app SHALL NOT display any textarea or text field containing SDP or encoded connection data

#### Scenario: No paste input on host side
- **WHEN** the host is waiting for peers
- **THEN** the host panel SHALL NOT contain any input field for pasting peer answers

---

### Requirement: Room code collision is handled gracefully
If the generated room code is already in use by another host, the system SHALL automatically generate a new code and retry.

#### Scenario: Collision on code generation
- **WHEN** the generated room code is already taken on the signaling server
- **THEN** the system SHALL generate a new code and retry without user intervention, up to a maximum of 3 attempts

#### Scenario: Exhausted retry attempts
- **WHEN** all retry attempts fail
- **THEN** the system SHALL surface an error message to the user asking them to try hosting again
