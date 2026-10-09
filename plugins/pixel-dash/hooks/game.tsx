import type { ClientModule, ClientSurface, JsonValue } from 'claude-code'

// Pixel Dash draws real pixel art in a text grid: every cell is two square
// pixels stacked ("▀", the top pixel as its colour, the bottom as its
// background), and every tile is a 6×6 sprite, so a tile is 6 cells by 3.

// ---- tuning (tiles and 50 ms ticks) ----

const TICK_MS = 50
const TILE = 6
const GRAVITY = 0.11
const JUMP = -1.05
const STOMP_BOUNCE = -0.62
const MAX_FALL = 0.7
const RUN = 0.26
const RUN_TICKS = 6 // keys have no key-up: a press keeps you running this long
const ENEMY_SPEED = 0.05
const LIVES = 3
const H = 10

// ---- palette and sprites ----

const PAL: Record<string, string> = {
  R: '#d82800', // cap, shirt
  r: '#a01800',
  S: '#fcb898', // skin
  k: '#1a1a1a',
  B: '#2038ec', // overalls
  b: '#1028a0',
  N: '#7c3c00', // shoes, hair
  Y: '#fca044', // gold
  y: '#f8d878',
  O: '#c84c0c', // brick
  o: '#7c2800',
  D: '#a85020', // dirt
  d: '#6c2c08',
  G: '#00a800', // grass, pipes
  g: '#007000',
  L: '#80d010',
  W: '#fcfcfc',
  w: '#c8d4ff',
  T: '#f0c890', // goomba feet
  M: '#c06020', // goomba
  m: '#783000',
  P: '#9c9c9c', // pole
  F: '#30c030', // flag
  H: '#58b830', // hills
  h: '#3c8c20',
  U: '#5c7cd8', // cave stone and bricks
  u: '#1c2c6c',
  V: '#8ca8f0',
  E: '#7c5020', // tree trunk
  e: '#4c2c08',
}

const sprite = (...rows: string[]) => rows
const flip = (s: string[]) => s.map(r => [...r].reverse().join(''))

