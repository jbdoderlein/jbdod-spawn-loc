// Novus Orbis (Legacy): based on base-standard/maps/continents.js.
// The Homeland gets the "Homeland share" map option of the land width, the Distant Lands the rest.
import { assignAdvancedStartRegions } from '/base-standard/maps/assign-advanced-start-region.js';
import { assignStartPositions } from '/base-standard/maps/assign-starting-plots.js';
import { generateDiscoveries } from '/base-standard/maps/discovery-generator.js';
import { expandCoasts, addMountains, generateLakes, addHills, buildRainfallMap } from '/base-standard/maps/elevation-terrain-generator.js';
import { designateBiomes, addFeatures } from '/base-standard/maps/feature-biome-generator.js';
import { dumpContinents, dumpTerrain, dumpElevation, dumpRainfall, dumpBiomes, dumpFeatures, dumpResources } from '/base-standard/maps/map-debug-helpers.js';
import { g_OceanWaterColumns, g_PolarWaterRows, g_WaterPercent, g_NavigableRiverTerrain, g_LandmassFractal, g_FlatTerrain, g_OceanTerrain, g_FractalWeight, g_CenterWeight, g_CenterExponent, g_StartSectorWeight, g_IgnoreStartSectorPctFromCtr, g_Cutoff } from '/base-standard/maps/map-globals.js';
import { applyCoastalErosion, markLandmassRegionId, getDistanceFromContinentCenter, getMaxDistanceFromContinentCenter } from '/base-standard/maps/map-utilities.js';
import { addNaturalWonders } from '/base-standard/maps/natural-wonder-generator.js';
import { generateResources } from '/base-standard/maps/resource-generator.js';
import { generateSnow, dumpPermanentSnow } from '/base-standard/maps/snow-generator.js';
import { addVolcanoes, addTundraVolcanoes } from '/base-standard/maps/volcano-generator.js';
import { requestHomelandMapData, getHomelandShare } from './homeland-voronoi-common.js';

console.log("Generating using script Continents-Homeland");
function generateMap() {
  console.log(`Age - ${GameInfo.Ages.lookup(Game.age).AgeType}`);
  const iWidth = GameplayMap.getGridWidth();
  const iHeight = GameplayMap.getGridHeight();
  const uiMapSize = GameplayMap.getMapSize();
  const mapInfo = GameInfo.Maps.lookup(uiMapSize);
  if (mapInfo == null) return;
  const iNumNaturalWonders = mapInfo.NumNaturalWonders;
  const iTilesPerLake = mapInfo.LakeGenerationFrequency;
  const iNumHomeland = Math.max(mapInfo.PlayersLandmass1, mapInfo.PlayersLandmass2);
  const iNumDistant = Math.min(mapInfo.PlayersLandmass1, mapInfo.PlayersLandmass2);
  const bHomelandWest = TerrainBuilder.getRandomNumber(2, "Homeland West or East") == 0;
  console.log(`Homeland: ${iNumHomeland} players, ${bHomelandWest ? "west" : "east"}. Distant Lands: ${iNumDistant} players.`);
  // One ocean band around the map seam and one between the continents.
  const iLandColumns = iWidth - 2 * g_OceanWaterColumns;
  const iHomelandColumns = Math.round(iLandColumns * getHomelandShare());
  const iWestColumns = bHomelandWest ? iHomelandColumns : iLandColumns - iHomelandColumns;
  const westContinent = {
    west: g_OceanWaterColumns / 2,
    east: g_OceanWaterColumns / 2 + iWestColumns,
    south: g_PolarWaterRows,
    north: iHeight - g_PolarWaterRows,
    continent: 0
  };
  const eastContinent = {
    west: westContinent.east + g_OceanWaterColumns,
    east: iWidth - g_OceanWaterColumns / 2,
    south: g_PolarWaterRows,
    north: iHeight - g_PolarWaterRows,
    continent: 0
  };
  const iNumPlayersWest = bHomelandWest ? iNumHomeland : iNumDistant;
  const iNumPlayersEast = bHomelandWest ? iNumDistant : iNumHomeland;
  createLandmasses(iWidth, iHeight, westContinent, eastContinent);
  applyCoastalErosion(westContinent, 0.02, 1.5, 0.8, false);
  applyCoastalErosion(eastContinent, 0.02, 1.5, 0.8, false);
  markLandmassRegionId(eastContinent, LandmassRegion.LANDMASS_REGION_EAST);
  markLandmassRegionId(westContinent, LandmassRegion.LANDMASS_REGION_WEST);
  TerrainBuilder.validateAndFixTerrain();
  expandCoasts(iWidth, iHeight);
  AreaBuilder.recalculateAreas();
  TerrainBuilder.stampContinents();
  addMountains(iWidth, iHeight);
  addVolcanoes(iWidth, iHeight);
  generateLakes(iWidth, iHeight, iTilesPerLake);
  AreaBuilder.recalculateAreas();
  TerrainBuilder.buildElevation();
  addHills(iWidth, iHeight);
  buildRainfallMap(iWidth, iHeight);
  TerrainBuilder.modelRivers(5, 15, g_NavigableRiverTerrain);
  TerrainBuilder.validateAndFixTerrain();
  designateBiomes(iWidth, iHeight);
  addTundraVolcanoes(iWidth, iHeight);
  addNaturalWonders(iWidth, iHeight, iNumNaturalWonders);
  TerrainBuilder.addFloodplains(4, 10);
  addFeatures(iWidth, iHeight);
  TerrainBuilder.validateAndFixTerrain();
  AreaBuilder.recalculateAreas();
  TerrainBuilder.storeWaterData();
  generateSnow(iWidth, iHeight);
  dumpContinents(iWidth, iHeight);
  dumpTerrain(iWidth, iHeight);
  dumpElevation(iWidth, iHeight);
  dumpRainfall(iWidth, iHeight);
  dumpBiomes(iWidth, iHeight);
  dumpFeatures(iWidth, iHeight);
  dumpPermanentSnow(iWidth, iHeight);
  generateResources(iWidth, iHeight);
  // No start sectors: start regions are divided by fertility inside each continent's bounds.
  const startPositions = assignStartPositions(iNumPlayersWest, iNumPlayersEast, westContinent, eastContinent, 0, 0, []);
  generateDiscoveries(iWidth, iHeight, startPositions, g_PolarWaterRows);
  dumpResources(iWidth, iHeight);
  FertilityBuilder.recalculate();
  assignAdvancedStartRegions();
}
engine.on("RequestMapInitData", requestHomelandMapData);
engine.on("GenerateMap", generateMap);
console.log("Loaded Continents-Homeland");

