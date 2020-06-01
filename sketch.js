/* eslint-disable no-undef */
'use strict';

const f = []; // -1 - uncaptured; 0 - player 0; 1 - player 1; ...
const ter = []; // 0 - ground; 1 - mountain; 2 - sea
const units = []; // man; tank; city; wall
const players = []; // active palyers
const buttons = [];
let uiButtons = {};
let sideButton;

const textures = {};
const sounds = {};
const fonts = {};
const animations = [];
const fWidth = 12;
const fHeight = 12;
const fAlpha = 100;
const sideButWidth = 30;
const sidePadWidth = 350;
let waterTime = 0;
let offsetX = 10;
let offsetY = 10;
let fieldSize = 48;
let sidePadOpen = true;

let action;
let actPlNum = 1;
let winner = -1;
const actType = { // type of an action
  CREATE: 'c',
  MOVEATTACK: 'mt',
  ATTACK: 't',
  MOVE: 'm',
};
const priceList = {
  city: 100,
  fort: 15,
  farm: 10,
  platform: 20,
  man: 10,
  tank: 40,
  repairCity: 15,
  repairMan: 8,
  repairTank: 15,
  repairFort: 10,
  repairFarm: 0,
  repairPlatform: 0,
};

const lock = (f, ...args) => (...args2) => f(...args, ...args2);

class Animation {
  constructor(i, j, images, changeRate, repeatable = false) {
    this.id = newId();
    this.i = i;
    this.j = j;
    this.images = images;
    this.imgIndex = 0;
    this.counter = 0;
    this.changeRate = changeRate;
    this.repeatable = repeatable;
  }

  draw() {
    const [x, y] = getXY(this.i, this.j);
    image(this.images[this.imgIndex], x, y, fieldSize, fieldSize);
  }

  addCounter() {
    if (this.counter >= this.changeRate - 1) {
      this.counter = 0;
      if (this.imgIndex === this.images.length - 1 && !this.repeatable) {
        removeFromArr(this, animations);
      } else if (this.imgIndex === this.images.length - 1 && this.repeatable) {
        this.imgIndex = 0;
      } else {
        ++this.imgIndex;
      }
    } else {
      this.counter += deltaTime;
    }
  }
}

function animate() {
  animations.forEach(a => {
    a.draw();
    a.addCounter();
  });
}

class Button {
  constructor(callback, x, y, w = 0, h = 0, scalable = false,
    col = undefined, text = '', priority = 0, group = 0, sound = sounds.click) {
    this.callback = callback;
    this.enabled = true;
    this.i = -1;
    this.j = -1;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.scalable = scalable;
    this.col = col;
    this.text = text;
    this.priority = priority;
    this.group = group;
    this.sound = sound;
  }

  static onClick() {
    const act = [];
    buttons.forEach(zone => {
      if (zone.enabled) {
        if (zone.scalable === true && isInArea(
          mouseX,
          mouseY,
          ...getXY(zone.i, zone.j),
          fieldSize,
          fieldSize
        )) {
          act.push(zone);
        } else if (zone.scalable === false && isInArea(
          mouseX,
          mouseY,
          zone.x,
          zone.y,
          zone.w,
          zone.h
        )) {
          act.push(zone);
        }
      }
    });
    for (const zone in uiButtons) {
      if (uiButtons[zone].enabled && isInArea(
        mouseX,
        mouseY,
        uiButtons[zone].x,
        uiButtons[zone].y,
        uiButtons[zone].w,
        uiButtons[zone].h
      )) { act.push(uiButtons[zone]); }
    }
    let b;
    if (act.length > 1) {
      b = getHighestPr(act);
    } else if (act.length === 1) {
      b = act[0];
    }
    try {
      b.sound.play();
      b.callback();
    } catch (e) { console.log(e); }
  }
}

class Unit {
  constructor(i, j, plr, maxHp, moveRange = -1, fireRange = -1,
    damage = -1, maxEnergy = -1, price = 0) {
    this.id = newId();
    this.i = i;
    this.j = j;
    this.plr = plr;
    this.moveRange = moveRange;
    this.fireRange = fireRange;
    this.damage = damage;
    this.hp = maxHp;
    this.maxHp = maxHp;
    this.energy = maxEnergy;
    this.maxEnergy = maxEnergy;
    this.price = price;
  }

