const assert = require('node:assert/strict');
const {generateLayout,connected,key} = require('../layout.js');
for(let i=0;i<500;i++){
 const layout=generateLayout();
 assert.equal(layout.size,10);
 assert.ok(layout.obstacleTiles>=6 && layout.obstacleTiles<=10);
 assert.ok(connected(layout.obstacles));
 const occupied=new Set();
 for(const o of layout.obstacles){
  assert.ok(['wall','pillar'].includes(o.type));
  assert.ok(o.length>=1&&o.length<=2);
  for(let j=0;j<o.length;j++){
   const x=o.x+(o.axis==='x'?j:0),z=o.z+(o.axis==='z'?j:0);
   assert.ok(x>=0&&x<=9&&z>=1&&z<=8);
   assert.ok(!occupied.has(key(x,z)));
   occupied.add(key(x,z));
  }
 }
 assert.equal(occupied.size,layout.obstacleTiles);
}
console.log('PASS: 500 generated layouts have 6–10 unique blocked tiles, open deployment rows, and connected paths.');