// Same as createLandmasses() in continents.js, without start sectors.
function createLandmasses(iWidth, iHeight, continent1, continent2) {
  FractalBuilder.create(g_LandmassFractal, iWidth, iHeight, 2, 0);
  const iWaterHeight = FractalBuilder.getHeightFromPercent(g_LandmassFractal, g_WaterPercent);
  const iBuffer = Math.floor(iHeight / 18);
  const iBuffer2 = Math.floor(iWidth / 28);
  for (let iY = 0; iY < iHeight; iY++) {
    for (let iX = 0; iX < iWidth; iX++) {
      let terrain = g_FlatTerrain;
      const iRandom = TerrainBuilder.getRandomNumber(iBuffer, "Random Top/Bottom Edges");
      const iRandom2 = TerrainBuilder.getRandomNumber(iBuffer2, "Random Left/Right Edges");
      if (iY < continent1.south + iRandom || iY >= continent1.north - iRandom) {
        terrain = g_OceanTerrain;
      } else if (iX < continent1.west + iRandom2 || iX >= continent2.east - iRandom2 || iX >= continent1.east - iRandom2 && iX < continent2.west + iRandom2) {
        terrain = g_OceanTerrain;
      } else {
        const iPlotHeight = getPlotHeight(iX, iY, iWaterHeight, continent1, continent2);
        if (iPlotHeight < iWaterHeight * g_Cutoff) {
          terrain = g_OceanTerrain;
        }
      }
      TerrainBuilder.setTerrainType(iX, iY, terrain);
    }
  }
}
// Like getHeightAdjustingForStartSector() in map-utilities.js, but every continent interior gets
// the start sector boost (the base sector maths assumes continents of equal width).
function getPlotHeight(iX, iY, iWaterHeight, continent1, continent2) {
  let iPlotHeight = FractalBuilder.getHeight(g_LandmassFractal, iX, iY) * g_FractalWeight;
  const iDistanceFromCenter = getDistanceFromContinentCenter(iX, iY, continent1.south, continent1.north, continent1.west, continent1.east, continent2.west, continent2.east);
  const iMaxDistanceFromCenter = getMaxDistanceFromContinentCenter(iX, continent1.south, continent1.north, continent1.west, continent1.east, continent2.west, continent2.east);
  const iPercentFromCenter = Math.min(100 * iDistanceFromCenter / iMaxDistanceFromCenter, 100);
  iPlotHeight += g_CenterWeight * Math.pow(iWaterHeight * (100 - iPercentFromCenter) / 100, g_CenterExponent);
  if (iPercentFromCenter < g_IgnoreStartSectorPctFromCtr * 2 / 3) {
    iPlotHeight += g_StartSectorWeight * iWaterHeight;
  }
  return iPlotHeight;
}