  static getUnit(i, j) { //DOESNT WORK
    const arr = [];
    units.forEach(u => {
      if (u.i === i && u.j === j) {
        arr.push(u);
      }
    });
    console.log(arr[0]);
    if (arr.length > 1 && getType(arr[0]) === 'Platform') return arr[1];
    return arr[0];
  }

  harm(hp) {
    this.hp -= hp;
    if (this.hp <= 0) {
      destructUnit(this);
    }
  }
}

function isPlatform(i, j) {
  units.forEach(u => {
    if (getType(u) === 'Platform' && u.i === i && u.j === j) return true;
  });
  return false;
}

function destructUnit(u) {
  removeFromArr(u, units);
  action = undefined;
  showNonCityButtons();
}

function removeFromArr(el, arr) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].id === el.id) {
      arr.splice(i, 1);
    }
  }
}

let curId = 0;
function newId() {
  return curId++;
}

class City extends Unit {
  constructor(i, j, plr) {
    super(i, j, plr, 6, -1, -1, -1, 6, priceList.city);
    this.level = 0;
  }
}

class Fort extends Unit {
  constructor(i, j, plr) {
    super(i, j, plr, 4, -1, -1, -1, 0, priceList.fort);
  }
}

class Farm extends Unit {
  constructor(i, j, plr) {
    super(i, j, plr, 1, -1, -1, -1, 0, priceList.farm);
  }
}

class Platform extends Unit {
  constructor(i, j, plr) {
    super(i, j, plr, 1, -1, -1, -1, 0, priceList.platform);
  }
}

class Man extends Unit {
  constructor(i, j, plr) {
    super(i, j, plr, 2, 0, 1, 1, 3, priceList.man);
  }
}

class Tank extends Unit {
  constructor(i, j, plr) {
    super(i, j, plr, 4, 2, 1, 2, 2, priceList.tank);
  }
}

function getType(u) {
  if (!(u instanceof Unit)) {
    return undefined;
  }
  if (u instanceof City) {
    return 'City';
  }
  if (u instanceof Man) {
    return 'Man';
  }
  if (u instanceof Tank) {
    return 'Tank';
  }
  if (u instanceof Fort) {
    return 'Fort';
  }
  if (u instanceof Farm) {
    return 'Farm';
  }
  if (u instanceof Platform) {
    return 'Platform';
  }
  throw new Error('Unit child not added to getType!');
}

class Player {
  constructor(id, color) {
    this.id = id;
    this.color = color;
    this.money = 95;
  }

  conq(i, j) {
    f[i][j] = this.id;
    // Set player property for units at [i][j] to actPlId
  }

  static nextTurn(noButtons = false) {
    action = undefined;
    autoCaptureMountsSeas();
    actPlNum = actPlNum === players.length - 1 ? 0 : ++actPlNum;
    if (!noButtons) showNonCityButtons();
    refillEnergy();
    addMoney();
  }
}

function addMoney() {
  players[actPlNum].money += getEarnings();
}

function getEarnings() {
  let cities = 0, farms = 0, army = 0;
  units.forEach(u => {
    if (u.plr.id === actPlNum) {
      if (getType(u) === 'City') ++cities;
      else if (getType(u) === 'Farm') ++farms;
      else if (getType(u) === 'Man' || getType(u) === 'Tank') ++army;
    }
  });
  return cities * 10 + farms * 2 - army;
}

function setAdj(i, j, val, arr, ifClear = true) {
  for (let p = -1; p <= 1; p++) {
    for (let q = -1; q <= 1; q++) {
      if (arr[i + p] !== undefined &&
          arr[i + p][j + q] !== undefined &&
          (!ifClear || arr[i + p][j + q] === -1)) {
        arr[i + p][j + q] = val;
      }
    }
  }
}

