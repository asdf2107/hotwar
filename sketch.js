const fWidth = 20, fHeight = 20, fieldSize = 30, offsetX = 50, offsetY = 50, fAlpha = 100;
const f = []; // 0 - uncaptured; 1 - player 1; 2 - player 2; ...
const ter = []; // 0 - ground; 1 - mountain; 2 - sea
// const obj = []; // null; troop; tank; city; wall
const player = [null];

class ClickMgr {
  constructor() {
    this.zones = [];
  }

  addZone(x, y, w, h, callback, priority = 0) {
    this.zones.push({
      x, y, w, h, callback, priority,
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

class Player {
  constructor(id, color) {
    this.id = id;
    this.color = color;
    this.money = 50;
  }
}

const click = new ClickMgr();
const clickEvent = () => {
  click.onClick();
};


// eslint-disable-next-line no-unused-vars
function setup() {
  player.push(new Player(1, color(0, 0, 255, fAlpha)));
  player.push(new Player(2, color(255, 0, 0, fAlpha)));
  initArr(f);
  f[0][0] = 1;
  f[fWidth - 1][fHeight - 1] = 2;
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

function initArr(arr) {
  const ySlice = [];
  for (let i = 0; i < fHeight; i++) {
    ySlice.push(0);
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

function drawBorders() {
  for (let i = 0; i < fWidth; i++) {
    for (let j = 0; j < fHeight; j++) {
      const val = f[i][j];
      if (val !== 0) {
        const [x, y] = getXYofFied(i, j);
        drawF(x, y, player[val].color);
      }
    }
  }
}
