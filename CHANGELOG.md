# Changelog

## 0.2.0 — 2026-10-09

- Two new worlds: **1-2** underground and **1-3** treetops. Flags lead from one world to the next; `1` `2` `3` on the title screen pick one.
- 1-1 could not be finished: brick platforms hung over both pits, so a jump across hit its head and fell short. The pits now have open sky above them, and the jump is a little higher.
- Goombas turn at ledges instead of walking off.
- A test bot plays every world start to flag, with and without goombas.

## 0.1.0 — 2026-10-09

First release.

- World 1-1: coins, `?` blocks, goombas, pits, pipes, platforms, staircase and flag; three lives and a checkpoint.
- 6×6 pixel-art sprites in a NES-style palette.
- Desktop draws each frame as SVG; the terminal draws two pixels per character cell.
- `/play` opens the pane; best score kept across sessions.
