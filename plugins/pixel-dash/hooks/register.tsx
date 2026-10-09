import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const PANE = 'pixel-dash'

// The desktop pane draws the game as SVG: the game module posts each frame here.
const frame = atom({ plugin: 'pixel-dash', key: 'frame' } as const, null)

const LOADING =
  '<svg xmlns="http://www.w3.org/2000/svg" width="768" height="552" viewBox="0 0 96 69"><rect width="96" height="69" fill="#6b8cff"/>' +
  '<text x="48" y="37" fill="#fcfcfc" font-size="6" font-family="monospace" text-anchor="middle">loading…</text></svg>'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'play', description: 'Open Pixel Dash, a tiny platformer, in a side pane' })
    return next(e)
  })

  on('command.run', { command: 'play' }, async $ => {
    const opened = await $.ui.open({ id: PANE, title: 'Pixel Dash' })
    return { text: opened.isPlaced ? 'Pixel Dash: click the game, then ← → to run, ↑ or space to jump.' : `Pixel Dash could not open: ${opened.reason}` }
  })

  on('ui.message', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const data = e.data as { score?: unknown; svg?: unknown }
    if (typeof data.svg === 'string') await update($, frame, () => data.svg as string)
    // the best score is kept across sessions
    if (typeof data.score === 'number') {
      const best = Number((await $.store.get('best')) ?? 0)
      if (data.score > best) {
        await $.store.set('best', data.score)
        return { props: { best: data.score, mode: e.surface === 'terminal' ? 'text' : 'svg' } }
      }
    }
    return {}
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const els = $.ui.resolve(e)
    const { Box } = els
    const best = Number((await $.store.get('best')) ?? 0)
    if (!('Client' in els)) return <Box />
    const { Client } = els

    if (e.surface === 'terminal' || !('Svg' in els)) {
      return (
        <Box flexDirection="column" flexGrow={1}>
          <Client key="game" module="./game.tsx" props={{ best, mode: 'text' }} width="100%" flexGrow={1} />
        </Box>
      )
    }

    // desktop: the picture, and under it the game's own strip, which takes the click and the keys
    const { Svg } = els
    const svg = (await read($, frame)) ?? LOADING
    return (
      <Box flexDirection="column">
        <Svg key="picture" source={svg} alt="Pixel Dash" />
        <Client key="game" module="./game.tsx" props={{ best, mode: 'svg' }} width="100%" />
      </Box>
    )
  })
}
