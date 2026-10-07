// [spawn-loc] Copy of core/ui-next/screens/create-game/create-game-setup-model.js; the only change
// is the two Homeland entries in mapIcons (map type icons are looked up by name here).
import { createEffect, on, createContext, useContext } from '../../../vendor/solid-js/dist/solid.js';
import { createMutable, modifyMutable, reconcile } from '../../../vendor/solid-js/store/dist/store.js';
import { GameSetupParametersModel } from './game-parameters-model.js';
import { ModelRegistry, ModelLifecycle } from '../../services/model-registry.js';

const parameters = [
  "Difficulty",
  "GameSpeeds",
  "Map",
  "MapSize",
  "AgeTransitionSetting",
  "GameStartCivSelectionMode",
  "LeaderAssociatedCivSelectionMode"
];
function buildGameSetupModel() {
  const gameSetupModel = GameSetupParametersModel.get();
  const mapIcons = /* @__PURE__ */ new Map([
    ["LOC_MAP_CONTINENTS_VORONOI_NAME", "MapTypes_ContinentsAndIslands"],
    ["LOC_MAP_PANGAEA_VORONOI_NAME", "MapTypes_Pangaea_Islands"],
    ["LOC_MAP_FRACTAL_VORONOI_NAME", "MapTypes_FractalContinents"],
    ["LOC_MAP_SHATTERED_SEAS_NAME", "MapTypes_ShatteredSeas"],
    ["LOC_MAP_SHUFFLE_VORONOI_NAME", "MapTypes_Shuffle"],
    ["LOC_MAP_TERRA_INCOGNITA_VORONOI_NAME", "MapTypes_TerraIncognita"],
    ["LOC_MAP_EARTH_NAME", "MapTypes_ContinentsPlus"],
    ["LOC_MAP_CONTINENTS_NAME", "MapTypes_Continents"],
    ["Everything", "MapTypes_Everything"],
    ["Flat Lands", "MapTypes_FlatLands"],
    ["LOC_MAP_CONTINENTS_PLUS_NAME", "MapTypes_Continents"],
    ["LOC_MAP_SHUFFLE_NAME", "MapTypes_Shuffle"],
    ["LOC_MAP_ARCHIPELAGO_NAME", "MapTypes_Archipelago"],
    ["LOC_MAP_ARCHIPELAGO_VORONOI_NAME", "MapTypes_Archipelago"],
    ["LOC_MAP_FRACTAL_NAME", "MapTypes_Fractal"],
    ["LOC_MAP_TERRA_INCOGNITA_NAME", "MapTypes_TerraIncognita"],
    ["LOC_MAP_PANGAEA_PLUS_NAME", "MapTypes_PangeaPlus"],
    ["Pangea", "MapTypes_Pangea"],
    // [spawn-loc] Reuse the base icons for the Homeland map types.
    ["LOC_SPAWN_LOC_MAP_CONTINENTS_HOMELAND_VORONOI_NAME", "MapTypes_ContinentsAndIslands"],
    ["LOC_SPAWN_LOC_MAP_HOMELAND_ADRIEN_NAME", "MapTypes_Pangaea_Islands"],
    ["LOC_SPAWN_LOC_MAP_CONTINENTS_HOMELAND_NAME", "MapTypes_Continents"]
  ]);
  const model = {};
  function createValue(domainValue) {
    const value = domainValue.value;
    const name = GameSetup.resolveString(domainValue.name) ?? "";
    const icon = `url('blp:${mapIcons.get(name) ?? ""}.png')`;
    const description = GameSetup.resolveString(domainValue.description) ?? "";
    return { value, name, icon, description };
  }
  function createOption(paramName, parameter) {
    const name = GameSetup.resolveString(parameter.name) ?? "";
    const options = parameter.domain.possibleValues?.map((v) => createValue(v)) ?? [];
    const value = parameter.value.value || "";
    const activeOption = options.find((o) => o.value == value);
    const selectedOption = activeOption ? { ...activeOption } : void 0;
    const setValue = (value2) => parameter.setValue(value2);
    return { paramName, name, value, options, selectedOption, setValue };
  }
  for (const paramName of parameters) {
    const parameter = gameSetupModel[paramName];
    const option = createOption(paramName, parameter);
    const mutableOption = createMutable(option);
    model[paramName] = mutableOption;
    createEffect(
      on(
        () => [parameter, parameter?.value],
        () => {
          const optionUpdate = createOption(paramName, parameter);
          modifyMutable(mutableOption, reconcile(optionUpdate));
        }
      )
    );
  }
  return model;
}
const GameSetupModel = ModelRegistry.register(
  "GameSetupModel",
  ModelLifecycle.SharedInstance,
  buildGameSetupModel
);
const GameSetupModelContext = createContext();
function useGameSetupModelContext() {
  const context = useContext(GameSetupModelContext);
  if (!context) {
    throw new Error("useGameSetupModelContext: Cannot find context!");
  }
  return context;
}

export { GameSetupModel, GameSetupModelContext, buildGameSetupModel, useGameSetupModelContext };
//# sourceMappingURL=create-game-setup-model.js.map
