const fWidth = 20, fHeight = 20, fieldSize = 30, offsetX = 50, offsetY = 50, fAlpha = 100;
const f = []; // 0 - uncaptured; 1 - player 1; 2 - player 2; ...
const ter = []; // 0 - ground; 1 - mountain; 2 - sea
const unit = []; // man; tank; city; wall
const player = []; // active palyers

class ClickMgr {
  constructor() {
    this.zones = [];
  }

  addZone(x, y, w, h, callback, priority = 0, group = 0) {
    this.zones.push({
      x, y, w, h, callback, priority, group,
    });
  }

  delGroup(n) {
    this.zones.forEach(z => {
      if (z.group === n) {
        this.zones.splice(this.zones.indexOf(z));
      }
    });
  }

  onClick() {
    const act = [];
    this.zones.forEach((zone) => {
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

class Unit {
  constructor(i, j, maxHp, hp = maxHp) {
    this.i = i;
    this.j = j;
    this.hp = hp;
    this.maxHp = maxHp;
  }
}

class City extends Unit {
  constructor(i, j) {
    super(i, j, 8);
    this.level = 0;
  }
}

class Man extends Unit {
  constructor(i, j) {
    super(i, j, 8);
  }
}

function getType(u) {
  if (!(u instanceof Unit)) {
    throw new Error('getType works for Units only!');
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
}

const click = new ClickMgr();
const clickEvent = () => {
  click.onClick();
};


// eslint-disable-next-line no-unused-vars
function setup() {
  player.push(new Player(0, color(0, 0, 255, fAlpha)));
  player.push(new Player(1, color(255, 0, 0, fAlpha)));
  initArr(f, -1);
  player[0].conq(0, 0);
  player[1].conq(fWidth - 1, fHeight - 1);
  initArr(ter);
  console.log(f);
  genTerrain();
  initGridClick();
  const cnv = createCanvas(800, 800);
  cnv.mouseClicked(clickEvent);
}


// eslint-disable-next-line no-unused-vars
function draw() {
  background(0);
  drawBackgr();
  drawBorders();
  drawUnits();
}


function getXYofFied(x, y) {
  return [x * fieldSize + offsetX, y * fieldSize + offsetY];
}

function initGridClick() {
  for (let i = 0; i < fWidth; i++) {
    for (let j = 0; j < fHeight; j++) {
      const [x, y] = getXYofFied(i, j);
      click.addZone(x, y, fieldSize, fieldSize, lock(fieldClick, i, j));
    }
  }
  console.log(click.zones);
}

function fieldClick(i, j) {
  console.log(i, j);
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

function drawCity(x, y) {
  fill(100);
  rect(x + fieldSize / 4, y + fieldSize / 5, fieldSize / 2, (fieldSize * 4) / 5);
}

function drawMan(x, y) {
  fill(50);
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
    drawCity(x, y);
  } else if (getType(u) === 'Man') {
    drawMan(x, y);
  }
}

function drawUnits() {
  unit.forEach(u => {
    drawUnit(u);
  });
}
