const fWidth = 12, fHeight = 12, fAlpha = 100;
const f = []; // -1 - uncaptured; 0 - player 0; 1 - player 1; ...
const ter = []; // 0 - ground; 1 - mountain; 2 - sea
const units = []; // man; tank; city; wall
const players = []; // active palyers
const buttons = [];
let action, actPlNum = 1, waterTime = 0, offsetX = 10, offsetY = 10, fieldSize = 48, tick = 0;
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
  man: 10,
  tank: 30,
  repairCity: 15,
  repairMan: 8,
  repairTank: 12,
  repairFort: 10,
  repairFarm: 0,
};
const textures = {}, sounds = {}, animations = [];


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
        destruct(this, animations);
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
  constructor(callback, x, y, w = 0, h = 0, scalable = false, col = undefined, text = '', priority = 0, group = 0, sound = sounds.click) {
    this.callback = callback;
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
    buttons.push(this);
  }

  static onClick() {
    const act = [];
    console.log(fieldSize);
    buttons.forEach((zone) => {
      console.log(zone.i, zone.j, ...getXY(zone.i, zone.j));
      if (zone.scalable === true && isInArea(mouseX, mouseY, ...getXY(zone.i, zone.j), fieldSize, fieldSize)) {
        act.push(zone);
      } else if (zone.scalable === false && isInArea(mouseX, mouseY, zone.x, zone.y, zone.w, zone.h)) {
        act.push(zone);
      }
    });
    let b;
    if (act.length > 1) {
      b = getHighestPr(act);
    } else if (act.length === 1) {
      b = act[0];
    }
    b.sound.play();
    b.callback();
  }
}

function delGroup(n) {
  buttons.forEach(b => {
    if (b.group === n) {
      buttons.splice(buttons.indexOf(b));
    }
  });
}

class Unit {
  constructor(i, j, plr, maxHp, moveRange = -1, fireRange = -1, damage = -1, maxEnergy = -1, price = 0) {
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

  static getUnit(i, j) {
    let res;
    units.forEach(u => {
      if (u.i === i && u.j === j) {
        res = u;
      }
    });
    return res;
  }

  harm(hp) {
    this.hp -= hp;
    if (this.hp <= 0) {
      destructUnit(this);
    }
  }
}

function destructUnit(u) {
  destruct(u, units);
  action = undefined;
  showNonCityButtons();
}

function destruct(el, arr) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].id === el.id) {
      arr.splice(i, 1);
    }
  }
}

