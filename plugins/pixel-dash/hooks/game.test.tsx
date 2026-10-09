import { expect, mock, test } from 'claude-code/testing'
import type { RenderPropsOf } from 'claude-code'

const PANE = { title: 'Pixel Dash' } as unknown as RenderPropsOf['Pane']

const strings = (node: unknown): string[] =>
  typeof node === 'string'
    ? [node]
    : node && typeof node === 'object' && 'children' in node
      ? ((node as { children: unknown[] }).children ?? []).flatMap(strings)
      : []

// The game draws inside its Client: read that drawing's text.
const textOf = async (ui: { drawn: (scope?: never) => Promise<unknown> }) =>
  strings(await ui.drawn({ in: 'game' } as never)).join('')

test('the game starts, runs, jumps and loses a life in the first pit', async ($, on) => {
  mock.store(on)
  for (const surface of ['terminal'] as const) {
    const ui = await $.ui.mount({ plugin: 'pixel-dash', surface, component: 'Pane', props: PANE, requestId: 'pixel-dash' })
    await ui.resize({ columns: 60, rows: 20 })
    await ui.advance(200)
    expect(await textOf(ui)).toMatch(/P I X E L/)
    expect(await textOf(ui)).toMatch(/DASH 000000/)
    expect(await textOf(ui)).toMatch(/♥♥♥/)

    // hold right (key repeat): the first three coins sit on the ground at x 6–8
    for (let i = 0; i < 26; i++) {
      await ui.key({ key: 'right', in: 'game' })
      await ui.advance(66)
    }
    const after = await textOf(ui)
    expect(after).not.toMatch(/P I X E L/)
    expect(after).toMatch(/DASH 000150/)
    expect(after).toMatch(/● ×03/)

    // run on into the first pit without jumping at it
    for (let i = 0; i < 200 && /♥♥♥/.test(await textOf(ui)); i++) {
      await ui.key({ key: 'right', in: 'game' })
      if (i % 9 === 0) await ui.key({ key: 'up', in: 'game' })
      await ui.advance(66)
    }
    await ui.advance(2000)
    expect(await textOf(ui)).toMatch(/♥♥(?!♥)|GAME OVER/)

    await ui.key({ key: 'r', in: 'game' })
    await ui.advance(66)
    expect(await textOf(ui)).toMatch(/♥♥♥/)
    await ui.unmount()
  }
})

test('on desktop the game is drawn as SVG and still plays', async ($, on) => {
  mock.store(on)
  const ui = await $.ui.mount({ plugin: 'pixel-dash', surface: 'desktop', component: 'Pane', props: PANE, requestId: 'pixel-dash' })
  await ui.advance(200)
  const svg = async () => String((await ui.find({ type: 'Svg' }))?.props.source ?? '')
  expect(await svg()).toMatch(/PIXEL DASH/)
  expect(await svg()).toMatch(/shape-rendering="crispEdges"/)

  for (let i = 0; i < 26; i++) {
    await ui.key({ key: 'right', in: 'game' })
    await ui.advance(66)
  }
  expect(await svg()).not.toMatch(/PIXEL DASH/)
  expect(await svg()).toMatch(/DASH 000150/)
  expect((await svg()).length).toBeLessThan(100_000)
  await ui.unmount()
})