const HERO = {
  stand: sprite('..RRR.', '.RRRRR', '.NSkS.', 'RRBBRR', '.BBBB.', '.NN.NN'),
  walk: sprite('..RRR.', '.RRRRR', '.NSkS.', 'RRBBRS', 'SBBBB.', 'NN..N.'),
  jump: sprite('S.RRR.', '.RRRRR', '.NSkSS', 'RRBBR.', '.BBBB.', 'NN..NN'),
  dead: sprite('.RRRR.', 'SNSSNS', '.SkkS.', 'RRBBRR', '.BBBB.', 'N....N'),
}
const GOOMBA = {
  a: sprite('..MM..', '.MMMM.', 'MWkkWM', 'MMMMMM', '.TTTT.', 'mm..mm'),
  b: sprite('..MM..', '.MMMM.', 'MkWWkM', 'MMMMMM', '.TTTT.', '.mmmm.'),
  flat: sprite('......', '......', '......', '......', 'MWkkWM', 'mmmmmm'),
}
const COIN = [
  sprite('..YY..', '.YyyY.', '.YyYY.', '.YyYY.', '.YyyY.', '..YY..'),
  sprite('..YY..', '..yY..', '..yY..', '..yY..', '..yY..', '..YY..'),
  sprite('...Y..', '...Y..', '...Y..', '...Y..', '...Y..', '...Y..'),
  sprite('..YY..', '..Yy..', '..Yy..', '..Yy..', '..Yy..', '..YY..'),
]
const DIGITS: Record<string, string[]> = {
  '0': sprite('WWW', 'W.W', 'W.W', 'W.W', 'WWW'),
  '1': sprite('.W.', 'WW.', '.W.', '.W.', 'WWW'),
  '2': sprite('WWW', '..W', 'WWW', 'W..', 'WWW'),
  '3': sprite('WWW', '..W', '.WW', '..W', 'WWW'),
  '4': sprite('W.W', 'W.W', 'WWW', '..W', '..W'),
  '5': sprite('WWW', 'W..', 'WWW', '..W', 'WWW'),
  '6': sprite('WWW', 'W..', 'WWW', 'W.W', 'WWW'),
  '7': sprite('WWW', '..W', '.W.', '.W.', '.W.'),
  '8': sprite('WWW', 'W.W', 'WWW', 'W.W', 'WWW'),
  '9': sprite('WWW', 'W.W', 'WWW', '..W', 'WWW'),
}
const TILES: Record<string, string[]> = {
  grass: sprite('LLGLLG', 'GGGGGG', 'gDgDDg', 'DDDdDD', 'DdDDDD', 'DDDDdD'),
  dirt: sprite('DDdDDD', 'DDDDdD', 'dDDDDD', 'DDDdDD', 'DdDDDD', 'DDDDDd'),
  brick: sprite('oooooo', 'OOOoOO', 'OOOoOO', 'oooooo', 'OoOOOO', 'OoOOOO'),
  q1: sprite('oYYYYo', 'YYkkYY', 'YYYYkY', 'YYYkYY', 'YYYYYY', 'oYYkYo'),
  q2: sprite('oyyyyo', 'yykkyy', 'yyyyky', 'yyykyy', 'yyyyyy', 'oyykyo'),
  spent: sprite('oooooo', 'oNNNNo', 'oNNNNo', 'oNNNNo', 'oNNNNo', 'oooooo'),
  pipeTopL: sprite('gggggg', 'gLLGGG', 'gLLGGG', 'gggggg', '.gLGGG', '.gLGGG'),
  pipeTopR: sprite('gggggg', 'GGGGGg', 'GGGGgg', 'gggggg', 'GGGGg.', 'GGGgg.'),
  pipeL: sprite('.gLGGG', '.gLGGG', '.gLGGG', '.gLGGG', '.gLGGG', '.gLGGG'),
  pipeR: sprite('GGGGg.', 'GGGgg.', 'GGGGg.', 'GGGgg.', 'GGGGg.', 'GGGgg.'),
  pole: sprite('..PP..', '..PP..', '..PP..', '..PP..', '..PP..', '..PP..'),
  flag: sprite('..PP..', 'FFPP..', 'FFFP..', '.FFP..', '..PP..', '..PP..'),
  ball: sprite('......', '..GG..', '.GLGG.', '.GGGG.', '..GG..', '..PP..'),
  cloudL: sprite('......', '...WWW', '.WWWWW', 'WWWWWW', 'wWWWWW', '.wwwww'),
  cloudR: sprite('......', 'W.....', 'WWWW..', 'WWWWW.', 'WWWWWw', 'wwwww.'),
  hillL: sprite('......', '......', '....HH', '..HHHH', '.HHhHH', 'HHHHHH'),
  hillM: sprite('.HHHH.', 'HHHHHH', 'HHhHHH', 'HHHHHh', 'HHHHHH', 'HHHHHH'),
  stone: sprite('UUUUUu', 'UVUUUu', 'UUUUUu', 'UUUUUu', 'uuuuuu', 'UUuUUU'),
  blueBrick: sprite('uuuuuu', 'UUUuUU', 'UVUuUU', 'uuuuuu', 'UuUUUU', 'UuUVUU'),
  treeL: sprite('.GGGGG', 'GLGGLG', 'GGGGGG', 'gGGGGG', '.ggggg', '......'),
  treeM: sprite('GGGGGG', 'GLGGGL', 'GGGGGG', 'GGGGGG', 'gggggg', '......'),
  treeR: sprite('GGGGG.', 'GLGGGG', 'GGGGGG', 'GGGGGg', 'ggggg.', '......'),
  trunk: sprite('.EEEe.', '.EEee.', '.EEEe.', '.EeEe.', '.EEEe.', '.EEee.'),
  hillR: sprite('......', '......', 'HH....', 'HHHH..', 'HHhHH.', 'HHHHHH'),
}

// ---- levels ----
// tiles: # ground  = brick  ? coin block  B spent block  [ ] pipe  o coin
//        { - } treetop (solid)
// decoration: ( ) cloud   < ^ > hill   | pole   f flag   * pole top   ! trunk

const SOLID = new Set(['#', '=', '?', 'B', '[', ']', '{', '-', '}'])

type Theme = 'overworld' | 'underground' | 'sky'
type Level = { tiles: string[][]; spawns: { x: number; y: number }[]; flagX: number; checkpointX: number; theme: Theme; name: string }

const THEMES: Record<Theme, { sky: string }> = {
  overworld: { sky: '#6b8cff' },
  underground: { sky: '#08081a' },
  sky: { sky: '#9cbcfc' },
}

