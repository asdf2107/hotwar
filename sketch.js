const fWidth = 10, fHeight = 10, fieldSize = 60, offsetX = 50, offsetY = 50, fAlpha = 100;
const f = []; // -1 - uncaptured; 0 - player 0; 1 - player 1; ...
const ter = []; // 0 - ground; 1 - mountain; 2 - sea
const units = []; // man; tank; city; wall
const players = []; // active palyers
const buttons = [];
let action /* When buying smth */, actPlNum = 1;
const actType = { // type of an action
  CREATE: 'c',
  MOVEATTACK: 'mt',
  ATTACK: 't',
  MOVE: 'm',
};
const priceList = {
  city: 100,
  man: 10,
};

class Button {
  constructor(x, y, w, h, callback, scalable = false, col = undefined, text = '', priority = 0, group = 0) {
    buttons.push({
      x, y, w, h, callback, priority, group, scalable, col, text,
    });
  }

  static onClick() {
    const act = [];
    buttons.forEach((zone) => {
      if (isInArea(mouseX, mouseY, zone.x, zone.y, zone.w, zone.h)) {
        act.push(zone);
      }
    });
    if (act.length > 1) {
      getHighestPr(act).callback();
    } else if (act.length === 1) {
      act[0].callback();
    }
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
      this.selfdestruct();
    }
  }

  selfdestruct() {
    units.splice(units.indexOf(this), 1);
  }
}

class City extends Unit {
  constructor(i, j, plr) {
    super(i, j, plr, 5, -1, -1, -1, 5, priceList.city);
    this.level = 0;
    f[i][j] = plr.id;
    setAdj(i, j, plr.id, f);
  }
}

class Man extends Unit {
  constructor(i, j, plr) {
    super(i, j, plr, 2, 0, 1, 1, 3, priceList.man);
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
    actPlNum = actPlNum === players.length - 1 ? 0 : ++actPlNum;
    hideCityButtons();
    refillEnergy();
    addMoney();
    console.log(actPlNum);
  }
}

function addMoney() {
  let cities = 0;
  units.forEach(u => {
    if (u.plr.id === actPlNum && getType(u) === 'City') {
      ++cities;
    }
  });
  players[actPlNum].money += cities * 5;
}

const clickEvent = () => {
  Button.onClick();
};

function fieldClick(i, j) {
  const u = Unit.getUnit(i, j);
  console.log(i, j, action, u);
  hideCityButtons();
  if (action !== undefined) {
    if (action.fnCrMv(i, j)) {
      performAct(i, j);
    } else if (action.fnAtt !== undefined && action.fnAtt(i, j)) {
      performAct(i, j, true);
    } else {
      action = undefined;
    }
  } else if (getType(u) === 'City' && u.plr.id === actPlNum) {
    showCityButtons(u);
  } else if (getType(u) === 'Man' && u.plr.id === actPlNum) {
    fireMoveUnit(u);
  }
}

// eslint-disable-next-line no-unused-vars
function setup() {
  players.push(new Player(0, color(0, 0, 255, fAlpha)));
  players.push(new Player(1, color(255, 0, 0, fAlpha)));
  initArr(f, -1);
  initArr(ter);
  units.push(new City(1, 1, players[0]));
  units.push(new City(fWidth - 2, fHeight - 2, players[1]));
  players[0].conq(0, 0);
  players[1].conq(fWidth - 1, fHeight - 1);
  // console.log(f);
  genTerrain();
  initGridClick();
  const cnv = createCanvas(1000, 700);
  cnv.mouseClicked(clickEvent);
  showMainButtons();
  strokeWeight(0);
  Player.nextTurn();
  showNonCityButtons();
}


// eslint-disable-next-line no-unused-vars
function draw() {
  background(0);
  drawButtons();
  drawBackgr();
  drawBorders();
  drawUnits();
  drawHps();
  drawEnrgs();
  drawMainInfo();
  updActionUnit();
}


