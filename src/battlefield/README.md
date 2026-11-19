# Throes of the Aether — GA2 Battlefield Preview

## Purpose
A PC-browser-only, WebGL 1 battlefield prototype for CMPSC 457 GA2. This package intentionally does **not** implement player characters, movement, combat, turn management, or LAN networking. It doesn't change your existing `character.js`.

## Installation
Copy `index.html`, `grid.js`, and `layout.js` into `src/client/battlefield/`. Open `index.html` using VS Code **Live Server** (or directly in Chrome/Edge). No external libraries or npm installation is required.

## Features
- 10 × 10 flat stone-tile battlefield, with subtle seams and low stone borders.
- New **controlled random** obstacle layout for every generated match: 6–10 occupied tiles, one-tile pillars and one- or two-tile walls.
- First/last deployment rows kept clear, all traversable tiles connected, and obstacle distribution roughly balanced across halves.
- Fixed decorative ruins **outside** the playable area.
- Custom 3D vertex geometry, model-view transforms, custom GLSL shaders, ambient and directional illumination, simple projected obstacle shadows.
- Full laptop browser viewport: ~75% battlefield and ~25% reserved right-side interface.
- Click a battlefield tile to select it and fill the placement coordinates; left-drag still orbits the camera.
- **Independent per-client camera**: left-drag rotates horizontally/vertically, right-drag pans, mouse wheel zooms, R smooth camera reset, P switches orthographic/perspective; projection starts orthographic.
- Right-side panel with Movement, Combat, Abilities and Actions *placeholders*, a disabled End Turn button, camera controls and preview-only map regeneration.

## File reference
- `index.html`: screen layout, panel content and browser script loading.
- `layout.js`: randomized obstacle generation and tile connectivity tests. Later the **server should generate one map and broadcast it to both browsers**; do not let each browser independently generate maps in actual LAN matches.
- `grid.js`: WebGL geometry, drawing, shaders, camera and UI event handlers. It intentionally contains no character objects or combat logic.

## Important distinction
The **Preview New Map** button is for development only. The final game will automatically generate one layout at the start of each match; players and the host should not be able to choose or reroll it. The two player cameras are independent, but the obstacle layout must be synchronized by the server when networking is implemented.

## Verification
From the repository root:

```powershell
node --check src/client/battlefield/layout.js
node --check src/client/battlefield/grid.js
node src/client/battlefield/tests/layout.test.js
```

For the third command, also copy the `tests/` directory from this package. In the browser, verify that the grid renders, clicking a tile selects it and updates the placement coordinates, drag/zoom controls work, R resets smoothly, P toggles projection, and new maps preserve an open deployment row on both sides.

## Later integrations — not implemented here
- Two characters, player-relative friendly/red rendering and labels.
- Follow camera, selected path glow, keyboard picking, obstacle fade for a character or selected path, deployment confirmation.
- Turn timer, game-state HUD values, battle animations and attack close-ups.
- Authoritative LAN server state for a common randomized arena.

All above are later integration tasks, not features to claim as demonstrated in this isolated battlefield preview.