function grid(w: number) {
  const g: string[][] = Array.from({ length: H }, () => Array.from({ length: w }, () => ' '))
  const put = (x: number, y: number, t: string) => {
    if (y >= 0 && y < H && x >= 0 && x < w) g[y]![x] = t
  }
  const row = (x0: number, x1: number, y: number, t: string) => {
    for (let x = x0; x <= x1; x++) put(x, y, t)
  }
  const ground = (x0: number, x1: number) => {
    row(x0, x1, H - 2, '#')
    row(x0, x1, H - 1, '#')
  }
  const pipe = (x: number, h: number) => {
    for (let y = H - 2 - h; y < H - 2; y++) {
      put(x, y, '[')
      put(x + 1, y, ']')
    }
  }
  const flag = (x: number) => {
    put(x, 0, '*')
    put(x, 1, 'f')
    for (let y = 2; y < H - 2; y++) put(x, y, '|')
  }
  return { g, put, row, ground, pipe, flag }
}

// Every gap is at most 3 tiles, every step up at most 3, and no ceiling hangs
// over a gap: a jump rises about 4.5 tiles and carries about 4.5 across.
function level1(): Level {
  const W = 112
  const { g, put, row, ground, pipe, flag } = grid(W)
  ground(0, 29)
  ground(33, 65)
  ground(69, W - 1)
  for (const [x, y] of [[4, 1], [17, 2], [29, 1], [41, 2], [56, 1], [70, 2], [85, 1], [99, 2]] as const) {
    put(x, y, '(')
    put(x + 1, y, ')')
  }
  for (const x of [1, 38, 74]) {
    put(x, H - 3, '<')
    put(x + 1, H - 3, '^')
    put(x + 2, H - 3, '>')
  }
  pipe(20, 2)
  pipe(25, 3)
  pipe(47, 3)
  pipe(84, 2)

  put(10, 4, '?')
  row(13, 17, 4, '=')
  put(14, 4, '?')
  put(16, 4, '?')
  put(15, 0, '?')
  row(30, 32, 4, 'o') // an arc of coins over the first pit, nothing to bump into
  row(36, 40, 4, '=')
  put(38, 4, '?')
  row(41, 44, 1, '=')
  row(41, 44, 0, 'o')
  row(53, 57, 4, '=')
  put(55, 4, '?')
  row(59, 63, 4, '=')
  row(60, 62, 3, 'o')
  row(66, 68, 4, 'o') // the second pit: open sky above it too
  for (let i = 0; i < 7; i++) for (let y = H - 3 - i; y < H - 2; y++) put(92 + i, y, '=')
  flag(102)
  for (const x of [6, 7, 8]) put(x, H - 3, 'o')
  for (const x of [22, 23, 51, 52, 77, 78, 79]) put(x, H - 4, 'o')

  const spawns = [18, 29, 37, 50, 53, 61, 76, 80, 88].map(x => ({ x, y: H - 3 }))
  spawns.push({ x: 39, y: 3 })
  return { tiles: g, spawns, flagX: 102, checkpointX: 50, theme: 'overworld', name: '1-1' }
}

function level2(): Level {
  const W = 104
  const { g, put, row, ground, pipe, flag } = grid(W)
  ground(0, 33)
  ground(36, 69)
  ground(73, W - 1)
  row(4, 96, 0, '=') // the cave roof
  row(14, 20, 4, '=')
  put(17, 4, '?')
  row(15, 19, 3, 'o')
  for (let y = 5; y < H - 2; y++) put(26, y, '=')
  for (let y = 4; y < H - 2; y++) put(29, y, '=')
  row(27, 28, 2, 'o')
  row(34, 35, 5, 'o')
  pipe(40, 2)
  pipe(46, 3)
  row(52, 60, 5, '=') // a low tunnel: walk under it or run along its top
  row(53, 59, H - 3, 'o')
  row(53, 59, 4, 'o')
  put(64, 4, '?')
  put(66, 4, '?')
  row(70, 72, 5, 'o')
  row(78, 82, 4, '=')
  put(80, 4, '?')
  for (let i = 0; i < 4; i++) for (let y = H - 3 - i; y < H - 2; y++) put(88 + i, y, '=')
  flag(98)

  const spawns = [22, 38, 44, 50, 63, 77, 84].map(x => ({ x, y: H - 3 }))
  spawns.push({ x: 17, y: 3 })
  return { tiles: g, spawns, flagX: 98, checkpointX: 50, theme: 'underground', name: '1-2' }
}

