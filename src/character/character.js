/*
 * THROES OF THE AETHER — GA2 Character System
 * Character allocation, selections, resources, and pre-battle locking.
 * Combat bonuses and multiplayer validation will be integrated later.
 */

// 1. Character settings
const baseStats = { HP:100, STR:10, DEF:10, STA:10, AGI:10, INT:10 };
const maxStats = { HP:125, STR:25, DEF:25, STA:25, AGI:25, INT:25 };
const statIncrease = { HP:5, STR:1, DEF:1, STA:2, AGI:1, INT:1 };
const totalPoints = 20;
const validWeapons = ['Sword','Staff'];
const validElements = ['Earth','Fire','Water','Air','Aether'];
const validColors = ['Blue','White','Green','Yellow'];

// 2. Create separate character objects for both players
function createCharacter(id) {
  return {
    id, name:id==='player1'?'Player 1':'Player 2', nameConfirmed:false,
    weapon:'Sword', element:'Fire', friendlyColor:'Blue',
    stats:{...baseStats}, pointsRemaining:totalPoints,
    currentHP:baseStats.HP, currentStamina:baseStats.STA,
    ready:false, inBattle:false
  };
}
const players = {player1:createCharacter('player1'),player2:createCharacter('player2')};

// 3. Restrict customization to the pre-Ready, pre-battle phase
function canEditCharacter(player) {
  return !!player && player.ready===false && player.inBattle===false;
}
function isValidStat(statName) {
  return Object.prototype.hasOwnProperty.call(baseStats,statName);
}

// 4. Choose a permanent, unique name (case-insensitive)
function setCharacterName(player,newName) {
  if(!canEditCharacter(player)||player.nameConfirmed||typeof newName!=='string')return false;
  const name=newName.trim();
  if(name.length<1||name.length>16)return false;
  if(Object.values(players).some(other=>other!==player && other.name.toLowerCase()===name.toLowerCase()))return false;
  player.name=name;
  player.nameConfirmed=true;
  return true;
}

// 5. Choose friendly display color, weapon, and element
function selectColor(player,color) {
  if(!canEditCharacter(player)||!validColors.includes(color))return false;
  player.friendlyColor=color;return true;
}
function selectWeapon(player,weaponName) {
  if(!canEditCharacter(player)||!validWeapons.includes(weaponName))return false;
  player.weapon=weaponName;return true;
}
function selectElement(player,elementName) {
  if(!canEditCharacter(player)||!validElements.includes(elementName))return false;
  player.element=elementName;return true;
}

// 6. Spend/refund one bonus point using the correct stat increment
function increaseStat(player,statName) {
  if(!canEditCharacter(player)||!isValidStat(statName)||player.pointsRemaining<=0)return false;
  const amount=statIncrease[statName];
  if(player.stats[statName]+amount>maxStats[statName])return false;
  player.stats[statName]+=amount;
  player.pointsRemaining--;
  if(statName==='HP')player.currentHP=player.stats.HP;
  if(statName==='STA')player.currentStamina=player.stats.STA;
  return true;
}
function decreaseStat(player,statName) {
  if(!canEditCharacter(player)||!isValidStat(statName))return false;
  const amount=statIncrease[statName];
  if(player.stats[statName]-amount<baseStats[statName])return false;
  player.stats[statName]-=amount;
  player.pointsRemaining++;
  if(statName==='HP')player.currentHP=player.stats.HP;
  if(statName==='STA')player.currentStamina=player.stats.STA;
  return true;
}

// 7. Reset allocation only; keep identity, weapon, element and color
function resetCharacter(player) {
  if(!canEditCharacter(player))return false;
  player.stats={...baseStats};player.pointsRemaining=totalPoints;
  resetResources(player);return true;
}

