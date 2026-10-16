# Cockpit icons

Icons from the user-supplied Game-icons.net pack, licensed CC BY 3.0.
https://creativecommons.org/licenses/by/3.0/

- Structure: brick-wall by Delapouite, https://game-icons.net/1x1/delapouite/brick-wall.html
- Propulsion: rocket by Lorc, https://game-icons.net/1x1/lorc/rocket.html
- Propellants: gas-pump by Delapouite, https://game-icons.net/1x1/delapouite/gas-pump.html
- Control: steering-wheel by Delapouite, https://game-icons.net/1x1/delapouite/steering-wheel.html
- Payloads: satellite by Lorc, https://game-icons.net/1x1/lorc/satellite.html

Button symbols from the same pack:

- World: wireframe-globe by Delapouite, https://game-icons.net/1x1/delapouite/wireframe-globe.html
- Pointer: arrow-cursor by Delapouite, https://game-icons.net/1x1/delapouite/arrow-cursor.html
- Library: bookshelf by Delapouite, https://game-icons.net/1x1/delapouite/bookshelf.html
- Clear: trash-can by Delapouite, https://game-icons.net/1x1/delapouite/trash-can.html
- Engine: rocket by Lorc, https://game-icons.net/1x1/lorc/rocket.html
- Wait: hourglass by Lorc, https://game-icons.net/1x1/lorc/hourglass.html
- Settings: big-gear by DarkZaitzev, https://game-icons.net/1x1/darkzaitzev/big-gear.html
- Workshop: home-garage by Delapouite, https://game-icons.net/1x1/delapouite/home-garage.html
  (modified: the car is replaced by a rocket and the lower door slat removed)

Modifications: removed black backgrounds; button silhouettes optically centred
and rasterized independently at 12/16/20/24/28/32 logical UI pixels. Category
icons use 20x20. Tinted at runtime. Original pack SVGs and notice are retained here.

The remaining button SVGs (navigation, save, arithmetic, time controls, separation
and attitude markers) are original project artwork under the repository's MIT
license. `buttons/manifest.json` records source and license for each symbol.

Regenerate button rasters and their Rust index with
`node scripts/prepare_control_icons.cjs` (requires the existing Playwright dev
dependency and Edge, or set `PLAYWRIGHT_CHANNEL`). Regenerate categories with
`node scripts/prepare_icons.cjs`. No SVG renderer or font is required at runtime;
both native and web builds embed the same transparent atlas and draw each raster
at its native logical size with nearest filtering.
