# Throes of the Aether

A proposed browser-based 3D, turn-based tactical LAN PvP game for **CMPSC 457**.

## Project concept
Two players connect through a local-network lobby, customize a character, and battle on a 10×10 grid. The planned prototype emphasizes turn-based movement and combat, with Sword and Staff weapons and elemental abilities (Earth, Fire, Water, Air, Aether).

**Status:** planning/proposal. This repository starter does not claim playable features are implemented.

## Technology plan
- **Rendering:** WebGL with team-written GLSL shaders and MV.js (no full 3D engine).
- **Game client:** HTML, CSS, and JavaScript.
- **LAN server:** Node.js with a WebSocket library such as `ws` (planned).
- **Graphics requirements:** custom vertex geometry, model-view transforms, movable camera and projection, input, requestAnimationFrame animation, lighting/shading.
- **Advanced features planned:** hierarchical modeling and object picking.

## Repository layout
```text
assets/             Approved artwork, element symbols, sketches
src/client/         Browser, WebGL, gameplay UI
src/server/         LAN WebSocket server
shared/             Shared game rules and message definitions (add when needed)
tests/              Manual/automated tests
docs/               Proposal, storyboard, AI use log, team agreement
```

## Team workflow
All team members may contribute to all areas. Task ownership and meeting schedule will be decided collaboratively and documented in `docs/TEAM_AGREEMENT.md`.

Suggested workflow: create an issue for each feature, work on branches, review pull requests, merge only after testing. Do not commit credentials, personal data, or copyrighted artwork without permission.

## Getting started
The repository is a scaffold. Running instructions will be added when the first working client and server are committed.

## Documentation
- [AI Use Log](docs/AI_USE_LOG.md)
- [Team Agreement](docs/TEAM_AGREEMENT.md)
- [Implementation Checklist](docs/IMPLEMENTATION_CHECKLIST.md)
