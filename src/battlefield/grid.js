/*
 * THROES OF THE AETHER — GA2 3D battlefield
 * WebGL 1 custom geometry, lighting, shadows, scene and independent local camera.
 * Includes two simple player models and placement; turns, attacks and LAN networking are pending.
 */
(() => {
  'use strict';
  const canvas = document.getElementById('glCanvas');
  const status = document.getElementById('status');
  const gl = canvas.getContext('webgl', { antialias:true, alpha:false });
  if (!gl) { status.textContent = 'WebGL unavailable. Enable hardware acceleration or use Chrome/Edge.'; return; }
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  const vertexSource = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    uniform mat4 uModel;
    uniform mat4 uViewProjection;
    varying vec3 vNormal;
    void main() {
      vec4 world = uModel * vec4(aPosition,1.0);
      gl_Position = uViewProjection * world;
      vNormal = normalize(mat3(uModel) * aNormal);
    }
  `;
  const fragmentSource = `
    precision mediump float;
    varying vec3 vNormal;
    uniform vec3 uColor;
    uniform float uAlpha;
    void main() {
      vec3 lightDir = normalize(vec3(-0.55, 1.0, 0.6));
      float diffuse = max(dot(normalize(vNormal),lightDir),0.0);
      float illumination = 0.48 + 0.52 * diffuse;
      gl_FragColor = vec4(uColor*illumination, uAlpha);
    }
  `;
  function shader(kind, source) {
    const s = gl.createShader(kind);
    gl.shaderSource(s, source); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  const program = gl.createProgram();
  gl.attachShader(program,shader(gl.VERTEX_SHADER,vertexSource));
  gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const vars = {
    position:gl.getAttribLocation(program,'aPosition'), normal:gl.getAttribLocation(program,'aNormal'),
    model:gl.getUniformLocation(program,'uModel'), vp:gl.getUniformLocation(program,'uViewProjection'),
    color:gl.getUniformLocation(program,'uColor'), alpha:gl.getUniformLocation(program,'uAlpha')
  };

  // Geometry: 6 quad faces * 2 triangles, with outward-facing normals.
  const vertices = [];
  function face(a,b,c,d,n) {
    for(const p of [a,b,c,a,c,d]) vertices.push(...p,...n);
  }
  face([-.5,.5,-.5],[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[0,1,0]);
  face([-.5,-.5,.5],[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[0,-1,0]);
  face([-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5],[0,0,1]);
  face([.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5],[0,0,-1]);
  face([.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5],[1,0,0]);
  face([-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5],[-1,0,0]);
  const vertexBuffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(vars.position);
  gl.vertexAttribPointer(vars.position,3,gl.FLOAT,false,24,0);
  gl.enableVertexAttribArray(vars.normal);
  gl.vertexAttribPointer(vars.normal,3,gl.FLOAT,false,24,12);

  // Matrix utilities use WebGL column-major matrices.
  function mult(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
  function model(x,y,z,sx,sy,sz){return new Float32Array([sx,0,0,0,0,sy,0,0,0,0,sz,0,x,y,z,1]);}
  function normalize(v){const m=Math.hypot(...v)||1;return v.map(n=>n/m);}
  function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
  function dot(a,b){return a.reduce((s,v,i)=>s+v*b[i],0);}
  function lookAt(eye,target){
    const back=normalize(eye.map((v,i)=>v-target[i]));
    const right=normalize(cross([0,1,0],back));
    const up=cross(back,right);
    return new Float32Array([
      right[0],up[0],back[0],0,
      right[1],up[1],back[1],0,
      right[2],up[2],back[2],0,
      -dot(right,eye),-dot(up,eye),-dot(back,eye),1
    ]);
  }
  function ortho(l,r,b,t,n,f){return new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]);}
  function perspective(fov,aspect,n,f){const q=1/Math.tan(fov/2);return new Float32Array([q/aspect,0,0,0,0,q,0,0,0,0,(f+n)/(n-f),-1,0,0,2*f*n/(n-f),0]);}
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const camera={ azimuth:Math.PI/4, elevation:Math.PI/3.9, distance:20, target:[0,0,0], projection:'ortho' };
  const defaults={azimuth:Math.PI/4,elevation:Math.PI/3.9,distance:20,target:[0,0,0]};
  let smoothTarget=null;
  const cameraEye=()=>[
    camera.target[0]+camera.distance*Math.cos(camera.elevation)*Math.cos(camera.azimuth),
    camera.target[1]+camera.distance*Math.sin(camera.elevation),
    camera.target[2]+camera.distance*Math.cos(camera.elevation)*Math.sin(camera.azimuth)
  ];
  const stateApi = window.GameState;
  const gameState = stateApi.gameState;
  let layout=BattlefieldLayout.generateLayout();
  if(!stateApi.setObstacles(layout.obstacles))throw new Error('Initial battlefield layout rejected');
  let localPlayerId='player1';
  
  let selectedTile=null;
  
  let PlayerSelected=null;
  const MOVE_RANGE=3;

  const friendlyColors={Blue:[.16,.48,.88],White:[.89,.90,.92],Green:[.18,.76,.42],Yellow:[.93,.78,.20]};
  function ownPlayer(){return gameState.players[localPlayerId];}
  function opponentId(){return localPlayerId==='player1'?'player2':'player1';}
  function updateCharacterInfo(){
    const own=ownPlayer(),enemy=gameState.players[opponentId()];
    document.getElementById('ownName').textContent=own.character.name;
    document.getElementById('ownPosition').textContent=`(${own.position.x}, ${own.position.z})`;
    document.getElementById('ownHP').textContent=`${own.character.currentHP} / ${own.character.stats.HP}`;
    document.getElementById('ownSTA').textContent=`${own.character.currentStamina} / ${own.character.stats.STA}`;
    document.getElementById('opponentInfo').textContent=`${enemy.character.name} · HP ${enemy.character.currentHP} / ${enemy.character.stats.HP}`;
    document.getElementById('hpBar').style.width=`${100*own.character.currentHP/own.character.stats.HP}%`;
    document.getElementById('staBar').style.width=`${100*own.character.currentStamina/own.character.stats.STA}%`;
    document.getElementById('placeX').value=own.position.x;
    document.getElementById('placeZ').value=own.position.z;
  }
  function playerModel(id){
    const p=gameState.players[id];
    const own=id===localPlayerId;
    const color=own?(friendlyColors[p.character.friendlyColor]||friendlyColors.Blue):[.84,.15,.15];
    const x=tileWorld(p.position.x),z=tileWorld(p.position.z);
    // Simple hierarchical model made from cubes (torso, legs, arms, head).
    box(x,.52,z,.42,.66,.26,color);
    box(x,.99,z,.31,.31,.31,[.85,.72,.58]);
    box(x-.13,.15,z,.13,.31,.16,[.20,.24,.28]);
    box(x+.13,.15,z,.13,.31,.16,[.20,.24,.28]);
    box(x-.30,.58,z,.14,.48,.15,color);
    box(x+.30,.58,z,.14,.48,.15,color);
    // White/red base makes ground position easy to identify.
    box(x,.113,z,.78,.025,.78,own?[.94,.93,.72]:[.85,.28,.28]);
  }
  updateCharacterInfo();
  document.getElementById('viewPlayer').addEventListener('change',e=>{
    localPlayerId=e.target.value;
    updateCharacterInfo();
  });
  document.getElementById('placePlayer').addEventListener('click',()=>{
    const x=Number(document.getElementById('placeX').value);
    const z=Number(document.getElementById('placeZ').value);
    const ok=stateApi.setPlayerPosition(localPlayerId,x,z);
    document.getElementById('placementResult').textContent=ok?'Position updated':'Invalid tile: out of bounds, blocked, or occupied';
    if(ok)updateCharacterInfo();
  });
  function occupiedCells(){return layout.obstacles.flatMap(o=>Array.from({length:o.length},(_,i)=>({x:o.x+(o.axis==='x'?i:0),z:o.z+(o.axis==='z'?i:0),o})));}
  
  //Create a box from (x,y,z) -> (sx,sy,sz) of a color
  function box(x,y,z,sx,sy,sz,color,alpha=1){
    gl.uniformMatrix4fv(vars.model,false,model(x,y,z,sx,sy,sz));
    gl.uniform3fv(vars.color,color);
    gl.uniform1f(vars.alpha,alpha);
    gl.drawArrays(gl.TRIANGLES,0,36);
  }
  function tileWorld(n){return n-4.5;}

  //Matthew

  // Return the ID of the player occupying the clicked tile, or null.
  function getPlayer(tile){
    return stateApi.getPlayerIdAt(tile.x,tile.z);
  }

  function selectPlayer(playerId){
    PlayerSelected=playerId;
  }

  // Draw all of the tiles that are within move range of the selected player, if there is a player selected.
  function drawMoveableTiles(playerId){
    const player=gameState.players[playerId];
    if(!player)return;

    //This uses manhattan distance, d = |i - x| + |j - y|
    setTransparency(true);
    //Loop through all of the tiles in the grid
    //If the tile is less than the move distance of the selected player, it is highlighted blue.
    for(let z=0;z<gameState.gridSize;z++){
      for(let x=0;x<gameState.gridSize;x++){
        const distance=Math.abs(x-player.position.x)+Math.abs(z-player.position.z);
        //If the current tiles
        if(distance===0||distance>MOVE_RANGE||!stateApi.isTileAvailable(x,z,playerId))continue;
        box(tileWorld(x),.12,tileWorld(z),.86,.02,.86,[.22,.72,.88],.6);
      }
    }
    setTransparency(false);
  }

  //This is the function for selecting a tile.
  function selectTile(clientX,clientY){
    //Find the tile that is being clicked on from the camera eye 
    const rect=canvas.getBoundingClientRect();
    const x=2*(clientX-rect.left)/rect.width-1;
    const y=1-2*(clientY-rect.top)/rect.height;
    const eye=cameraEye();
    const backward=normalize(eye.map((value,i)=>value-camera.target[i]));
    const right=normalize(cross([0,1,0],backward));
    const up=cross(backward,right);
    const forward=backward.map(value=>-value);
    const aspect=rect.width/rect.height;
    let origin,direction;

    if (camera.projection==='ortho'){
      const halfHeight=camera.distance*.40;
      const halfWidth=halfHeight*aspect;
      origin=eye.map((value,i)=>value+right[i]*x*halfWidth+up[i]*y*halfHeight);
      direction=forward;
    }
    else{
      //If the camera is in perspective,
      const spread=Math.tan(Math.PI/8);
      direction=normalize(forward.map((value,i)=>value+right[i]*x*spread*aspect+up[i]*y*spread));
      origin=eye;
    }
    if(direction[1]>=0)return;
    const distance=(.105-origin[1])/direction[1];
    if(distance<0)return;
    const worldX=origin[0]+direction[0]*distance;
    const worldZ=origin[2]+direction[2]*distance;
    const tile={x:Math.floor(worldX+5),z:Math.floor(worldZ+5)};
    //If the tile selected is out of bounds, do nothing.
    if(tile.x<0||tile.x>=10||tile.z<0||tile.z>=10)return;

    const playerId=getPlayer(tile);

    // Click the current tile again to clear the selection.
    if(selectedTile&&selectedTile.x===tile.x&&selectedTile.z===tile.z){
      selectedTile=null;
      selectPlayer(null);
      return;
    }

    //If a player is selected, clicking a tile within moving distance will move the player there.
    if(PlayerSelected){
      const player=gameState.players[PlayerSelected];
      if(!player){
        selectPlayer(null);
      }else{
        const distance=Math.abs(tile.x-player.position.x)+Math.abs(tile.z-player.position.z);
          stateApi.isTileAvailable(tile.x,tile.z,PlayerSelected);
        if(distance > MOVE_RANGE){
          return;
        }
        else{
          if(stateApi.setPlayerPosition(PlayerSelected,tile.x,tile.z)){
          selectedTile=tile;
          if(PlayerSelected===localPlayerId)updateCharacterInfo();
          document.getElementById('placementResult').textContent=`Player ${PlayerSelected} moved to (${tile.x}, ${tile.z})`;
          selectPlayer(null);
          selectedTile = null;
        }else{
          document.getElementById('placementResult').textContent='Could not move player to that tile';
        }
        return;
        }
        
      }
    }

    //Otherwise, select the tile.
    selectedTile=tile;
    selectPlayer(playerId);

    //Code to make the hud say that you're clicking on them
    document.getElementById('placeX').value=tile.x;
    document.getElementById('placeZ').value=tile.z;
    document.getElementById('placementResult').textContent=playerId
      ?`Player ${playerId} has been clicked`
      :`Selected tile (${tile.x}, ${tile.z}). Click Place player to confirm.`;
  }

  //Matthew
  //Draw a blue box where a tile is selected
  function drawSelectedTile(){
    if(!selectedTile)return;
    const x=tileWorld(selectedTile.x),z=tileWorld(selectedTile.z),y=.12;
    const color=[.22,.84,.96];

    //Could also go with a border, instead of a solid color.
    // box(x,y,z-edge/2+thickness/2,edge,.035,thickness,color);
    // box(x,y,z+edge/2-thickness/2,edge,.035,thickness,color);
    // box(x-edge/2+thickness/2,y,z,thickness,.035,edge,color);
    // box(x+edge/2-thickness/2,y,z,thickness,.035,edge,color);

    setTransparency(true);
    box(x,y,z,1,0.01,1,color)
    setTransparency(false);
  }
  // Static decorative ruins sit outside all gameplay tiles; they don't block paths.
  function scenery(){
    box(0,-.44,0,18,.55,18,[.32,.34,.32]);
    box(0,-.13,0,10.55,.18,10.55,[.31,.32,.32]);
    const border=[[-5.17,0,.26,10.7],[5.17,0,.26,10.7],[0,-5.17,10.7,.26],[0,5.17,10.7,.26]];
    for(const [x,z,sx,sz] of border) box(x,.13,z,sx,.35,sz,[.61,.6,.55]);
    // Distant fragments of ruins (fixed between matches).
    for(const [x,z,h] of [[-7,-6,1.65],[-6,7,1.2],[7,-7,1.6],[7,6,1.3]]){
      box(x,h/2-.1,z,.88,h,.88,[.52,.52,.49]);
      box(x,h-.08,z,1.13,.22,1.13,[.61,.60,.55]);
    }
    for(const [x,z,sx,sz] of [[-7,1,.7,3.3],[7,-1,.7,3.0],[1,-7,3.0,.7],[-1,7,3.1,.7]]){
      box(x,.32,z,sx,.9,sz,[.47,.48,.46]);
    }
  }
  function arena(){
    for(let z=0;z<10;z++)for(let x=0;x<10;x++){
      const c=(x+z)%2===0?[.65,.67,.62]:[.59,.62,.58];
      // Each tile is a 3D box separated by subtle stone seams.
      box(tileWorld(x),.025,tileWorld(z),.985,.16,.985,c);
    }
  }
  function obstacleShadow(cx,cz,w,d){
    // Ground-projected geometric shadow; no expensive shadow mapping.
    box(cx+.24,.117,cz+.28,w+.18,.006,d+.18,[.13,.16,.15],.38);
  }
  function obstacleParts(o,alpha){
    const w=o.axis==='x'?o.length:1,d=o.axis==='z'?o.length:1;
    const x=tileWorld(o.x)+(w-1)/2,z=tileWorld(o.z)+(d-1)/2;
    if(o.type==='pillar'){
      box(x,.29,z,.84,.20,.84,[.51,.52,.49],alpha);
      box(x,1.05,z,.59,1.37,.59,[.57,.56,.52],alpha);
      box(x,1.77,z,.82,.22,.82,[.66,.63,.57],alpha);
    }else{
      box(x,.59,z,w-.08,1.13,d-.08,[.53,.54,.51],alpha);
      box(x,1.19,z,w,.13,d,[.62,.61,.55],alpha);
    }
  }
  function setTransparency(enabled){
    if(enabled){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);}
    else{gl.depthMask(true);gl.disable(gl.BLEND);}
  }
  function updateInfo(){
    document.getElementById('layout-info').textContent=`10 × 10 tiles · ${layout.obstacleTiles} blocked tiles · One-row deployment zones`;
  }
  updateInfo();
  // Mouse interaction modifies only this browser's camera; no network messages.
  let dragging=false,mode='orbit',lastX=0,lastY=0,startX=0,startY=0,pointerMoved=false;
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0&&e.button!==2)return;
    dragging=true; mode=e.button===2?'pan':'orbit';
    lastX=startX=e.clientX;lastY=startY=e.clientY;pointerMoved=false;canvas.setPointerCapture(e.pointerId);
    smoothTarget=null;
  });
  canvas.addEventListener('pointermove',e=>{
    if(!dragging)return;
    const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;
    if(Math.hypot(e.clientX-startX,e.clientY-startY)>5)pointerMoved=true;
    if(mode==='orbit'&&!pointerMoved)return;
    if(mode==='orbit'){
      camera.azimuth-=dx*.007;
      camera.elevation=clamp(camera.elevation+dy*.006,.20,1.39);
    }else{
      const scale=camera.distance*.00115;
      const right=[-Math.sin(camera.azimuth),0,Math.cos(camera.azimuth)];
      const forward=[Math.cos(camera.azimuth),0,Math.sin(camera.azimuth)];
      camera.target[0]=clamp(camera.target[0]-right[0]*dx*scale+forward[0]*dy*scale,-4.7,4.7);
      camera.target[2]=clamp(camera.target[2]-right[2]*dx*scale+forward[2]*dy*scale,-4.7,4.7);
    }
  });
  function endDrag(){dragging=false;}

  //When the player releases their click, only select the tile if the mouse hasn't moved
  canvas.addEventListener('pointerup',e=>{
    if(dragging&&mode==='orbit'&&!pointerMoved)selectTile(e.clientX,e.clientY);
    endDrag();
  });
  canvas.addEventListener('pointercancel',endDrag);
  canvas.addEventListener('wheel',e=>{e.preventDefault();smoothTarget=null;camera.distance=clamp(camera.distance*Math.exp(e.deltaY*.001),9,31);},{passive:false});
  function resetCamera(){smoothTarget={azimuth:defaults.azimuth,elevation:defaults.elevation,distance:defaults.distance,target:[...defaults.target]};}
  function toggleProjection(){camera.projection=camera.projection==='ortho'?'perspective':'ortho';document.getElementById('projection').textContent=camera.projection==='ortho'?'Perspective (P)':'Orthographic (P)';}
  function regenerate(){
    // Try alternate generated layouts if one would overlap a placed character.
    for(let i=0;i<50;i++){
      const next=BattlefieldLayout.generateLayout();
      if(stateApi.setObstacles(next.obstacles)){
        layout=next;updateInfo();
        document.getElementById('placementResult').textContent='New map synced to shared state';
        return;
      }
    }
    document.getElementById('placementResult').textContent='Could not find a clear map for the current player positions';
  }
  document.getElementById('reset').addEventListener('click',resetCamera);
  document.getElementById('projection').addEventListener('click',toggleProjection);
  document.getElementById('layout').addEventListener('click',regenerate);
  window.addEventListener('keydown',e=>{
    if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;
    if(e.key.toLowerCase()==='r')resetCamera();
    if(e.key.toLowerCase()==='p')toggleProjection();
  });
  const tabCopy={
    Movement:'Planned: keyboard path preview, stamina cost, and confirm movement. Not yet implemented in the battlefield renderer.',
    Combat:'Planned: Sword/Staff attacks, ranges and attack camera. Not yet implemented.',
    Abilities:'Planned: elemental abilities, depending on game state. Not yet implemented.',
    Actions:'Planned: Defend, Rest and End Turn. Not yet implemented.'
  };
  document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{
    document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-selected',String(b===button));});
    document.getElementById('tab-content').textContent=tabCopy[button.dataset.tab];
  }));
  // Animation loop is used for smooth camera reset, not decorative effects.
  function draw(){
    if(smoothTarget){
      camera.azimuth+=(smoothTarget.azimuth-camera.azimuth)*.16;
      camera.elevation+=(smoothTarget.elevation-camera.elevation)*.16;
      camera.distance+=(smoothTarget.distance-camera.distance)*.16;
      for(let i=0;i<3;i++)camera.target[i]+=(smoothTarget.target[i]-camera.target[i])*.16;
      if(Math.abs(camera.azimuth-smoothTarget.azimuth)+Math.abs(camera.elevation-smoothTarget.elevation)+Math.abs(camera.distance-smoothTarget.distance)<.005){
        Object.assign(camera,{azimuth:smoothTarget.azimuth,elevation:smoothTarget.elevation,distance:smoothTarget.distance,target:[...smoothTarget.target]});smoothTarget=null;
      }
    }
    const w=canvas.clientWidth,h=canvas.clientHeight;
    if(w>0&&h>0){
      const ratio=Math.min(window.devicePixelRatio||1,2);
      const dw=Math.round(w*ratio),dh=Math.round(h*ratio);
      if(canvas.width!==dw||canvas.height!==dh){canvas.width=dw;canvas.height=dh;}
    }
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.clearColor(.59,.66,.68,1);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const aspect=canvas.width/canvas.height;
    const halfHeight=camera.distance*.40;
    const proj=camera.projection==='ortho'
      ?ortho(-halfHeight*aspect,halfHeight*aspect,-halfHeight,halfHeight,.1,120)
      :perspective(Math.PI/4,aspect,.1,120);
    gl.uniformMatrix4fv(vars.vp,false,mult(proj,lookAt(cameraEye(),camera.target)));
    scenery();arena();drawMoveableTiles(PlayerSelected);drawSelectedTile();
    const objects=layout.obstacles;
    // Draw projected shadows with blending; they do not change collision rules.
    setTransparency(true);
    for(const o of objects){const w=o.axis==='x'?o.length:1,d=o.axis==='z'?o.length:1;obstacleShadow(tileWorld(o.x)+(w-1)/2,tileWorld(o.z)+(d-1)/2,w,d);}
    setTransparency(false);
    for(const o of objects)obstacleParts(o,1);
    playerModel('player1');playerModel('player2');
    requestAnimationFrame(draw);
  }
  status.textContent='Left-drag: orbit/tilt  •  Right-drag: pan  •  Wheel: zoom  •  R: reset  •  P: projection  •  Characters connected · positions testable';
  draw();
})();