// d: 0-cross[4]; 1-square[8]; 2-rhombus[12]
function isAdj(i0, j0, d, i, j, noCenter = true) {
  if (noCenter && i === i0 && j === j0) {
    return false;
  }
  if (d === 0) {
    if ((Math.abs(i0 - i) <= 1 && Math.abs(j0 - j) === 0) ||
        (Math.abs(j0 - j) <= 1 && Math.abs(i0 - i) === 0)) {
      return true;
    }
  } else if (d === 1) {
    if (Math.abs(i0 - i) <= 1 && Math.abs(j0 - j) <= 1) {
      return true;
    }
  } else if (d === 2) {
    if (((Math.abs(i0 - i) <= 2 && Math.abs(j0 - j) === 0) ||
        (Math.abs(j0 - j) <= 2 && Math.abs(i0 - i) === 0)) ||
        (Math.abs(i0 - i) <= 1 && Math.abs(j0 - j) <= 1)) {
      return true;
    }
  } else {
    throw new Error(`isAdj: invalid argument "d" (${d})`);
  }
  return false;
}

// d: 0-cross[4]; 1-square[8]; 2-rhombus[12]
function getAdj(d, i, j, noCenter = true) {
  const res = [];
  for (let it = 0; it < fWidth; it++) {
    for (let jt = 0; jt < fHeight; jt++) {
      if (isAdj(it, jt, d, i, j, noCenter)) {
        res.push({
          i: it,
          j: jt,
        });
      }
    }
  }
  return res;
}

const clickEvent = () => {
  Button.onClick();
  console.log(units);
};

function fieldClick(i, j) {
  const u = Unit.getUnit(i, j);
  if (action !== undefined) {
    if (action.fnCrMv(i, j)) {
      performAct(i, j);
    } else if (action.fnAtt !== undefined && action.fnAtt(i, j)) {
      performAct(i, j, true);
    } else {
      action = undefined;
    }
  } else if (getType(u) === undefined || u === undefined) {
    showNonCityButtons();
  } else if (getType(u) === 'City' && u.plr.id === actPlNum) {
    showBasicUnitButtons(u);
    showCityButtons(u);
  } else if ((getType(u) === 'Man' || getType(u) === 'Tank') &&
      u.plr.id === actPlNum) {
    showBasicUnitButtons(u);
    fireMoveUnit(u);
  } else if (getType(u) !== undefined && u.plr.id === actPlNum) {
    showBasicUnitButtons(u);
  }
}

// eslint-disable-next-line no-unused-vars
function preload() {
  loadTextures();
  loadSounds();
  loadFonts();
}

// eslint-disable-next-line no-unused-vars
function setup() {
  players.push(new Player(0, color(0, 0, 255, fAlpha)));
  players.push(new Player(1, color(255, 0, 0, fAlpha)));
  initArr(f, -1);
  initArr(ter);
  units.push(new City(1, 1, players[0]));
  units.push(new City(fWidth - 2, fHeight - 2, players[1]));
  players[0].conq(1, 1);
  players[1].conq(fWidth - 2, fHeight - 2);
  genTerrain();
  setAdj(1, 1, 0, f);
  setAdj(fWidth - 2, fHeight - 2, 1, f);
  setAdj(1, 1, 0, ter, false);
  setAdj(fWidth - 2, fHeight - 2, 0, ter, false);
  initGridClick();
  const cnv = createCanvas(windowWidth - 3, windowHeight - 3);
  setStartLocation();
  cnv.mouseClicked(clickEvent);
  strokeWeight(0);
  Player.nextTurn(true);
  sounds.themeMelody0.loop();
  initUIButtons();
  updButtonObjs();
  hideSideButtons();
  showNonCityButtons();
}

function updButtonObjs() {
  uiButtons.city.callback = lock(buyOnTer, new City(-1, -1, players[actPlNum]));
  uiButtons.fort.callback = lock(buyOnTer, new Fort(-1, -1, players[actPlNum]));
  uiButtons.farm.callback = lock(buyOnTer, new Farm(-1, -1, players[actPlNum]));
  uiButtons.platform.callback = lock(buyOnTer,
    new Platform(-1, -1, players[actPlNum]), false, true);
}

// eslint-disable-next-line no-unused-vars
function draw() {
  dragScrn();
  noSmooth();
  background(0);
  animateWater();
  drawBackgr();
  drawBorders();
  drawUnits();
  drawHps();
  drawEnrgs();
  animate();
  drawActionZones();
  if (sidePadOpen) {
    drawSidePad();
    drawMainInfo();
  }
  drawButtons();
  if (winner !== -1) {
    drawWin(players[winner]);
  }
}