function level3(): Level {
  const W = 104
  const { g, put, row, ground, flag } = grid(W)
  ground(0, 8)
  ground(96, W - 1)
  const tree = (x0: number, x1: number, y: number) => {
    put(x0, y, '{')
    row(x0 + 1, x1 - 1, y, '-')
    put(x1, y, '}')
    const mid = Math.floor((x0 + x1) / 2)
    for (let t = y + 1; t < H; t++) put(mid, t, '!')
  }
  const tops: [number, number, number][] = [
    [11, 15, 6], [18, 21, 4], [24, 29, 6], [32, 34, 3], [37, 42, 5], [45, 47, 3], [50, 56, 6],
    [59, 61, 4], [64, 70, 5], [73, 75, 3], [78, 83, 6], [86, 89, 4], [92, 94, 6],
  ]
  for (const [a, b, y] of tops) {
    tree(a, b, y)
    row(a + 1, b - 1, y - 1, 'o')
  }
  for (const [x, y] of [[3, 1], [27, 1], [52, 2], [80, 1]] as const) {
    put(x, y, '(')
    put(x + 1, y, ')')
  }
  put(40, 1, '?')
  put(67, 2, '?')
  flag(100)

  const spawns = [[26, 5], [40, 4], [53, 5], [67, 4], [81, 5]].map(([x, y]) => ({ x: x!, y: y! }))
  return { tiles: g, spawns, flagX: 100, checkpointX: 50, theme: 'sky', name: '1-3' }
}

const LEVELS = [level1, level2, level3]

// ---- state ----

type Enemy = { x: number; y: number; vx: number; vy: number; isDead: boolean; squashed: number }

type Game = {
  level: number
  theme: Theme
  name: string
  tiles: string[][]
  flagX: number
  checkpointX: number
  x: number
  y: number
  vx: number
  vy: number
  facing: 1 | -1
  runTicks: number
  isOnGround: boolean
  enemies: Enemy[]
  score: number
  coins: number
  lives: number
  checkpoint: number
  phase: 'ready' | 'play' | 'dying' | 'clear' | 'won' | 'over'
  phaseTicks: number
  ticks: number
  bumps: { x: number; y: number; ttl: number }[]
  popups: { x: number; y: number; text: string; ttl: number }[]
  isReported?: boolean
}

function newGame(level = 0, lives = LIVES, score = 0, coins = 0, checkpoint = 2): Game {
  const lv = LEVELS[level]!()
  return {
    level,
    theme: lv.theme,
    name: lv.name,
    tiles: lv.tiles,
    flagX: lv.flagX,
    checkpointX: lv.checkpointX,
    x: checkpoint,
    y: H - 3,
    vx: 0,
    vy: 0,
    facing: 1,
    runTicks: 0,
    isOnGround: true,
    enemies: lv.spawns.map(s => ({ ...s, vx: -ENEMY_SPEED, vy: 0, isDead: false, squashed: 0 })),
    score,
    coins,
    lives,
    checkpoint,
    phase: 'ready',
    phaseTicks: 0,
    ticks: 0,
    bumps: [],
    popups: [],
    isReported: false,
  }
}

// ---- physics ----

const levelWidth = (g: Game) => g.tiles[0]?.length ?? 0

const tileAt = (g: Game, x: number, y: number) => {
  const cx = Math.floor(x)
  const cy = Math.floor(y)
  if (cx < 0) return '#'
  if (cy < 0 || cy >= H || cx >= levelWidth(g)) return ' '
  return g.tiles[cy]![cx]!
}
const isSolid = (g: Game, x: number, y: number) => SOLID.has(tileAt(g, x, y))

const E = 0.001

/** Moves a 1×1 box along x then y against the tiles; reports what it hit. */
function move(g: Game, b: { x: number; y: number; vx: number; vy: number }) {
  let hitWall = false
  let hitHead: { x: number; y: number } | null = null
  let isOnGround = false

  b.x += b.vx
  if (b.vx > 0 && (isSolid(g, b.x + 1 - E, b.y + E) || isSolid(g, b.x + 1 - E, b.y + 1 - E))) {
    b.x = Math.floor(b.x + 1 - E) - 1
    hitWall = true
  } else if (b.vx < 0 && (isSolid(g, b.x, b.y + E) || isSolid(g, b.x, b.y + 1 - E))) {
    b.x = Math.floor(b.x) + 1
    hitWall = true
  }

  b.vy = Math.min(MAX_FALL, b.vy + GRAVITY)
  b.y += b.vy
  if (b.vy > 0 && (isSolid(g, b.x + E, b.y + 1) || isSolid(g, b.x + 1 - E, b.y + 1))) {
    b.y = Math.floor(b.y + 1) - 1
    b.vy = 0
    isOnGround = true
  } else if (b.vy < 0 && (isSolid(g, b.x + E, b.y) || isSolid(g, b.x + 1 - E, b.y))) {
    const cy = Math.floor(b.y)
    const cx = isSolid(g, b.x + 0.5, b.y) ? Math.floor(b.x + 0.5) : isSolid(g, b.x + E, b.y) ? Math.floor(b.x + E) : Math.floor(b.x + 1 - E)
    hitHead = { x: cx, y: cy }
    b.y = cy + 1
    b.vy = 0
  }
  return { hitWall, hitHead, isOnGround }
}

