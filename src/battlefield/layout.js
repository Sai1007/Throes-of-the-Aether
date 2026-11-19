/*
 * THROES OF THE AETHER — GA2 battlefield layout
 * Generates one randomized layout per match; later the LAN server will
 * send the same layout to both clients. This module contains no rendering.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BattlefieldLayout = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const SIZE = 10;
  const key = (x, z) => `${x},${z}`;
  const neighbors = (x, z) => [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]
    .filter(([nx, nz]) => nx >= 0 && nx < SIZE && nz >= 0 && nz < SIZE);

  // Ensures every non-obstacle tile is connected, so there are no trapped routes.
  function connected(obstacles) {
    const blocked = new Set(obstacles.flatMap(o => {
      const cells = [];
      for (let i = 0; i < (o.length || 1); i++) {
        cells.push(key(o.x + (o.axis === 'x' ? i : 0), o.z + (o.axis === 'z' ? i : 0)));
      }
      return cells;
    }));
    let start = null;
    for (let z = 0; z < SIZE && !start; z++) {
      for (let x = 0; x < SIZE; x++) {
        if (!blocked.has(key(x, z))) { start = [x, z]; break; }
      }
    }
    if (!start) return false;
    const queue = [start], seen = new Set([key(...start)]);
    for (let i = 0; i < queue.length; i++) {
      const [x, z] = queue[i];
      for (const [nx, nz] of neighbors(x, z)) {
        const k = key(nx, nz);
        if (!blocked.has(k) && !seen.has(k)) { seen.add(k); queue.push([nx, nz]); }
      }
    }
    return seen.size === SIZE * SIZE - blocked.size;
  }

  function generateLayout(random = Math.random) {
    // First and last rows are entirely open for later player-selected deployment.
    // Generate 6–10 occupied tiles, made from 1-tile pillars and 1–2 tile walls.
    for (let attempt = 0; attempt < 250; attempt++) {
      const target = 6 + Math.floor(random() * 5);
      const obstacles = [], occupied = new Set();
      let failed = 0;
      while (occupied.size < target && failed < 200) {
        const type = random() < 0.48 ? 'pillar' : 'wall';
        const remaining = target - occupied.size;
        const length = type === 'wall' && remaining > 1 && random() < 0.65 ? 2 : 1;
        const axis = random() < 0.5 ? 'x' : 'z';
        const x = Math.floor(random() * (axis === 'x' ? SIZE - length + 1 : SIZE));
        const z = 1 + Math.floor(random() * (axis === 'z' ? SIZE - length - 1 : SIZE - 2));
        const cells = [];
        for (let i = 0; i < length; i++) {
          cells.push([x + (axis === 'x' ? i : 0), z + (axis === 'z' ? i : 0)]);
        }
        if (cells.some(([cx, cz]) => cz < 1 || cz > 8 || occupied.has(key(cx, cz)))) {
          failed++; continue;
        }
        cells.forEach(([cx, cz]) => occupied.add(key(cx, cz)));
        obstacles.push({ x, z, type, length, axis });
      }
      if (occupied.size !== target || !connected(obstacles)) continue;
      // The sides may differ, but neither side should monopolize cover.
      const left = [...occupied].filter(k => Number(k.split(',')[1]) < 5).length;
      const right = target - left;
      if (Math.abs(left - right) > 3) continue;
      return { size: SIZE, obstacles, obstacleTiles: target, deploymentRows: [0, 9] };
    }
    // Safe fallback if random choices repeatedly fail.
    const obstacles = [
      {x:2,z:2,type:'pillar',length:1,axis:'x'},
      {x:7,z:7,type:'pillar',length:1,axis:'x'},
      {x:6,z:3,type:'pillar',length:1,axis:'x'},
      {x:3,z:6,type:'pillar',length:1,axis:'x'},
      {x:4,z:4,type:'wall',length:2,axis:'x'},
      {x:5,z:7,type:'pillar',length:1,axis:'x'}
    ];
    return { size: SIZE, obstacles, obstacleTiles: 7, deploymentRows: [0, 9] };
  }
  return { SIZE, generateLayout, connected, key };
});