function initUIButtons() {
  sideButton = new Button(
    sidePadClick, width - sidePadWidth - sideButWidth, 0,
    sideButWidth, height, false, color(255), '>', 3, 3);
  buttons.push(sideButton);
  uiButtons = {
    nextTurn: new Button(perfNextTurn, width - 300, height - 70, 300, 50,
      false, color(255), 'END TURN', 2, 2),
    delete: new Button(() => undefined, width - 300, 20, 300, 50,
      false, color(255, 100, 100), 'delete', 2, 2),
    repair: new Button(() => undefined, width - 300, 120, 300, 50,
      false, color(255), 'repair', 2, 2),
    city: new Button(() => undefined, width - 300, 50, 300, 50,
      false, color(255), `city ${priceList.city}$`, 1, 2),
    fort: new Button(() => undefined, width - 300, 120, 300, 50,
      false, color(255), `fort ${priceList.fort}$`, 1, 2),
    farm: new Button(() => undefined, width - 300, 190, 300, 50,
      false, color(255), `farm ${priceList.farm}$`, 1, 2),
    platform: new Button(() => undefined, width - 300, 260, 300, 50,
      false, color(255), `platform ${priceList.platform}$`, 1, 2),
    man: new Button(() => undefined, width - 300, 190, 300, 50,
      false, color(255), `man ${priceList.man}$`, 2, 2),
    tank: new Button(() => undefined, width - 300, 260, 300, 50,
      false, color(255), `tank ${priceList.tank}$`, 2, 2),
  };
}

function checkNotLostPlr(plNum) {
  for (const u of units) {
    if (getType(u) === 'City' && u.plr.id === plNum) return true;
  }
  return false;
}

function checkWin() {
  const notLost = [];
  for (const plr of players) {
    if (checkNotLostPlr(plr.id)) notLost.push(plr);
  }
  if (notLost.length === 1) winner = notLost[0].id;
}

function setStartLocation() {
  fieldSize = Math.floor(windowHeight / fHeight) - 2;
  const startOffsetX = Math.abs((width - 300 - fieldSize * fWidth) / 2) - 1;
  if (startOffsetX > 0) {
    offsetX = startOffsetX;
  }
}

const changeRate = 1000;
function animateWater() {
  waterTime += deltaTime;
  if (waterTime >= changeRate * 3) {
    setTexture('water', 2);
    waterTime = 0;
  } else if (waterTime >= changeRate * 2) {
    setTexture('water', 1);
  } else if (waterTime >= changeRate) {
    setTexture('water', 0);
  }
}

let dragging = false;
function dragScrn() {
  if (mouseIsPressed && dragging) {
    // eslint-disable-next-line no-undef
    offsetX += movedX;
    // eslint-disable-next-line no-undef
    offsetY += movedY;
    // eslint-disable-next-line no-undef
  } else if (mouseIsPressed && (Math.abs(movedX) > 5 || Math.abs(movedY) > 5)) {
    dragging = true;
  } else {
    dragging = false;
  }
}

function loadTextures() {
  loadTexture('city');
  loadTexture('fort');
  loadTexture('platform');
  loadTexture('farm0');
  loadTexture('farm1');
  loadTexture('ground0');
  loadTexture('ground1');
  loadTexture('mount0');
  loadTexture('mount1');
  loadTexture('water0');
  loadTexture('water1');
  loadTexture('water2');
  loadTexture('man0p0');
  loadTexture('man0p1');
  loadTexture('tank0p0');
  loadTexture('tank0p1');
  loadTexture('blast0');
  loadTexture('blast1');
  loadTexture('blast2');
  loadTexture('blast3');
  loadTexture('blast4');
  loadTexture('blast5');
  loadTexture('blast6');
  setTexture('water');
  textures.blasts = [];
  for (let i = 0; i < 7; i++) {
    textures.blasts.push(textures[`blast${i}`]);
  }
}

function loadSounds() {
  soundFormats('wav');
  loadSoundl('click');
  loadSoundl('bang');
  loadSoundl('themeMelody0');
  sounds.themeMelody0.setVolume(0.3);
}

function loadFonts() {
  fonts.mainFont = loadFont('fonts/FFFFORWA.TTF');
}