function popup(g: Game, x: number, y: number, text: string) {
  g.popups.push({ x, y, text, ttl: 16 })
}

function die(g: Game) {
  g.phase = 'dying'
  g.phaseTicks = 28
  g.vy = JUMP * 0.9
}

function step(g: Game) {
  g.ticks += 1
  g.popups = g.popups.filter(p => ((p.y -= 0.06), --p.ttl > 0))
  g.bumps = g.bumps.filter(b => --b.ttl > 0)

  if (g.phase === 'dying') {
    g.vy = Math.min(MAX_FALL, g.vy + GRAVITY * 0.7)
    g.y += g.vy
    if (--g.phaseTicks <= 0) {
      if (g.lives <= 1) {
        g.lives = 0
        g.phase = 'over'
      } else {
        Object.assign(g, newGame(g.level, g.lives - 1, g.score, g.coins, g.checkpoint), { phase: 'play' })
      }
    }
    return
  }
  if (g.phase === 'clear') {
    if (--g.phaseTicks <= 0) Object.assign(g, newGame(g.level + 1, g.lives, g.score, g.coins), { phase: 'play' })
    return
  }
  if (g.phase !== 'play') return

  if (g.runTicks > 0) g.runTicks -= 1
  else g.vx *= 0.55
  if (Math.abs(g.vx) < 0.01) g.vx = 0

  const hit = move(g, g)
  g.isOnGround = hit.isOnGround
  if (hit.hitHead) {
    const { x, y } = hit.hitHead
    const t = g.tiles[y]?.[x]
    if (t === '?') {
      g.tiles[y]![x] = 'B'
      g.coins += 1
      g.score += 200
      popup(g, x, y - 1, '200')
    }
    if (t === '?' || t === '=') g.bumps.push({ x, y, ttl: 5 })
  }

  for (const [cx, cy] of [
    [g.x + 0.5, g.y + 0.5],
    [g.x + 0.5, g.y + 0.15],
    [g.x + 0.5, g.y + 0.85],
  ] as const) {
    if (tileAt(g, cx, cy) === 'o') {
      g.tiles[Math.floor(cy)]![Math.floor(cx)] = ' '
      g.coins += 1
      g.score += 50
    }
  }
  if (g.coins >= 100) {
    g.coins -= 100
    g.lives += 1
  }

  if (g.x > g.checkpointX && g.checkpoint < g.checkpointX) g.checkpoint = g.checkpointX
  if (g.y > H + 1) return die(g)
  if (g.x + 0.6 >= g.flagX) {
    g.score += 1000
    if (g.level + 1 < LEVELS.length) {
      g.phase = 'clear'
      g.phaseTicks = 40
    } else {
      g.phase = 'won'
      g.score += g.lives * 500
    }
    return
  }

  for (const en of g.enemies) {
    if (en.isDead) {
      if (en.squashed > 0) en.squashed -= 1
      continue
    }
    if (Math.abs(en.x - g.x) > 18) continue // asleep off screen
    const r = move(g, en)
    // turn at walls, and at ledges so they keep to their platform
    const ahead = en.vx > 0 ? en.x + 1 + E : en.x - E
    if (r.hitWall || (r.isOnGround && !isSolid(g, ahead, en.y + 1.5))) en.vx = -en.vx
    if (en.y > H + 1) en.isDead = true

    const dx = Math.abs(en.x - g.x)
    const dy = en.y - g.y
    if (dx < 0.8 && Math.abs(dy) < 0.9) {
      if (g.vy > 0 && dy > 0.3) {
        en.isDead = true
        en.squashed = 14
        g.vy = STOMP_BOUNCE
        g.score += 100
        popup(g, en.x, en.y - 1, '100')
      } else {
        return die(g)
      }
    }
  }
}

