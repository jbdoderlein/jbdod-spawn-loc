// Homeland Adrien: the Homeland layout (see homeland-voronoi-common.js) with Adrien's "Mediterranean"
// terrain, in the spirit of Pangaea: indented coasts, many coastal islands and inland seas.
// Terrain settings and inland seas by Adrien (homeland-voronoi-map v2).
//
// Grafted from Pangaea onto the Continents config:
//  - more tectonic plates (plate.factor / linearStrength)            -> more varied relief and coasts
//  - "lumpy" landmass growth rules (Neighbors In Region, Near Neighbor, Cell Area, Near Region Seed,
//    Near Plate Boundary)                                              -> gulfs, peninsulas, bays
//  - Pangaea's coastal island placement and erosion rules
//  - more coastal islands than Continents (see COASTAL_ISLANDS / COASTAL_ISLANDS_SIZE).
//    Distant island settings are untouched.
// Inland seas are carved after the landmasses grow (see carveInlandSeas).
import { buildContinentsSettings } from '/base-standard/scripts/voronoi_maps/continents.js';
import { UnifiedContinentsBase } from '/base-standard/scripts/voronoi_maps/unified-continents-base.js';
import { voronoiMapSchema } from '/base-standard/scripts/voronoi_maps/map-common.js';
import continentSettings from '/base-standard/scripts/voronoi_data/continents.mapconfig.js';
import pangaeaSettings from '/base-standard/scripts/voronoi_data/pangaea.mapconfig.js';
import { RandomImpl } from '/base-standard/scripts/random-pcg-32.js';
import { withHomeland, generateHomelandMap, requestHomelandMapData } from './homeland-voronoi-common.js';

const PANGAEA_LANDMASS_RULE_PREFIXES = [
  "Cell Area.", "Near Neighbor.", "Near Region Seed.", "Neighbors In Region.", "Near Plate Boundary."
];
const INLAND_SEAS = {
  fractions: [0.08],       // one entry per sea: its size as a share of each landmass's cells
  minDepth: 4,             // a sea's center must be at least N cells from any water
  rim: 2,                  // width of land kept around the sea (cells)
  minCells: 6,             // smaller seas are not carved
  stretchX: 0.5,           // < 1 stretches the sea west-east (like the Mediterranean), 1 = round
  connectToOcean: true     // narrow strait to the ocean (otherwise a closed sea that ships cannot leave)
};
const LAND_COMPENSATION = 1.06; // slightly larger landmasses to make up for land lost to inland seas
const EROSION_PERCENT = 6; // coastal erosion of each landmass (Continents: 4, Pangaea and generator default: 8)
const COASTAL_ISLANDS = 15; // coastal island spawn locations per landmass (Continents: 10, Pangaea: 40)
const COASTAL_ISLANDS_SIZE = 1.5; // coastal island land per landmass, % of the map (Continents: 0.85, Pangaea: 5)

function buildMediterraneanSettings() {
  const merged = JSON.parse(JSON.stringify(continentSettings));
  const pg = JSON.parse(JSON.stringify(pangaeaSettings));
  Object.assign(merged.generatorConfig.plate, {
    factor: pg.generatorConfig.plate.factor,
    linearStrength: pg.generatorConfig.plate.linearStrength
  });
  const pgLand = pg.generatorConfig.landmass[0];
  for (const lm of merged.generatorConfig.landmass) {
    Object.assign(lm, {
      erosionPercent: EROSION_PERCENT,
      erosionTime: 0.5, // generator default, used by Pangaea (Continents: 1)
      erosionRandomness: pgLand.erosionRandomness,
      coastalIslands: COASTAL_ISLANDS,
      coastalIslandsMinDistance: pgLand.coastalIslandsMinDistance,
      coastalIslandsSize: COASTAL_ISLANDS_SIZE
    });
  }
  const rules = merged.rulesConfig;
  for (const [key, value] of Object.entries(pg.rulesConfig.Landmasses)) {
    if (PANGAEA_LANDMASS_RULE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      rules.Landmasses[key] = value;
    }
  }
  Object.assign(rules["Coastal Islands"], pg.rulesConfig["Coastal Islands"]);
  Object.assign(rules.Erosion, pg.rulesConfig.Erosion);
  return merged;
}

function computeWaterDistance(cells) {
  const dist = new Int32Array(cells.length).fill(-1);
  const parent = new Int32Array(cells.length).fill(-1);
  const queue = [];
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].landmassId === 0) {
      dist[i] = 0;
      queue.push(i);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head];
    for (const n of cells[id].cell.getNeighborIds()) {
      if (dist[n] === -1) {
        dist[n] = dist[id] + 1;
        parent[n] = id;
        queue.push(n);
      }
    }
  }
  return { dist, parent };
}