function loadSoundl(name) {
  sounds[name] = loadSound(`sounds/${name}.wav`);
}

function loadTexture(name) {
  textures[name] = loadImage(`textures/${name}.png`);
}

function setTexture(name, val = 0) {
  textures[name] = textures[name + val];
}

function drawActionZones() {
  if (action !== undefined) {
    for (let i = 0; i < fWidth; i++) {
      for (let j = 0; j < fHeight; j++) {
        if (action.zones[i][j] === 1) {
          drawCanMove(getXY(i, j)[0], getXY(i, j)[1]);
        } else if (action.zones[i][j] === 2) {
          drawCanAttack(getXY(i, j)[0], getXY(i, j)[1]);
        }
      }
    }
  }
}

function updateActionZones() {
  action.zones = []; // 1 - can move, 2 - can attack
  initArr(action.zones);
  for (let i = 0; i < fWidth; i++) {
    for (let j = 0; j < fHeight; j++) {
      if (action.aType === actType.CREATE) {
        action.u.i = i;
        action.u.j = j;
      }
      if (action.fnCrMv(i, j)) {
        action.zones[i][j] = 1;
      } else if (action.fnAtt !== undefined && action.fnAtt(i, j)) {
        action.zones[i][j] = 2;
      }
    }
  }
}

function refillEnergy() {
  units.forEach(u => {
    if (u.plr.id === actPlNum) {
      u.energy = u.maxEnergy;
    }
  });
}

function autoCaptureMountsSeas() {
  for (let i = 0; i < fWidth; i++) {
    for (let j = 0; j < fHeight; j++) {
      if (f[i][j] === -1 && ter[i][j] > 0) {
        getAdj(0, i, j).forEach(el => {
          if (f[el.i][el.j] > -1 &&
              (ter[el.i][el.j] < 1 ||
              isPlatform(el.i, el.j))) {
            f[i][j] = f[el.i][el.j];
          }
        });
      }
    }
  }
}

// eslint-disable-next-line no-unused-vars
function mouseWheel(event) {
  fieldSize -= Math.floor(event.delta);
  if (fieldSize < 4) {
    fieldSize = 4;
  }
  return false;
}

function perfNextTurn() {
  Player.nextTurn();
  checkWin();
  updButtonObjs();
}

function showMainButtons() {
  uiButtons.nextTurn.enabled = true;
  hideSideIfNeed();
}

function showBasicUnitButtons(u, hideAll = true) {
  if (hideAll) hideSideButtons();
  const repPrice = priceList[`repair${getType(u)}`];
  uiButtons.delete.callback = lock(destructUnit, u);
  uiButtons.repair.callback = lock(repairUnit, u);
  uiButtons.repair.text = `repair ${repPrice}$`;
  uiButtons.delete.enabled = true;
  if (repPrice > 0) uiButtons.repair.enabled = true;
  showMainButtons();
  hideSideIfNeed();
}

function showCityButtons(u) {
  hideSideButtons();
  showBasicUnitButtons(u, false);
  uiButtons.man.callback = lock(buyMan, u);
  uiButtons.tank.callback = lock(buyTank, u);
  uiButtons.man.enabled = true;
  uiButtons.tank.enabled = true;
  hideSideIfNeed();
}

function showNonCityButtons() {
  hideSideButtons();
  uiButtons.city.enabled = true;
  uiButtons.fort.enabled = true;
  uiButtons.farm.enabled = true;
  uiButtons.platform.enabled = true;
  showMainButtons();
  hideSideIfNeed();
}

function hideSideIfNeed(always = false) {
  if (!sidePadOpen || always) {
    hideSideButtons();
  }
}

function hideSideButtons() {
  for (const b in uiButtons) uiButtons[b].enabled = false;
}

function openSidePad() {
  sidePadOpen = true;
  hideSideButtons();
  showNonCityButtons();
}

function closeSidePad() {
  sidePadOpen = false;
  hideSideButtons();
}

function sidePadClick() {
  if (!sidePadOpen) {
    sideButton.x = width - sidePadWidth - sideButWidth;
    sideButton.text = '>';
    openSidePad();
  } else {
    closeSidePad();
    sideButton.x = width - sideButWidth;
    sideButton.text = '<';
  }
  hideSideIfNeed();
}