function onKey(g: Game, key: string) {
  const k = key.toLowerCase()
  const isTitle = g.phase === 'ready' || g.phase === 'over' || g.phase === 'won'
  if (isTitle && /^[1-9]$/.test(k) && Number(k) <= LEVELS.length) {
    Object.assign(g, newGame(Number(k) - 1), { phase: 'play' })
    return
  }
  if (k === 'r' || ((g.phase === 'over' || g.phase === 'won') && (k === 'return' || k === ' ' || k === 'space'))) {
    Object.assign(g, newGame(), { phase: 'play' })
    return
  }
  if (g.phase === 'ready') g.phase = 'play'
  if (g.phase !== 'play') return
  if (k === 'left' || k === 'a') {
    g.vx = -RUN
    g.facing = -1
    g.runTicks = RUN_TICKS
  } else if (k === 'right' || k === 'd') {
    g.vx = RUN
    g.facing = 1
    g.runTicks = RUN_TICKS
  } else if ((k === 'up' || k === 'w' || k === ' ' || k === 'space' || k === 'k') && g.isOnGround) {
    g.vy = JUMP
    g.isOnGround = false
  }
}

// for the tests: the simulation without the drawing
export { LEVELS, newGame, onKey, step, isSolid }
export type { Game }

// ---- drawing ----

function tileSprite(g: Game, t: string, x: number, y: number): string[] | null {
  const cave = g.theme === 'underground'
  switch (t) {
    case '#':
      return cave ? TILES.stone! : tileAt(g, x, y - 1) === '#' ? TILES.dirt! : TILES.grass!
    case '=':
      return cave ? TILES.blueBrick! : TILES.brick!
    case '?':
      return g.ticks % 20 < 14 ? TILES.q1! : TILES.q2!
    case 'B':
      return TILES.spent!
    case '[':
      return tileAt(g, x, y - 1) === '[' ? TILES.pipeL! : TILES.pipeTopL!
    case ']':
      return tileAt(g, x, y - 1) === ']' ? TILES.pipeR! : TILES.pipeTopR!
    case 'o':
      return COIN[Math.floor(g.ticks / 3) % COIN.length]!
    case '|':
      return TILES.pole!
    case 'f':
      return TILES.flag!
    case '*':
      return TILES.ball!
    case '(':
      return TILES.cloudL!
    case ')':
      return TILES.cloudR!
    case '<':
      return TILES.hillL!
    case '^':
      return TILES.hillM!
    case '>':
      return TILES.hillR!
    case '{':
      return TILES.treeL!
    case '-':
      return TILES.treeM!
    case '}':
      return TILES.treeR!
    case '!':
      return TILES.trunk!
    default:
      return null
  }
}

const HUD_PX = 9

function esc(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** The frame as SVG: one rect per run of a colour in a pixel row, the HUD and banners as text. */
function toSvg(buf: string[], pxW: number, pxH: number, g: Game, best: number): string {
  const pad = (n: number, w: number) => String(n).padStart(w, '0')
  const sky = THEMES[g.theme].sky
  const parts: string[] = []
  for (let y = 0; y < pxH; y++) {
    let x = 0
    while (x < pxW) {
      const c = buf[y * pxW + x]!
      let end = x + 1
      while (end < pxW && buf[y * pxW + end] === c) end++
      if (c !== sky) parts.push(`<rect x="${x}" y="${y + HUD_PX}" width="${end - x}" height="1" fill="${c}"/>`)
      x = end
    }
  }
  const t = (x: number, y: number, text: string, fill: string, anchor = 'start', size = 5) =>
    `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="700" text-anchor="${anchor}">${esc(text)}</text>`
  const hud = [
    t(2, 6.5, `DASH ${pad(g.score, 6)}`, '#fcfcfc'),
    t(pxW * 0.36, 6.5, `● ×${pad(g.coins, 2)}`, '#fca044'),
    t(pxW * 0.52, 6.5, '♥'.repeat(Math.max(0, g.lives)), '#d82800'),
    t(pxW * 0.66, 6.5, g.name, '#fcfcfc'),
    t(pxW - 2, 6.5, `BEST ${pad(best, 6)}`, '#9a9a9a', 'end'),
  ].join('')
  const lines: [string, string][] =
    g.phase === 'ready'
      ? [['PIXEL DASH', '#fca044'], [`world ${g.name} · → to start · 1 2 3 pick a world`, '#fcfcfc']]
      : g.phase === 'clear'
        ? [[`WORLD ${g.name} CLEAR!`, '#fca044'], [`score ${g.score}`, '#fcfcfc']]
      : g.phase === 'over'
        ? [['GAME OVER', '#d82800'], [`score ${g.score} · r to retry`, '#fcfcfc']]
        : g.phase === 'won'
          ? [['ALL WORLDS CLEAR!', '#fca044'], [`score ${g.score} · r to play again`, '#fcfcfc']]
          : []
  const banner = lines.length
    ? `<rect x="${pxW * 0.12}" y="${HUD_PX + 14}" width="${pxW * 0.76}" height="19" rx="2" fill="#101020" fill-opacity="0.88"/>` +
      t(pxW / 2, HUD_PX + 23, lines[0]![0], lines[0]![1], 'middle', 7) +
      t(pxW / 2, HUD_PX + 30, lines[1]![0], lines[1]![1], 'middle', 4.5)
    : ''
  const h = pxH + HUD_PX
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pxW * 8}" height="${h * 8}" viewBox="0 0 ${pxW} ${h}" shape-rendering="crispEdges" font-family="ui-monospace, Consolas, monospace">` +
    `<rect width="${pxW}" height="${HUD_PX}" fill="#0c0c0c"/><rect y="${HUD_PX}" width="${pxW}" height="${pxH}" fill="${sky}"/>` +
    parts.join('') +
    hud +
    banner +
    `</svg>`
  )
}

