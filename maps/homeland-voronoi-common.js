// Shared code for the Homeland map types: one Homeland landmass hosting every player and one
// empty Distant Lands landmass, side by side.
import { assignAdvancedStartRegions } from '/base-standard/maps/assign-advanced-start-region.js';
import { assignStartPositionsFromHexMap } from '/base-standard/maps/assign-starting-plots.js';
import { generateDiscoveries } from '/base-standard/maps/discovery-generator.js';
import { g_PolarWaterRows } from '/base-standard/maps/map-globals.js';
import { profileScope } from '/base-standard/scripts/profiling.js';
import { generateMapFeatures } from '/base-standard/scripts/common-generation.js';
import { PlayerRegion } from '/base-standard/scripts/player-areas.js';
import { RandomImpl } from '/base-standard/scripts/random-pcg-32.js';
import { RegionType } from '/base-standard/scripts/voronoi-types.js';

// Map setup options (config/config.xml), as percentages; the defaults are used when an option is missing.
// The Homeland's share of the total land.
const getHomelandShare = () => getMapPercent("HomelandShare", 0.75);
// Ocean gap between the two landmasses, as a fraction of the map width.
const getLandmassGap = () => getMapPercent("HomelandLandmassGap", 0.06);
// Grid scale of the chosen map size, in each direction (1.10: Tiny 60x38 -> 66x42).
const getMapScale = () => getMapPercent("HomelandMapScale", 1.15);

function getMapPercent(key, fallback) {
  // Configuration may not exist yet when the map grid is requested; use the default then.
  if (typeof Configuration == "undefined") return fallback;
  const value = Number(Configuration.getMapValue(key));
  return Number.isFinite(value) && value > 0 ? value / 100 : fallback;
}

// Scales the map grid before the map is created. Sizes are kept even.
function requestHomelandMapData(initParams) {
  const mapScale = getMapScale();
  const scaled = (n) => 2 * Math.round(n * mapScale / 2);
  console.log(`Homeland map grid: ${initParams.width}x${initParams.height} -> ${scaled(initParams.width)}x${scaled(initParams.height)}`);
  initParams.width = scaled(initParams.width);
  initParams.height = scaled(initParams.height);
  engine.call("SetMapInitData", initParams);
}

// Adds Homeland placement to a UnifiedContinentsBase subclass.
const withHomeland = (Base) => class extends Base {
  // Places the Homeland and the Distant Lands from Continents-style section settings,
  // keeping the same total land as settings.totalLandmassSize.
  placeHomeland(settings) {
    const totalSize = settings.totalLandmassSize;
    const homelandShare = getHomelandShare();
    const landmassGap = getLandmassGap();
    settings.landmassCount = 1;
    settings.landmassGroupCount = 1;
    settings.distantCount = 1;
    settings.totalLandmassSize = totalSize * homelandShare;
    settings.totalDistantSize = totalSize * (1 - homelandShare);
    const generatorSettings = this.getGenerator().getSettings();
    this.placeSections([this.buildSection(settings, 0, 2 * Math.PI, generatorSettings.landmass[0])]);
    // Put the two landmasses side by side (west / east), on a random side, centered vertically.
    const W = this.m_hexDims.x;
    const H = this.m_hexDims.y;
    const radiusOf = (size) => Math.sqrt(size / 100 * W * H / Math.PI) / W;
    const homeland = generatorSettings.landmass.find((landmass) => landmass.groupId > 0);
    const distant = generatorSettings.landmass.find((landmass) => landmass.groupId == 0);
    const homelandRadius = radiusOf(homeland.size);
    const distantRadius = radiusOf(distant.size);
    const left = 0.5 - (2 * homelandRadius + landmassGap + 2 * distantRadius) / 2;
    const homelandX = left + homelandRadius;
    const distantX = left + 2 * homelandRadius + landmassGap + distantRadius;
    const bHomelandWest = RandomImpl.fRand("Homeland West or East") < 0.5;
    homeland.xPos = bHomelandWest ? homelandX : 1 - homelandX;
    distant.xPos = bHomelandWest ? distantX : 1 - distantX;
    homeland.yPos = 0.5;
    distant.yPos = 0.5;
    console.log(
      `Homeland: ${homeland.size.toFixed(1)}% at x=${homeland.xPos.toFixed(2)}, Distant Lands: ${distant.size.toFixed(1)}% at x=${distant.xPos.toFixed(2)}`
    );
  }
  // Every player starts on the Homeland; the Distant Lands keep their own landmass id but no player areas.
  createMajorPlayerAreas(valueFunction) {
    const regions = this.getGenerator().getLandmasses();
    const homelandIds = regions.reduce((out, value, index) => {
      if (value.groupId > 0 && value.type == RegionType.Landmass) out.push(index);
      return out;
    }, []);
    const playerRegion = new PlayerRegion();
    playerRegion.id = homelandIds[0];
    playerRegion.filter = (tile) => homelandIds.includes(this.getRegionCellForHex(tile.coord.x, tile.coord.y)?.landmassId);
    playerRegion.playerAreas = this.getSettings().totalPlayers;
    super.createMajorPlayerAreas(valueFunction, [playerRegion]);
  }
};

// Same steps as generateMap() in base-standard/maps/continents-voronoi.js.
function generateHomelandMap(voronoiMap) {
  console.log(`Age - ${GameInfo.Ages.lookup(Game.age).AgeType}`);
  const voronoiScope = new profileScope("Homeland Voronoi Generation");
  const iWidth = GameplayMap.getGridWidth();
  const iHeight = GameplayMap.getGridHeight();
  const mapInfo = GameInfo.Maps.lookup(GameplayMap.getMapSize());
  if (mapInfo == null) return;
  const iTotalPlayers = Players.getAliveMajorIds().length;
  const seaLevelType = Configuration.getMapValue("SeaLevel");
  console.log(`Sea Level - ${seaLevelType}`);
  switch (seaLevelType) {
    case "SEA_LEVEL_LOW":
      voronoiMap.setSelectedVariantKey("Sea Level", "Low");
      break;
    case "SEA_LEVEL_HIGH":
      voronoiMap.setSelectedVariantKey("Sea Level", "High");
      break;
  }
  voronoiMap.init({ x: iWidth, y: iHeight });
  voronoiMap.setPrimaryMapSetting(["totalPlayers"], iTotalPlayers);
  voronoiMap.simulate();
  generateMapFeatures(voronoiMap.getHexTiles());
  const fertilityGetter = (tile) => StartPositioner.getPlotFertilityForCoord(tile.coord.x, tile.coord.y);
  voronoiMap.createMajorPlayerAreas(fertilityGetter);
  const startPositions = assignStartPositionsFromHexMap(voronoiMap.getHexTiles());
  generateDiscoveries(iWidth, iHeight, startPositions, g_PolarWaterRows);
  FertilityBuilder.recalculate();
  assignAdvancedStartRegions();
  voronoiScope.end();
}

export { withHomeland, generateHomelandMap, requestHomelandMapData, getHomelandShare };