function newId() {
  for (let i = 0; i < 2000; i++) {
    let taken = false;
    units.forEach(u => {
      if (u.id === i) {
        taken = true;
      }
    });
    if (!taken) {
      return i;
    }
  }
  throw new Error('too many units! (newId)');
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

function setAdj(i, j, val, arr, ifClear = true) {
  for (let p = -1; p <= 1; p++) {
    for (let q = -1; q <= 1; q++) {
      if (arr[i + p] !== undefined && arr[i + p][j + q] !== undefined && (!ifClear || arr[i + p][j + q] === -1)) {
        arr[i + p][j + q] = val;
      }
    }
  }
}

function isAdj(i0, j0, d, i, j, noCenter = true) { // d: 0 - cross [4]; 1 - square [8] (setAdj); 2 - phombus [12]
  if (noCenter && i === i0 && j === j0) {
    return false;
  }
  if (d === 0) {
    if ((Math.abs(i0 - i) <= 1 && Math.abs(j0 - j) === 0) || (Math.abs(j0 - j) <= 1 && Math.abs(i0 - i) === 0)) {
      return true;
    }
  } else if (d === 1) {
    if (Math.abs(i0 - i) <= 1 && Math.abs(j0 - j) <= 1) {
      return true;
    }
  } else if (d === 2) {
    if (((Math.abs(i0 - i) <= 2 && Math.abs(j0 - j) === 0) || (Math.abs(j0 - j) <= 2 && Math.abs(i0 - i) === 0))
    || (Math.abs(i0 - i) <= 1 && Math.abs(j0 - j) <= 1)) {
      return true;
    }
  } else {
    throw new Error(`isAdj: invalid argument "d" (${d})`);
  }
  return false;
}

function getAdj(d, i, j, noCenter = true) { // d: 0 - cross [4]; 1 - square [8] (setAdj); 2 - phombus [12]
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
  throw new Error('Unit child not added to getType!');
}

class Player {
  constructor(id, color) {
    this.id = id;
    this.color = color;
    this.money = 75;
  }

  conq(i, j) {
    f[i][j] = this.id;
  }

  static nextTurn() {
    action = undefined;
    autoCaptureMountsSeas();
    actPlNum = actPlNum === players.length - 1 ? 0 : ++actPlNum;
    clearSideButtons();
    showNonCityButtons();
    refillEnergy();
    addMoney();
    console.log(actPlNum);
  }
}

function addMoney() {
  players[actPlNum].money += getEarnings();
}

function getEarnings() {
  let cities = 0, farms = 0, army = 0;
  units.forEach(u => {
    if (u.plr.id === actPlNum) {
      if (getType(u) === 'City') {
        ++cities;
      } else if (getType(u) === 'Farm') {
        ++farms;
      } else if (getType(u) === 'Man' || getType(u) === 'Tank') {
        ++army;
      }
    }
  });
  return cities * 10 + farms * 2 - army;
}

const clickEvent = () => {
  Button.onClick();
};

function fieldClick(i, j) {
  const u = Unit.getUnit(i, j);
  console.log(i, j, action, u);
  clearSideButtons();
  showNonCityButtons();
  if (action !== undefined) {
    if (action.fnCrMv(i, j)) {
      performAct(i, j);
    } else if (action.fnAtt !== undefined && action.fnAtt(i, j)) {
      performAct(i, j, true);
    } else {
      action = undefined;
    }
  } else if (getType(u) === 'City' && u.plr.id === actPlNum) {
    showBasicUnitButtons(u);
    showCityButtons(u);
  } else if ((getType(u) === 'Man' || getType(u) === 'Tank') && u.plr.id === actPlNum) {
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
  const cnv = createCanvas(windowWidth, windowHeight);
  setStartLocation();
  cnv.mouseClicked(clickEvent);
  showMainButtons();
  strokeWeight(0);
  Player.nextTurn();
  showNonCityButtons();
  sounds.themeMelody0.loop();
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
  drawButtons();
  drawMainInfo();
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
          if (f[el.i][el.j] > -1 && ter[el.i][el.j] < 1) {
            f[i][j] = f[el.i][el.j];
          }
        });
      } else if (ter[i][j] > 0) {
        const captrd = f[i][j];
        let found = false;
        getAdj(0, i, j).forEach(el => {
          if (f[el.i][el.j] === captrd && ter[el.i][el.j] < 1) {
            found = true;
          }
        });
        if (!found) {
          f[i][j] = -1;
        }
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

function showMainButtons() {
  buttons.push(new Button(nextTurn, width - 300, height - 100, 250, 50, false, color(255), 'END TURN', 1, 1));
}

function nextTurn() {
  Player.nextTurn();
}

function showBasicUnitButtons(u) {
  clearSideButtons();
  buttons.push(new Button(lock(destructUnit, u), width - 300, 50, 250, 50, false, color(255), 'delete', 1, 2));
  buttons.push(new Button(lock(repairUnit, u), width - 300, 150, 250, 50, false, color(255), `repair ${priceList[`repair${getType(u)}`]}$`, 1, 2));
}

function showCityButtons(u) {
  buttons.push(new Button(lock(buyMan, u), width - 300, 220, 250, 50, false, color(255), `man ${priceList.man}$`, 1, 2));
  buttons.push(new Button(lock(buyTank, u), width - 300, 290, 250, 50, false, color(255), `tank ${priceList.tank}$`, 1, 2));
}

function showNonCityButtons() {
  clearSideButtons();
  buttons.push(new Button(lock(buyOnTer, new City(0, 0, players[actPlNum])), width - 300, 80, 250, 50, false, color(255), `city ${priceList.city}$`, 1, 2));
  buttons.push(new Button(lock(buyOnTer, new Fort(0, 0, players[actPlNum])), width - 300, 150, 250, 50, false, color(255), `fort ${priceList.fort}$`, 1, 2));
  buttons.push(new Button(lock(buyOnTer, new Farm(0, 0, players[actPlNum])), width - 300, 220, 250, 50, false, color(255), `farm ${priceList.farm}$`, 1, 2));
}

function clearSideButtons() {
  delGroup(2);
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
    fnCrMv: lock(canSetCheck, canSetNearCity, true, m, city),
    u: m,
    aType: actType.CREATE,
    city,
  };
  updateActionZones();
}

