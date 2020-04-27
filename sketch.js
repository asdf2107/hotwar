const fWidth = 20, fHeight = 20, fieldSize = 30, offsetX = 50, offsetY = 50, fAlpha = 100;
const f = []; // -1 - uncaptured; 0 - player 0; 1 - player 1; ...
const ter = []; // 0 - ground; 1 - mountain; 2 - sea
const unit = []; // man; tank; city; wall
const player = []; // active palyers
const buttons = [];
let chosenUnit, action /*When buying smth*/, activePlayerNum = 0;

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
  constructor(i, j, plr, maxHp, hp = maxHp) {
    this.i = i;
    this.j = j;
    this.plr = plr;
    this.hp = hp;
    this.maxHp = maxHp;
  }

  static getUnit(i, j) {
    let res;
    unit.forEach(u => {
      if (u.i === i && u.j === j) {
        res = u;
      }
    });
    return res;
  }
}

class City extends Unit {
  constructor(i, j, plr) {
    super(i, j, plr, 8);
    this.level = 0;
    f[i][j] = plr.id;
    setAdj(i, j, plr.id);
  }
}

class Man extends Unit {
  constructor(i, j, plr) {
    super(i, j, plr, 8);
  }
}

function setAdj(i, j, val, ifClear = true) {
  for (let p = -1; p <= 1; p++) {
    for (let q = -1; q <= 1; q++) {
      if (f[i + p] !== undefined && f[i + p][j + q] !== undefined && (!ifClear || f[i + p][j + q] === -1)) {
        f[i + p][j + q] = val;
      }
    }
  }
}

function isAdj(i0, j0, i, j, d = 0, noCenter = true) { // d: 0 - cross [4]; 1 - square [8] (setAdj); 2 - phombus [12]
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
    throw new Error('isAdj: invalid argument "d"');
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
    this.money = 50;
  }

  conq(i, j) {
    f[i][j] = this.id;
  }

  static nextTurn() {
    chosenUnit = undefined;
    action = undefined;
    activePlayerNum = activePlayerNum === player.length - 1 ? 0 : ++activePlayerNum;
    console.log(activePlayerNum);
  }
}

const clickEvent = () => {
  Button.onClick();
};

function fieldClick(i, j) {
  console.log(i, j);
  const u = Unit.getUnit(i, j);
  console.log(u);
  if (getType(u) === 'City' && u.plr.id === activePlayerNum) {
    chosenUnit = u;
    showCityButtons(u);
  }
  else if (action !== undefined) {
    // if (action.checkFn()) {
    setActionUnit(i, j);
    // }
  }
}

// eslint-disable-next-line no-unused-vars
function setup() {
  player.push(new Player(0, color(0, 0, 255, fAlpha)));
  player.push(new Player(1, color(255, 0, 0, fAlpha)));
  initArr(f, -1);
  initArr(ter);
  unit.push(new City(0, 0, player[0]));
  unit.push(new City(fWidth - 1, fHeight - 1, player[1]));
  player[0].conq(0, 0);
  player[1].conq(fWidth - 1, fHeight - 1);
  // console.log(f);
  genTerrain();
  initGridClick();
  const cnv = createCanvas(1000, 700);
  cnv.mouseClicked(clickEvent);
  showMainButtons();
}


// eslint-disable-next-line no-unused-vars
function draw() {
  background(0);
  drawButtons();
  drawBackgr();
  drawBorders();
  drawUnits();
}

function showMainButtons() {
  buttons.push(new Button(width - 250, height - 100, 200, 50, nextTurn, false, color(255), 'NEXT TURN', 1, 1));
}

function nextTurn() {
  Player.nextTurn();
}

function showCityButtons(u) {
  buttons.push(new Button(width - 200, 100, 100, 50, lock(buyMan, u), false, color(255), 'man', 1, 2));
}

function hideCityButtons() {
  delGroup(2);
}

function buyMan(city) {
  console.log('bought');
  action = { checkFn: lock(canSetCheck, () => true), u: new Man(0, 0, player[activePlayerNum]), city };
}

function canSetCheck(fCheck, i, j, ...fcArgs) {
  if (fCheck(...fcArgs) && f[i][j] === activePlayerNum) {
    return true;
  }
  return false;
}

function setActionUnit(i, j) {
  action.u.i = i;
  action.u.j = j;
  unit.push(action.u);
  action = undefined;
}

function getXYofFied(x, y) {
  return [x * fieldSize + offsetX, y * fieldSize + offsetY];
}

function initGridClick() {
  for (let i = 0; i < fWidth; i++) {
    for (let j = 0; j < fHeight; j++) {
      const [x, y] = getXYofFied(i, j);
      buttons.push(new Button(x, y, fieldSize, fieldSize, lock(fieldClick, i, j), true));
    }
  }
  console.log(buttons);
}

const lock = (f, ...args) => () => f(...args);

function initArr(arr, val = 0) {
  const ySlice = [];
  for (let i = 0; i < fHeight; i++) {
    ySlice.push(val);
  }
  for (let i = 0; i < fHeight; i++) {
    arr.push(ySlice.slice());
  }
}

function isInArea(x0, y0, x, y, w, h) {
  if (x0 >= x && x0 <= x + w && y0 >= y && y0 <= y + h) {
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
      const [x, y] = getXYofFied(i, j);
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
  fill(180);
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

function drawBorders() {
  for (let i = 0; i < fWidth; i++) {
    for (let j = 0; j < fHeight; j++) {
      const val = f[i][j];
      if (val !== -1) {
        const [x, y] = getXYofFied(i, j);
        drawF(x, y, player[val].color);
      }
    }
  }
}

function drawUnit(u) {
  const [x, y] = getXYofFied(u.i, u.j);
  if (getType(u) === 'City') {
    drawCity(x, y, u.plr);
  } else if (getType(u) === 'Man') {
    drawMan(x, y, u.plr);
  }
}

function drawUnits() {
  unit.forEach(u => {
    drawUnit(u);
  });
}