function carveOneSea(gen, region, fraction) {
  const cells = gen.m_regionCells;
  const regionCellCount = cells.reduce((n, c) => n + (c.landmassId === region.id ? 1 : 0), 0);
  const target = Math.round(regionCellCount * fraction);
  if (target < INLAND_SEAS.minCells) return 0;
  const { dist, parent } = computeWaterDistance(cells);
  const candidates = [];
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].landmassId === region.id && dist[i] >= INLAND_SEAS.minDepth) candidates.push(i);
  }
  if (candidates.length === 0) return 0;
  const seed = candidates[Math.floor(RandomImpl.fRand("Inland sea seed") * candidates.length)];
  const seedSite = cells[seed].cell.site;
  const score = (id) => {
    const s = cells[id].cell.site;
    const dx = (s.x - seedSite.x) * INLAND_SEAS.stretchX;
    const dy = s.y - seedSite.y;
    return dx * dx + dy * dy;
  };
  const eligible = (id) => cells[id].landmassId === region.id && dist[id] >= INLAND_SEAS.rim;
  const blob = new Set([seed]);
  const frontier = [];
  const inFrontier = new Set();
  const pushNeighbors = (id) => {
    for (const n of cells[id].cell.getNeighborIds()) {
      if (!blob.has(n) && !inFrontier.has(n) && eligible(n)) {
        frontier.push(n);
        inFrontier.add(n);
      }
    }
  };
  pushNeighbors(seed);
  while (blob.size < target && frontier.length > 0) {
    // Draw 2 candidates and keep the one closest to the center (irregular elliptical shape).
    const a = Math.floor(RandomImpl.fRand("Inland sea grow A") * frontier.length);
    const b = Math.floor(RandomImpl.fRand("Inland sea grow B") * frontier.length);
    const pick = score(frontier[a]) <= score(frontier[b]) ? a : b;
    const id = frontier[pick];
    frontier[pick] = frontier[frontier.length - 1];
    frontier.pop();
    inFrontier.delete(id);
    blob.add(id);
    pushNeighbors(id);
  }
  let carved = 0;
  for (const id of blob) {
    cells[id].landmassId = 0;
    carved++;
  }
  let strait = 0;
  if (INLAND_SEAS.connectToOcean) {
    let id = seed;
    while (id >= 0 && dist[id] > 0) {
      if (cells[id].landmassId === region.id) {
        cells[id].landmassId = 0;
        strait++;
      }
      id = parent[id];
    }
  }
  console.log("Inland sea in landmass " + region.id + ": " + carved + " cells + strait " + strait);
  return carved + strait;
}

function carveInlandSeas(gen) {
  try {
    for (const region of gen.m_landmassRegions) {
      if (region.id === 0) continue;
      for (const fraction of INLAND_SEAS.fractions) {
        carveOneSea(gen, region, fraction);
      }
    }
  } catch (e) {
    console.log("Inland seas skipped because of an error: " + e);
  }
}

class VoronoiHomelandAdrien extends withHomeland(UnifiedContinentsBase) {
  constructor() {
    super(voronoiMapSchema, buildMediterraneanSettings());
    const gen = this.getGenerator();
    const growLandmasses = gen.growLandmasses.bind(gen);
    gen.growLandmasses = () => {
      growLandmasses();
      carveInlandSeas(gen);
    };
  }
  static getName() {
    return "Homeland Adrien";
  }
  // Same initialization as the game's VoronoiContinents class.
  init(hexDims) {
    this.m_baseSchema.landmassCount.hidden = true;
    this.m_baseSchema.distantCount.hidden = true;
    this.m_baseSchema.landmassGroupCount.hidden = true;
    this.m_baseSchema.totalDistantSize.hidden = true;
    this.m_baseSchema.maxDistantSizeVariance.hidden = true;
    this.initInternal(hexDims);
  }
  getFilename() {
    return "continents.mapconfig.js";
  }
  simulateInternal() {
    const settings = buildContinentsSettings(this.m_settings);
    settings.totalLandmassSize *= LAND_COMPENSATION;
    this.placeHomeland(settings);
  }
}

console.log("Generating using script Homeland-Adrien-Voronoi");
function generateMap() {
  generateHomelandMap(new VoronoiHomelandAdrien());
}
engine.on("RequestMapInitData", requestHomelandMapData);
engine.on("GenerateMap", generateMap);
console.log("Loaded Homeland-Adrien-Voronoi");
