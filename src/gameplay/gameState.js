/* Throes of the Aether — GA2 shared state.
 * Works in Node (require) and a regular browser (script tags).
 * This is a local preview; LAN server authority comes later.
 */
(function(root,factory){
  const isNode=typeof module!=='undefined'&&module.exports;
  const characters=isNode?require('../character/character.js').players:root.GameCharacters.players;
  const api=factory(characters);
  if(isNode)module.exports=api;
  else root.GameState=api;
})(typeof window!=='undefined'?window:globalThis,function(characters){
  'use strict';
  const SIZE=10;
  const gameState={phase:'deployment',gridSize:SIZE,currentTurn:'player1',
    players:{
      player1:{character:characters.player1,position:{x:4,z:0}},
      player2:{character:characters.player2,position:{x:5,z:9}}
    },obstacles:[]};
  const isInsideGrid=(x,z)=>Number.isInteger(x)&&Number.isInteger(z)&&x>=0&&z>=0&&x<SIZE&&z<SIZE;
  function expandObstacles(obstacles){
    const cells=[];
    for(const o of obstacles){
      if(!o||typeof o!=='object')return null;
      const len=o.length===undefined?1:o.length;
      const axis=o.axis||'x';
      if(!o||!['wall','pillar'].includes(o.type)||!Number.isInteger(len)||len<1||len>2||
         (o.type==='pillar'&&len!==1)||!['x','z'].includes(axis))return null;
      for(let i=0;i<len;i++){
        const x=o.x+(axis==='x'?i:0),z=o.z+(axis==='z'?i:0);
        if(!isInsideGrid(x,z)||z===0||z===9)return null;
        cells.push({x,z});
      }
    }
    const keys=cells.map(c=>`${c.x},${c.z}`);
    if(new Set(keys).size!==keys.length)return null;
    return cells;
  }

  function isObstacle(x,z){
    const cells=expandObstacles(gameState.obstacles)||[];
    return cells.some(p=>p.x===x&&p.z===z);
  }

  function isOccupied(x,z,ignoreId=null){
    return Object.entries(gameState.players).some(([id,p])=>id!==ignoreId&&p.position.x===x&&p.position.z===z);
  }

  function getPlayerIdAt(x,z){
    const entry=Object.entries(gameState.players)
      .find(([,player])=>player.position.x===x&&player.position.z===z);
    return entry?entry[0]:null;
  }

  function isTileAvailable(x,z,ignoreId=null){return isInsideGrid(x,z)&&!isObstacle(x,z)&&!isOccupied(x,z,ignoreId);}
  // This is placement only: turn rules, path validity, STA, and range are NOT checked here.
  function setPlayerPosition(id,x,z){
    const p=gameState.players[id];
    if(!p||!isTileAvailable(x,z,id))return false;
    p.position={x,z};return true;
  }
  function setObstacles(next){
    if(!Array.isArray(next))return false;
    const cells=expandObstacles(next);
    if(!cells||cells.some(p=>isOccupied(p.x,p.z)))return false;
    gameState.obstacles=next.map(o=>({...o}));return true;
  }
  const getPlayer=id=>gameState.players[id]||null;
  const showGameState=()=>console.log(JSON.stringify(gameState,null,2));
  return {gameState,isInsideGrid,isObstacle,isOccupied,isTileAvailable,setPlayerPosition,setObstacles,getPlayer,getPlayerIdAt,showGameState,expandObstacles};
});