function repairUnit(u) {
  const price = priceList[`repair${getType(u)}`];
  if (u.hp < u.maxHp && players[actPlNum].money >= price && u.energy >= 1) {
    players[actPlNum].money -= price;
    ++u.hp;
    --u.energy;
  }
}

function buyMan(city) {
  const m = new Man(0, 0, players[actPlNum]);
  action = {
    fnCrMv: lock(canSetCheck, canSetNearCity, m, true, false, city),
    u: m,
    aType: actType.CREATE,
    city,
  };
  updateActionZones();
}

function buyTank(city) {
  const t = new Tank(0, 0, players[actPlNum]);
  action = {
    fnCrMv: lock(canSetCheck, canSetNearCity, t, true, false, city),
    u: t,
    aType: actType.CREATE,
    city,
  };
  updateActionZones();
}

function buyOnTer(u, setOnGround = true, setOnWater = false) {
  updButtonObjs();
  action = {
    fnCrMv: lock(canSetCheck, () => true,
      u, setOnGround, setOnWater, undefined),
    u,
    aType: actType.CREATE,
  };
  updateActionZones();
}

function moveUnit(u) { // if movable unit is clicked
  action = {
    fnCrMv: lock(canMove, u.i, u.j, u.moveRange),
    u,
    aType: actType.MOVE,
  };
  updateActionZones();
}

function fireMoveUnit(u) { // if fireable unit is clicked
  action = {
    fnCrMv: lock(canMove, u.i, u.j, u.moveRange),
    fnAtt: lock(canFire, u.i, u.j, u.fireRange),
    u,
    aType: actType.MOVEATTACK,
  };
  updateActionZones();
}

function canMove(i0, j0, range, i, j, floats = false) {
  if (isAdj(i0, j0, range, i, j) &&
      (getType(Unit.getUnit(i, j)) === 'Platform' ||
      Unit.getUnit(i, j) === undefined) &&
      ((ter[i][j] === 0 || getType(Unit.getUnit(i, j)) === 'Platform') ||
      (floats && ter[i][j] === 2))) {
    return true;
  }
  return false;
}

function canFire(i0, j0, range, i, j) {
  const enm = Unit.getUnit(i, j);
  console.log({ enemy: Unit.getUnit(i, j) });
  if (isAdj(i0, j0, range, i, j) &&
      enm !== undefined &&
      enm.plr.id !== actPlNum) {
    return true;
  }
  return false;
}

function canSetCheck(fCheck, u, onGround, onWater, param, i, j) {
  if (fCheck(i, j, u, param) &&
      f[i][j] === actPlNum &&
      Unit.getUnit(i, j) === undefined &&
      ((onGround && ter[i][j] < 1) || (onWater && ter[i][j] === 2))) {
    return true;
  }
  return false;
}

function canSetNearCity(i, j, u, city) {
  if (isAdj(city.i, city.j, 1, i, j)) {
    return true;
  }
  return false;
}

function performAct(i, j, fnAtt = false) {
  if (action.aType === actType.CREATE) {
    if (players[actPlNum].money >= action.u.price &&
        (action.city === undefined || action.city.energy >= 2)) {
      players[actPlNum].money -= action.u.price;
      action.u.energy = 0;
      if (action.city !== undefined) {
        action.city.energy -= 2;
      }
      setActionUnit(i, j);
    }
  } else if (action.aType === actType.MOVE) {
    if (action.u.energy > 0) {
      players[actPlNum].conq(i, j);
      action.u.energy -= 1;
      setActionUnit(i, j, false);
    }
  } else if (action.aType === actType.MOVEATTACK) {
    if (fnAtt) { // attack
      if (action.u.energy > 1) {
        action.u.energy -= 2;
        sounds.bang.play();
        animations.push(new Animation(i, j, textures.blasts, 150));
        attackFromUnit(i, j);
      }
    } else if (action.u.energy > 0) { // move
      players[actPlNum].conq(i, j);
      if (getType(action.u) === 'Tank') {
        setAdj(i, j, actPlNum, f, true);
      }
      action.u.energy -= 1;
      setActionUnit(i, j, false);
    }
  }
}

