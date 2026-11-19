const assert=require('node:assert/strict');
const state=require('./gameState.js');
const layout=require('../battlefield/layout.js');
assert.equal(state.setPlayerPosition('player1',3,2),true);
assert.equal(state.getPlayerIdAt(3,2),'player1');
assert.equal(state.getPlayerIdAt(5,9),'player2');
assert.equal(state.getPlayerIdAt(0,0),null);
assert.equal(state.setPlayerPosition('player2',3,2),false);
assert.equal(state.setPlayerPosition('player1',10,3),false);
assert.equal(state.setObstacles([{x:4,z:4,type:'wall',length:2,axis:'x'}]),true);
assert.equal(state.isObstacle(5,4),true);
assert.equal(state.setPlayerPosition('player1',5,4),false);
assert.equal(state.setPlayerPosition('player1',4,0),true);
for(let i=0;i<100;i++){
 const next=layout.generateLayout();
 assert.equal(state.setObstacles(next.obstacles),true);
 for(const obj of next.obstacles)for(let j=0;j<obj.length;j++){
  assert.equal(state.isObstacle(obj.x+(obj.axis==='x'?j:0),obj.z+(obj.axis==='z'?j:0)),true);
 }
}
console.log('PASS: shared state positions, multi-tile walls, and 100 map integrations');