// 8. Ready and Unready lock/unlock pre-match customization
// Set confirmUnused=true after displaying a warning about unused points.
function setReady(player,confirmUnused=false) {
  if(!canEditCharacter(player)||!player.nameConfirmed)return false;
  if(player.pointsRemaining>0&&!confirmUnused){
    console.log(`Warning: You have ${player.pointsRemaining} unused bonus points.`);
    return false;
  }
  player.ready=true;return true;
}
function unreadyCharacter(player) {
  if(!player||player.inBattle)return false;
  player.ready=false;return true;
}
function startBattle(player) {
  if(!player||!player.ready||player.inBattle)return false;
  player.inBattle=true;resetResources(player);return true;
}
function finishBattle(player) {
  if(!player||!player.inBattle)return false;
  player.inBattle=false;player.ready=false;return true;
}

// 9. Battle resources (fractional stamina; integer final damage)
function resetResources(player) {
  player.currentHP=player.stats.HP;
  player.currentStamina=player.stats.STA;
}
function spendStamina(player,amount) {
  if(!player||!Number.isFinite(amount)||amount<=0||amount>player.currentStamina)return false;
  player.currentStamina=Number((player.currentStamina-amount).toFixed(2));return true;
}
function restoreStamina(player,amount) {
  if(!player||!Number.isFinite(amount)||amount<=0)return 0;
  const before=player.currentStamina;
  player.currentStamina=Number(Math.min(player.stats.STA,before+amount).toFixed(2));
  return Number((player.currentStamina-before).toFixed(2));
}
function takeDamage(player,amount) {
  if(!player||!Number.isFinite(amount)||amount<=0)return 0;
  const before=player.currentHP;
  player.currentHP=Math.max(0,before-Math.round(amount));return before-player.currentHP;
}
function heal(player,amount) {
  if(!player||!Number.isFinite(amount)||amount<=0)return 0;
  const before=player.currentHP;
  player.currentHP=Math.min(player.stats.HP,before+Math.round(amount));return player.currentHP-before;
}
function isAlive(player) {return !!player&&player.currentHP>0;}
function showCharacter(player) {console.log(JSON.stringify(player,null,2));}

// 10. Public exports (keep existing gameState.js compatible)
if(typeof module!=='undefined'&&module.exports)module.exports={
  baseStats,maxStats,statIncrease,totalPoints,validWeapons,validElements,validColors,
  createCharacter,players,canEditCharacter,isValidStat,setCharacterName,selectColor,
  increaseStat,decreaseStat,selectWeapon,selectElement,resetCharacter,
  setReady,unreadyCharacter,startBattle,finishBattle,resetResources,
  spendStamina,restoreStamina,takeDamage,heal,isAlive,showCharacter
};

// 11. Local smoke tests; running this directly never modifies saved data
if(typeof require!=='undefined'&&require.main===module){
  const assert=require('node:assert/strict');
  const p1=players.player1,p2=players.player2;
  assert.equal(totalPoints,20);
  assert.equal(setCharacterName(p1,'Knight'),true);
  assert.equal(setCharacterName(p2,'Knight'),false);
  assert.equal(setCharacterName(p2,'Mage'),true);
  assert.equal(increaseStat(p1,'HP'),true);assert.equal(p1.stats.HP,105);
  assert.equal(increaseStat(p1,'STA'),true);assert.equal(p1.stats.STA,12);
  assert.equal(decreaseStat(p1,'STA'),true);assert.equal(p1.pointsRemaining,19);
  assert.equal(selectColor(p1,'Green'),true);
  assert.equal(selectWeapon(p1,'Staff'),true);
  assert.equal(setReady(p1),false);
  assert.equal(setReady(p1,true),true);
  assert.equal(increaseStat(p1,'STR'),false);
  assert.equal(startBattle(p1),true);
  assert.equal(spendStamina(p1,2.5),true);
  assert.equal(finishBattle(p1),true);
  assert.equal(unreadyCharacter(p1),true);
  assert.equal(p2.pointsRemaining,20);
  console.log('PASS: character creation, allocation, naming, Ready, and resources');
}