function setActionUnit(i, j, addToUnits = true) {
  action.u.i = i;
  action.u.j = j;
  if (addToUnits) {
    units.push(action.u);
  }
  action = undefined;
}

function attackFromUnit(i, j) {
  const enm = Unit.getUnit(i, j);
  enm.harm(action.u.damage);
  action = undefined;
}

function getXY(i, j) {
  return [i * fieldSize + offsetX, j * fieldSize + offsetY];
}

function getIJ(x, y) {
  return [
    Math.round((x - offsetX) / fieldSize - 0.5),
    Math.round((y - offsetY) / fieldSize - 0.5)
  ];
}

function initGridClick() {
  for (let i = 0; i < fWidth; i++) {
    for (let j = 0; j < fHeight; j++) {
      const b = new Button(lock(fieldClick, i, j), 0, 0, 0, 0, true);
      b.i = i;
      b.j = j;
      buttons.push(b);
    }
  }
}

function initArr(arr, val = 0) {
  const ySlice = [];
  for (let i = 0; i < fHeight; i++) {
    ySlice.push(val);
  }
  for (let i = 0; i < fWidth; i++) {
    arr.push(ySlice.slice());
  }
}

function isInArea(x0, y0, x, y, w, h) {
  if (x0 >= x && x0 < x + w && y0 >= y && y0 < y + h) {
    return true;
  }
  return false;
}

function isInBounds(i, j) {
  if (i >= 0 && j >= 0 && i < fWidth && j < fHeight) {
    return true;
  }
  return false;
}

function getHighestPr(arr) {
  let highestPr = -10;
  let res;
  arr.forEach(obj => {
    if (obj.priority > highestPr) {
      highestPr = obj.priority;
    }
  });
  arr.forEach(obj => {
    if (obj.priority === highestPr) {
      res = obj;
    }
  });
  return res;
}

function genTerrain() {
  const noiseScale = 0.4;
  for (let i = 0; i < fWidth; i++) {
    for (let j = 0; j < fHeight; j++) {
      const n = noise(i * noiseScale, j * noiseScale);
      const r = random();
      if (n < 0.37) {
        ter[i][j] = 2;
      } else if (r > 0.86) {
        ter[i][j] = 1;
      }
    }
  }
}

function rand01(v1, v2 = 0) {
  const seed = v1 + v2 * fWidth;
  if (seed % 5 === 0 || seed % 6 === 0 || seed % 11 === 0) {
    return 0;
  }
  return 1;
}

// DRAW
function drawBackgr() {
  for (let i = 0; i < fWidth; i++) {
    for (let j = 0; j < fHeight; j++) {
      const val = ter[i][j];
      const [x, y] = getXY(i, j);
      if (val === 0) drawGround(x, y);
      else if (val === 1) drawMount(x, y);
      else if (val === 2) drawWater(x, y);
    }
  }
}

function drawSidePad() {
  fill(100);
  rect(width - sidePadWidth, 0, sidePadWidth, height);
}

function drawWin(plr) {
  const marg = 20;
  fill(getBrightColor(plr.color));
  rect(marg, marg, width - 2 * marg, height - 2 * marg);
  fill(255);
  textSize(35);
  textAlign(CENTER, CENTER);
  textFont(fonts.mainFont);
  text(`Player ${plr.id + 1} wins!`, 0, height / 2, width, 40);
}

function drawButtons() {
  buttons.forEach(b => {
    if (b.col !== undefined) {
      drawButton(b);
    }
  });
  for (const b in uiButtons) drawButton(uiButtons[b]);
}

function drawButton(b) {
  if ((b !== undefined) && b.enabled) {
    textSize(32);
    textAlign(CENTER, CENTER);
    textFont(fonts.mainFont);
    fill(b.col);
    rect(b.x, b.y, b.w, b.h);
    fill(0);
    text(b.text, b.x, b.y, b.w, b.h);
  }
}

function drawF(x, y, ...col) {
  fill(...col);
  rect(x, y, fieldSize, fieldSize);
}

function drawGround(x, y) {
  const r = rand01(...getIJ(x, y));
  if (r === 1) image(textures.ground0, x, y, fieldSize, fieldSize);
  else image(textures.ground1, x, y, fieldSize, fieldSize);
}