type Cell = { ch: string; fg: string; bg: string; bold?: boolean }
type Props = { best?: number; mode?: 'text' | 'svg' }

// the desktop pane shows this many tiles across when it draws SVG
const SVG_TILES_ACROSS = 16
type State = { game: Game; frame: number }

const PixelDash: ClientModule<JsonValue, State> = (props, surface: ClientSurface<State>) => {
  const { Box, Text } = surface.elements
  const best = Math.max(Number((props as Props | null)?.best ?? 0), 0)
  const isSvg = (props as Props | null)?.mode === 'svg'

  if (surface.state === undefined) {
    const game = newGame()
    surface.every(TICK_MS, () => {
      step(game)
      surface.setState({ game, frame: game.ticks })
    })
    surface.onKey(ev => {
      onKey(game, ev.key)
      surface.setState({ game, frame: game.ticks })
    })
    surface.onPointer(() => undefined)
    surface.setState({ game, frame: 0 })
    return <Text dimColor>loading…</Text>
  }

  const g = surface.state.game
  const pxW = isSvg ? SVG_TILES_ACROSS * TILE : Math.max(36, Math.min(surface.columns || 72, 160))
  const pxH = H * TILE
  const sky = THEMES[g.theme].sky
  const levelPx = levelWidth(g) * TILE
  const camPx = Math.max(0, Math.min(levelPx - pxW, Math.round(g.x * TILE - pxW / 3)))

  // the pixel buffer
  const buf: string[] = new Array(pxW * pxH).fill(sky)
  const blit = (spr: string[], px: number, py: number) => {
    for (let sy = 0; sy < spr.length; sy++) {
      const line = spr[sy]!
      const y = py + sy
      if (y < 0 || y >= pxH) continue
      for (let sx = 0; sx < line.length; sx++) {
        const c = line[sx]!
        if (c === '.') continue
        const x = px + sx
        if (x < 0 || x >= pxW) continue
        buf[y * pxW + x] = PAL[c] ?? sky
      }
    }
  }

  const firstTile = Math.floor(camPx / TILE)
  const lastTile = Math.ceil((camPx + pxW) / TILE)
  for (let ty = 0; ty < H; ty++) {
    for (let tx = firstTile; tx <= lastTile; tx++) {
      const t = tileAt(g, tx, ty)
      if (t === ' ') continue
      const spr = tileSprite(g, t, tx, ty)
      if (!spr) continue
      const bump = g.bumps.find(b => b.x === tx && b.y === ty)
      blit(spr, tx * TILE - camPx, ty * TILE - (bump ? Math.min(bump.ttl, 6 - bump.ttl, 2) : 0))
    }
  }
  for (const en of g.enemies) {
    if (en.isDead && en.squashed <= 0) continue
    const spr = en.isDead ? GOOMBA.flat : g.ticks % 10 < 5 ? GOOMBA.a : GOOMBA.b
    blit(spr, Math.round(en.x * TILE) - camPx, Math.round(en.y * TILE))
  }
  if (g.phase !== 'over') {
    const moving = g.vx !== 0 && g.isOnGround
    const base =
      g.phase === 'dying' ? HERO.dead : !g.isOnGround ? HERO.jump : moving && g.ticks % 6 < 3 ? HERO.walk : HERO.stand
    blit(g.facing < 0 ? flip(base) : base, Math.round(g.x * TILE) - camPx, Math.round(g.y * TILE))
  }

  // score pop-ups as 3×5 pixel digits, so the picture stays all blocks
  for (const p of g.popups) {
    let px = Math.round(p.x * TILE) - camPx
    for (const d of p.text) {
      blit(DIGITS[d] ?? [], px, Math.round(p.y * TILE))
      px += 4
    }
  }

  // A run ended: hand the hooks module the score once.
  const isEnded = g.phase === 'over' || g.phase === 'won'
  const score = isEnded && !g.isReported ? g.score : undefined
  if (isEnded) g.isReported = true
  const pad = (n: number, w: number) => String(n).padStart(w, '0')
  const shownBest = Math.max(best, isEnded ? g.score : 0)

  if (isSvg) {
    surface.post(score === undefined ? { svg: toSvg(buf, pxW, pxH, g, shownBest) } : { svg: toSvg(buf, pxW, pxH, g, shownBest), score })
    // the strip under the picture: a click here gives the game the keys
    return (
      <Box key="focus" backgroundColor="#d82800" paddingX={1} justifyContent="center">
        <Text bold color="#fcfcfc">
          ▶ CLICK HERE TO PLAY · ← → run · ↑ / space jump · r restart · Esc stop
        </Text>
      </Box>
    )
  }
  if (score !== undefined) surface.post({ score })

  // two pixels per cell, every cell a block glyph: the desktop font is not
  // monospace, and a space there is narrower than a block
  const rowsCount = pxH / 2
  const rows = []
  for (let r = 0; r < rowsCount; r++) {
    const runs: Cell[] = []
    for (let x = 0; x < pxW; x++) {
      const top = buf[2 * r * pxW + x]!
      const bottom = buf[(2 * r + 1) * pxW + x]!
      const c: Cell = top === bottom ? { ch: '█', fg: top, bg: top } : { ch: '▀', fg: top, bg: bottom }
      const last = runs[runs.length - 1]
      if (last && last.ch[0] === c.ch && last.fg === c.fg && last.bg === c.bg) last.ch += c.ch
      else runs.push(c)
    }
    rows.push(
      <Box key={`r${r}`}>
        {runs.map(run => (
          <Text color={run.fg} backgroundColor={run.bg}>
            {run.ch}
          </Text>
        ))}
      </Box>,
    )
  }

  // banners float above the picture instead of replacing its cells
  const banners: [string, string][] =
    g.phase === 'ready'
      ? [['P I X E L   D A S H', '#fca044'], [`world ${g.name} · → to start · 1 2 3 pick a world`, '#fcfcfc']]
      : g.phase === 'clear'
        ? [[`W O R L D   ${g.name}   C L E A R !`, '#fca044'], [`score ${g.score}`, '#fcfcfc']]
        : g.phase === 'over'
          ? [['G A M E   O V E R', '#d82800'], [`score ${g.score}  ·  r to retry`, '#fcfcfc']]
          : g.phase === 'won'
            ? [['A L L   W O R L D S   C L E A R !', '#fca044'], [`score ${g.score}  ·  r to play again`, '#fcfcfc']]
            : []
  const overlay =
    banners.length > 0 ? (
      <Box key="overlay" position="absolute" top={7} left={0} width={pxW} flexDirection="column" alignItems="center" gap={1}>
        {banners.map(([text, color]) => (
          <Box key={text} backgroundColor="#101020" paddingX={2}>
            <Text bold color={color}>
              {text}
            </Text>
          </Box>
        ))}
      </Box>
    ) : null

  return (
    <Box flexDirection="column">
      <Box key="hud" justifyContent="space-between" width={pxW}>
        <Text bold color="#fcfcfc">
          DASH {pad(g.score, 6)}
        </Text>
        <Text bold color="#fca044">
          ● ×{pad(g.coins, 2)}
        </Text>
        <Text bold color="#d82800">
          {'♥'.repeat(Math.max(0, g.lives))}
        </Text>
        <Text bold color="#fcfcfc">
          WORLD {g.name}
        </Text>
        <Text dimColor>BEST {pad(shownBest, 6)}</Text>
      </Box>
      <Box key="picture" position="relative" flexDirection="column" width={pxW}>
        {rows}
        {overlay}
      </Box>
      <Text key="help" dimColor>
        ← → run · ↑ / space jump · r restart · Esc gives the keys back
      </Text>
    </Box>
  )
}

export default PixelDash