function buyTank(city) {
  const t = new Tank(0, 0, players[actPlNum]);
  action = {
    fnCrMv: lock(canSetCheck, canSetNearCity, true, t, city),
    u: t,
    aType: actType.CREATE,
    city,
  };
  updateActionZones();
}

function buyOnTer(u) {
  action = {
    fnCrMv: lock(canSetCheck, () => true, true, u, undefined),
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
  if (isAdj(i0, j0, range, i, j) && Unit.getUnit(i, j) === undefined && (ter[i][j] === 0 || (floats && ter[i][j] === 2))) {
    return true;
  }
  return false;
}

function canFire(i0, j0, range, i, j) {
  const enm = Unit.getUnit(i, j);
  if (isAdj(i0, j0, range, i, j) && enm !== undefined && enm.plr.id !== actPlNum) {
    return true;
  }
  console.log('cant fire');
  return false;
}

function canSetCheck(fCheck, u, groundOnly, param, i, j) {
  if (fCheck(i, j, u, param) && f[i][j] === actPlNum && Unit.getUnit(i, j) === undefined && (!groundOnly || ter[i][j] < 1)) {
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
    if (players[actPlNum].money >= action.u.price && (action.city === undefined || action.city.energy >= 2)) {
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
    } else { // move
      if (action.u.energy > 0) {
        players[actPlNum].conq(i, j);
        action.u.energy -= 1;
        setActionUnit(i, j, false);
      }
    }
  }
}

function setActionUnit(i, j, addToUnits = true) { // sets current action unit to given position
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
  return [Math.round((x - offsetX) / fieldSize - 0.5), Math.round((y - offsetY) / fieldSize - 0.5)];
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
  console.log(buttons);
}

const lock = (f, ...args) => (...args2) => f(...args, ...args2);

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
  console.log(x0, y0, x, y, w, h);
  if (x0 >= x && x0 < x + w && y0 >= y && y0 < y + h) {
    console.log('true');
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
  arr.forEach((obj) => {
    if (obj.priority > highestPr) {
      highestPr = obj.priority;
    }
  });
  arr.forEach((obj) => {
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
      if (val === 0) {
        drawGround(x, y);
      } else if (val === 1) {
        drawMount(x, y);
      } else if (val === 2) {
        drawWater(x, y);
      }
    }
  }
}

function drawButtons() {
  buttons.forEach(b => {
    if (b.col !== undefined) {
      drawButton(b);
    }
  });
}

function drawButton(b) {
  textSize(32);
  textAlign(CENTER, CENTER);
  fill(b.col);
  rect(b.x, b.y, b.w, b.h);
  fill(0);
  text(b.text, b.x, b.y, b.w, b.h);
}

function drawF(x, y, ...col) {
  fill(...col);
  rect(x, y, fieldSize, fieldSize);
}

function drawGround(x, y) {
  const r = rand01(...getIJ(x, y));
  if (r === 1) {
    image(textures.ground0, x, y, fieldSize, fieldSize);
  } else {
    image(textures.ground1, x, y, fieldSize, fieldSize);
  }
  // drawF(x, y, 142, 209, 79);
}

function drawMount(x, y) {
  drawGround(x, y);
  const r = rand01(...getIJ(x, y));
  if (r === 1) {
    image(textures.mount0, x, y, fieldSize, fieldSize);
  } else {
    image(textures.mount1, x, y, fieldSize, fieldSize);
  }
  // fill(150);
  // triangle(x + fieldSize / 2, y - fieldSize / 4, x, y + fieldSize, x + fieldSize, y + fieldSize);
}

function drawWater(x, y) {
  image(textures.water, x, y, fieldSize, fieldSize);
  // drawF(x, y, 130, 160, 255);
}

function drawCity(x, y, plr) {
  image(textures.city, x, y, fieldSize, fieldSize);
  //  fill(plr.color);
  // rect(x + fieldSize / 4, y + fieldSize / 5, fieldSize / 2, (fieldSize * 4) / 5);
}

function drawFort(x, y, plr) {
  image(textures.fort, x, y, fieldSize, fieldSize);
  // fill(170);
  // rect(x + fieldSize / 4, y + fieldSize / 2, fieldSize / 2, (fieldSize) / 3);
}

function drawFarm(x, y, plr) {
  const r = rand01(...getIJ(x, y));
  if (r === 1) {
    image(textures.farm0, x, y, fieldSize, fieldSize);
  } else {
    image(textures.farm1, x, y, fieldSize, fieldSize);
  }
  // fill(230, 230, 140);
  // rect(x + fieldSize / 3, y + fieldSize / 2, fieldSize / 3, fieldSize / 3);
}

function drawMan(x, y, plr) {
  image(textures[`man0p${plr.id}`], x, y, fieldSize, fieldSize);
  // fill(plr.color);
  // ellipse(x + fieldSize / 2, y + fieldSize / 2, fieldSize / 2, fieldSize / 2);
}

function drawTank(x, y, plr) {
  image(textures[`tank0p${plr.id}`], x, y, fieldSize, fieldSize);
  // fill(plr.color);
  // ellipse(x + fieldSize / 2, y + fieldSize / 2, fieldSize * (3 / 4), fieldSize * (3 / 4));
}

function drawCanMove(x, y) {
  fill(100, 255, 0, 100);
  rect(x + fieldSize / 8, y + fieldSize / 8, (fieldSize / 4) * 3, (fieldSize / 4) * 3);
}

function drawCanAttack(x, y) {
  fill(255, 0, 0, 100);
  rect(x + fieldSize / 8, y + fieldSize / 8, (fieldSize / 4) * 3, (fieldSize / 4) * 3);
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
  text(`Player ${actPlNum + 1}`, width - 300, height - 300, 250, 50);
  fill('gold');
  text(`${players[actPlNum].money}$ (+${getEarnings()})`, width - 300, height - 260, 250, 50);
}

function getBrightColor(c) { // optimize
  const rgb = [];
  c.levels.forEach(e => rgb.push(e));
  return color(rgb[0], rgb[1], rgb[2], 255);
}

function drawBar(x, y, val, max, col) {
  const interval = 3, len = 4, hh = 4;
  const d = (points) => {
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
  if (type === 'City') {
    drawCity(x, y, u.plr);
  } else if (type === 'Man') {
    drawMan(x, y, u.plr);
  } else if (type === 'Tank') {
    drawTank(x, y, u.plr);
  } else if (type === 'Fort') {
    drawFort(x, y, u.plr);
  } else if (type === 'Farm') {
    drawFarm(x, y, u.plr);
  }
}

function drawUnits() {
  units.forEach(u => {
    drawUnit(u);
  });
}
