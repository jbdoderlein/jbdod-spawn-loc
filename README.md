# Novus Orbis

*The Old World and the New* — a map mod for Sid Meier's Civilization VII.

Every player starts on one large continent, the **Homeland**. A second, smaller continent, the **Distant Lands**, is left empty: deep ocean keeps it out of reach in the Antiquity Age, and it waits to be discovered and settled in the Exploration Age — like the European voyages of the 1500s.

Made for multiplayer games between friends, where everyone wants to start on the same continent.

## Map types

Pick one in **Game Setup → Map Type**.

| Map | Description |
|---|---|
| **Novus Orbis** | Natural-looking continents and islands, built on the game's *Continents and Islands* generator. Every player starts on the Homeland. |
| **Novus Orbis – Mare Nostrum** | Same layout with richer terrain, in the spirit of *Pangaea*: deeply indented coasts, more islands near the shore, and a Mediterranean-like inland sea on each continent. Terrain by Adrien. |
| **Novus Orbis (Legacy)** | Built on the game's older *Continents (Legacy)* generator. Start spots come from the map size, so with more players than the map size's Homeland slots, the extra players start on the Distant Lands. |

## Map options

Under **Map Options**, when a Novus Orbis map is selected:

| Option | Choices | Default | What it does |
|---|---|---|---|
| **Homeland Share** | 60–80% | 73% | How much of the land goes to the Homeland. The Distant Lands get the rest. |
| **Ocean Between Continents** | 4–10% | 6% | Width of the ocean between the two continents, as a share of the map width. Not available on the Legacy map. |
| **Map Scale** | 75–130% | 110% | Scales the map relative to the chosen size: above 100% makes room for the Distant Lands, below 100% gives a tighter map. |
| **Sea Level** | Low / Standard / High | Standard | Same as in the base game. Not available on the Legacy map. |

**Recommended setup:** choose the map size for your number of players — **Tiny for 4, Small for 6** — and keep Map Scale at 110%.

| Setup | Map at 110% |
|---|---|
| Tiny, 4 players | 66×42 tiles (base Tiny: 60×38) |
| Small, 6 players | 82×50 tiles (base Small: 74×46) |

Start Position is always *Standard* on these maps (*Balanced* needs two continents of the same width).

## Human Start Placement

This option works on **every** map type, including the base game's. It decides where human players start:

| Choice | Effect |
|---|---|
| **Same Continent** (default) | All human players start on the same continent. If needed, AI players are moved to the other continent to make room. |
| **Split Across Continents** | Human players are spread as evenly as possible across the continents. |
| **Random** | Human players are placed exactly like AI players. |
| **Game Default** | The base game's behavior: humans share the Homeland only when they all fit, otherwise they are spread randomly. |

On the Novus Orbis and Mare Nostrum maps, every player starts on the Homeland anyway.

## Multiplayer

Every player must have the mod installed and enabled. The mod affects saved games, so the game requires it to load them.

## Languages

English and French.

## Compatibility

The mod replaces two base-game files:

- `base-standard/maps/assign-starting-plots.js` — where players start, on every map type (needed for Human Start Placement).
- `core/ui-next/screens/create-game/create-game-setup-model.js` — only to show icons for the Novus Orbis maps in the map list.

Other mods that replace the same files will conflict with Novus Orbis. After a game update that changes these files, the mod's copies need to be updated too.

## Credits

- **Jbdod** — mod, Homeland layout and Human Start Placement.
- **Adrien** — *Mare Nostrum* terrain: Pangaea-style coasts, coastal islands and inland seas.
