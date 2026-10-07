// Continents and Islands (Homeland): based on base-standard/maps/continents-voronoi.js.
// Generates one Homeland landmass hosting every player (2/3 of the land) and one empty
// Distant Lands landmass (1/3 of the land).
import { VoronoiContinents, buildContinentsSettings } from '/base-standard/scripts/voronoi_maps/continents.js';
import { withHomeland, generateHomelandMap, requestHomelandMapData } from './homeland-voronoi-common.js';

class VoronoiContinentsHomeland extends withHomeland(VoronoiContinents) {
  static getName() {
    return "Continents and Islands (Homeland)";
  }
  simulateInternal() {
    this.placeHomeland(buildContinentsSettings(this.m_settings));
  }
}

console.log("Generating using script Continents-Homeland-Voronoi");
function generateMap() {
  generateHomelandMap(new VoronoiContinentsHomeland());
}
engine.on("RequestMapInitData", requestHomelandMapData);
engine.on("GenerateMap", generateMap);
console.log("Loaded Continents-Homeland-Voronoi");