function updActionUnit() {
  if (action !== undefined) {
    const [i, j] = getIJ(mouseX, mouseY);
    if (isInBounds(i, j)) {
      if (action.aType === actType.CREATE) {
        action.u.i = i;
        action.u.j = j;
      }
      if (action.fnCrMv(i, j)) {
        drawCanMove(...getXY(i, j));
      } else if (action.fnAtt !== undefined && action.fnAtt(i, j)) {
        drawCanAttack(...getXY(i, j));
      } else {
        drawCross(...getXY(i, j));
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

function showMainButtons() {
  buttons.push(new Button(width - 300, height - 100, 250, 50, nextTurn, false, color(255), 'END TURN', 1, 1));
}

function nextTurn() {
  Player.nextTurn();
}

function showCityButtons(u) {
  hideNonCityButtons();
  buttons.push(new Button(width - 300, 80, 250, 50, lock(buyMan, u), false, color(255), `man ${priceList.man}$`, 1, 2));
}

function showNonCityButtons() {
  buttons.push(new Button(width - 300, 80, 250, 50, buyCity, false, color(255), `city ${priceList.city}$`, 1, 3));
}

function hideCityButtons() {
  delGroup(2);
  showNonCityButtons();
}

function hideNonCityButtons() {
  delGroup(3);
}

function buyMan(city) {
  console.log('bought');
  const m = new Man(0, 0, players[actPlNum]);
  action = {
    fnCrMv: lock(canSetCheck, canSetMan, true, m, city),
    u: m,
    aType: actType.CREATE,
    city,
  };
}

function buyCity() {
  const c = new City(0, 0, players[actPlNum]);
  action = {
    fnCrMv: lock(canSetCheck, () => true, true, c, undefined),
    u: c,
    aType: actType.CREATE,
  };
}

function moveUnit(u) { // if movable unit is clicked
  action = {
    fnCrMv: lock(canMove, u.i, u.j, u.moveRange),
    u,
    aType: actType.MOVE,
  };
}

function fireMoveUnit(u) { // if fireable unit is clicked
  action = {
    fnCrMv: lock(canMove, u.i, u.j, u.moveRange),
    fnAtt: lock(canFire, u.i, u.j, u.fireRange),
    u,
    aType: actType.MOVEATTACK,
  };
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

function canSetMan(i, j, u, city) {
  if (isAdj(city.i, city.j, 1, i, j)) {
    return true;
  }
  return false;
}

function performAct(i, j, fnAtt = false) {
  if (action.aType === actType.CREATE) {
    if (players[actPlNum].money >= action.u.price) {
      players[actPlNum].money -= action.u.price;
      action.u.energy = 0;
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
      const [x, y] = getXY(i, j);
      buttons.push(new Button(x, y, fieldSize, fieldSize, lock(fieldClick, i, j), true));
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
  if (x0 >= x && x0 <= x + w && y0 >= y && y0 <= y + h) {
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

function genTerrain() { // Make Perlin noise (later)
  for (let i = 0; i < fWidth; i++) {
    for (let j = 0; j < fHeight; j++) {
      const r = random(0, 100);
      if (r > 90) {
        ter[i][j] = 1;
      } else if (r > 70) {
        ter[i][j] = 2;
      }
    }
  }
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
        drawSea(x, y);
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
  drawF(x, y, 108, 194, 97);
}

function drawMount(x, y) {
  drawGround(x, y);
  fill(150);
  triangle(x + fieldSize / 2, y - fieldSize / 4, x, y + fieldSize, x + fieldSize, y + fieldSize);
}

function drawSea(x, y) {
  drawF(x, y, 130, 160, 255);
}

function drawCity(x, y, plr) {
  fill(plr.color);
  rect(x + fieldSize / 4, y + fieldSize / 5, fieldSize / 2, (fieldSize * 4) / 5);
}

function drawMan(x, y, plr) {
  fill(plr.color);
  ellipse(x + fieldSize / 2, y + fieldSize / 2, fieldSize / 2, fieldSize / 2);
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
  drawBar(x, y, hp, max, color(255), 2);
}

function drawEnrg(x, y, hp, max) {
  drawBar(x, y, hp, max, color(100, 180, 255), 8);
}

function drawMainInfo() {
  textAlign(CENTER);
  fill(getBrightColor(players[actPlNum].color));
  text(`Player ${actPlNum + 1}`, width - 300, height - 300, 250, 50);
  fill('gold');
  text(`${players[actPlNum].money} $`, width - 300, height - 260, 250, 50);
}

function getBrightColor(c) { // optimize
  const rgb = [];
  c.levels.forEach(e => rgb.push(e));
  return color(rgb[0], rgb[1], rgb[2], 255);
}

function drawBar(x, y, val, max, col, h) {
  const interval = 5, len = 2;
  const d = (points) => {
    for (let i = 0; i < points; i++) {
      line((interval + len) * i + x + interval, y + fieldSize - h, (interval + len) * (i + 1) + x, y + fieldSize - h);
    }
  };
  stroke(160);
  strokeWeight(5);
  d(max);
  stroke(col);
  d(val);
  strokeWeight(0);
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
  if (getType(u) === 'City') {
    drawCity(x, y, u.plr);
  } else if (getType(u) === 'Man') {
    drawMan(x, y, u.plr);
  }
}

function drawUnits() {
  units.forEach(u => {
    drawUnit(u);
  });
}
