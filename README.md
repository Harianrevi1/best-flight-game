# SKYLANE — Island Run

[![make.fun competition](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![make.fun rank](https://make.fun/badge/best-flight-game-20261126-0057/Harianrevi1/best-flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![make.fun reward](https://make.fun/badge/best-flight-game-20261126-0057/Harianrevi1/best-flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A 3D flight game built for the [make.fun "Make the best flight game" bounty](https://make.fun/bounty/best-flight-game-20261126-0057). Take off from the island runway, thread the glowing rings over a procedural archipelago, watch your fuel, and bring her home.

## How to play

Open `game/index.html` in a desktop browser (or serve the `game/` folder with any static server) and press **TAKE OFF**.

- **Stage 1 — Ring Run:** fly through all 6 rings.
- **Stage 2 — Island Tour:** 8 more rings, further out.
- **Stage 3 — Final Approach:** land on the runway to finish the mission.

Rings refuel you (+15 fuel, +500 points). Landing refuels you fully. The hills and the sea do not forgive — crash and the mission ends.

## Controls

| Key | Action |
| --- | --- |
| W / S | Throttle up / down |
| A / D or ← / → | Bank (turn) |
| ↑ / ↓ | Climb / descend |
| Drag mouse | Look around (camera orbit) |
| P | Pause |
| M | Sound on/off |
| R | Restart after a crash or a completed mission |

## The world

- Procedural island terrain (seeded value noise): green hills, sandy beaches, open sea, a small town, drifting clouds.
- A lit runway with centre-line dashes and threshold bars.
- Chase camera, artificial horizon, speed / altitude / heading instruments, fuel gauge, score and stage readouts.
- Synthesised WebAudio sounds (engine drone, wind, ring chime, crash, landing) — no audio files, no network requests.

## Tech

- Three.js (vendored under `game/vendor/`) — the only library; everything else is hand-written vanilla JavaScript.
- `main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` into the output directory and writes `dossier.json` with make.fun's own `vendor/makefun-game.ts` library.

## Screenshots

1. Chase view over the island, runway country ahead.
2. Threading a ring — +500 and the ring turns green.
3. Final approach to the runway.
4. Low fuel — find a ring or land, fast.

## License

MIT — see [LICENSE](LICENSE).