function drawMount(x, y) {
  drawGround(x, y);
  const r = rand01(...getIJ(x, y));
  if (r === 1) image(textures.mount0, x, y, fieldSize, fieldSize);
  else image(textures.mount1, x, y, fieldSize, fieldSize);
}

function drawWater(x, y) {
  image(textures.water, x, y, fieldSize, fieldSize);
}

function drawCity(x, y, plr) {
  image(textures.city, x, y, fieldSize, fieldSize);
}

function drawFort(x, y, plr) {
  image(textures.fort, x, y, fieldSize, fieldSize);
}

function drawFarm(x, y, plr) {
  const r = rand01(...getIJ(x, y));
  if (r === 1) image(textures.farm0, x, y, fieldSize, fieldSize);
  else image(textures.farm1, x, y, fieldSize, fieldSize);
}

function drawPlatform(x, y, plr) {
  image(textures.platform, x, y, fieldSize, fieldSize);
}

function drawMan(x, y, plr) {
  image(textures[`man0p${plr.id}`], x, y, fieldSize, fieldSize);}

function drawTank(x, y, plr) {
  image(textures[`tank0p${plr.id}`], x, y, fieldSize, fieldSize);
}

function drawCanMove(x, y) {
  fill(100, 255, 0, 100);
  rect(x + fieldSize / 8, y + fieldSize / 8,
    (fieldSize / 4) * 3, (fieldSize / 4) * 3);
}

function drawCanAttack(x, y) {
  fill(255, 0, 0, 100);
  rect(x + fieldSize / 8, y + fieldSize / 8,
    (fieldSize / 4) * 3, (fieldSize / 4) * 3);
}

function drawCross(x, y) {
  stroke(255, 0, 0, 50);
  strokeWeight(6);
  line(x, y, x + fieldSize, y + fieldSize);
  line(x, y + fieldSize, x + fieldSize, y);
  strokeWeight(0);
}

function drawHps() {
  units.forEach(u => {
    drawHp(...getXY(u.i, u.j), u.hp, u.maxHp);
  });
}

function drawEnrgs() {
  units.forEach(u => {
    drawEnrg(...getXY(u.i, u.j), u.energy, u.maxEnergy);
  });
}

function drawHp(x, y, hp, max) {
  drawBar(x, y - 2, hp, max, color(255));
}

function drawEnrg(x, y, hp, max) {
  drawBar(x, y - 9, hp, max, color(100, 180, 255));
}

function drawMainInfo() {
  textAlign(CENTER);
  fill(getBrightColor(players[actPlNum].color));
  text(`Player ${actPlNum + 1}`, width - 300, height - 200, 250, 50);
  fill('gold');
  text(`${players[actPlNum].money}$ (+${getEarnings()})`,
    width - 300, height - 140, 250, 50);
}

function getBrightColor(c) { // optimize
  const rgb = [];
  c.levels.forEach(e => rgb.push(e));
  return color(rgb[0], rgb[1], rgb[2], 255);
}

function drawBar(x, y, val, max, col) {
  const interval = 3, len = 4, hh = 4;
  const d = points => {
    for (let i = 0; i < points; i++) {
      rect((interval + len) * i + x + interval, y + fieldSize, len, hh);
    }
  };
  fill(160);
  d(max);
  fill(col);
  d(val);
}

function drawBorders() {
  for (let i = 0; i < fWidth; i++) {
    for (let j = 0; j < fHeight; j++) {
      const val = f[i][j];
      if (val !== -1) {
        const [x, y] = getXY(i, j);
        drawF(x, y, players[val].color);
      }
    }
  }
}

function drawUnit(u) {
  const [x, y] = getXY(u.i, u.j);
  const type = getType(u);
  if (type === 'City') drawCity(x, y, u.plr);
  else if (type === 'Man') drawMan(x, y, u.plr);
  else if (type === 'Tank') drawTank(x, y, u.plr);
  else if (type === 'Fort') drawFort(x, y, u.plr);
  else if (type === 'Farm') drawFarm(x, y, u.plr);
  else if (type === 'Platform') drawPlatform(x, y, u.plr);
}

function drawUnits() {
  units.forEach(u => { if (getType(u) === 'Platform') drawUnit(u); });
  units.forEach(u => { if (getType(u) !== 'Platform') drawUnit(u); });
}
