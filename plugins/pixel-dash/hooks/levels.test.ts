import { expect, test } from 'claude-code/testing'

import { isSolid, LEVELS, newGame, onKey, step } from './game'
import type { Game } from './game'

/** A bot that holds right and jumps at ledges, walls and goombas ahead. */
function play(level: number, withEnemies: boolean) {
  const g: Game = newGame(level)
  if (!withEnemies) g.enemies = []
  onKey(g, 'right')
  let deaths = 0
  for (let t = 0; t < 8000; t++) {
    onKey(g, 'right')
    if (g.isOnGround) {
      const front = g.x + 1.05
      const isLedge = !isSolid(g, front, g.y + 1.1) && !isSolid(g, front + 0.6, g.y + 1.1)
      const isWall = isSolid(g, front + 0.3, g.y + 0.5)
      const isEnemy = g.enemies.some(en => !en.isDead && en.x > g.x && en.x - g.x < 2.6 && Math.abs(en.y - g.y) < 1)
      if (isLedge || isWall || isEnemy) onKey(g, 'up')
    }
    const before = g.phase
    step(g)
    if (before === 'play' && g.phase === 'dying') deaths += 1
    if (g.phase === 'over') return { done: false, deaths, x: g.x }
    if (g.phase === 'clear' || g.phase === 'won') return { done: g.x + 0.6 >= g.flagX && g.level === level, deaths, x: g.x }
  }
  return { done: false, deaths, x: g.x }
}

test('every world can be finished: no gap too wide, no wall too high, no ceiling over a pit', () => {
  for (let level = 0; level < LEVELS.length; level++) {
    const run = play(level, false)
    expect({ level: level + 1, ...run, deaths: run.deaths }).toEqual({ level: level + 1, done: true, deaths: 0, x: run.x })
  }
})

test('every world can be finished with the goombas in it', () => {
  for (let level = 0; level < LEVELS.length; level++) {
    const run = play(level, true)
    expect({ level: level + 1, done: run.done }).toEqual({ level: level + 1, done: true })
  }
})

test('the flag of a world leads into the next one, and the last ends the game', () => {
  const g = newGame(0)
  g.phase = 'play'
  g.x = g.flagX - 0.5
  step(g)
  expect(g.phase).toBe('clear')
  for (let i = 0; i < 60; i++) step(g)
  expect(g.level).toBe(1)
  expect(g.name).toBe('1-2')
  expect(g.phase).toBe('play')

  const last = newGame(LEVELS.length - 1)
  last.phase = 'play'
  last.x = last.flagX - 0.5
  step(last)
  expect(last.phase).toBe('won')
})
