import { offsets } from "./offsets.js";

let _n = null;

export function initFunctions(base) {
    if (_n) return _n;

    _n = {
        BattleMode_getInstance:
                new NativeFunction(base.add(offsets.BattleMode_getInstance), 'pointer', []),
            LogicGameObjectClient_getX:
                new NativeFunction(base.add(offsets.LogicGameObjectClient_getX), 'int32', ['pointer']),
            LogicGameObjectClient_getY:
                new NativeFunction(base.add(offsets.LogicGameObjectClient_getY), 'int32', ['pointer']),
            LogicBattleModeClient_getOwnCharacter:
                new NativeFunction(base.add(offsets.LogicBattleModeClient_getOwnCharacter), 'pointer', ['pointer']),
            LogicBattleModeClient_setClientPredictionMoveTo:
                new NativeFunction(base.add(offsets.LogicBattleModeClient_setClientPredictionMoveTo), 'void', ['pointer','int','int','int']),
            Gui_getInstance:
                new NativeFunction(base.add(offsets.Gui_getInstance), 'pointer', []),
            ClientInput_constructor_int:
                new NativeFunction(base.add(offsets.ClientInput_constructor_int), 'pointer', ['pointer','int']),
            ClientInputManager_addInput:
                new NativeFunction(base.add(offsets.ClientInputManager_addInput), 'void', ['pointer','pointer']),
            LogicGameObjectClient_getGlobalID:
                new NativeFunction(base.add(offsets.LogicGameObjectClient_getGlobalID), 'uint32', ['pointer']),
            LogicBattleModeClient_getOwnPlayerTeam:
                new NativeFunction(base.add(offsets.LogicBattleModeClient_getOwnPlayerTeam), 'uint32', ['pointer']),
            LogicGameObjectClient_getData:
                new NativeFunction(base.add(offsets.LogicGameObjectClient_getData), 'pointer', ['pointer']),
            LogicProjectileData_getSpeed:
                new NativeFunction(base.add(offsets.LogicProjectileData_getSpeed), 'uint32', ['pointer']),
            LogicProjectileData_getRadius:
                new NativeFunction(base.add(offsets.LogicProjectileData_getRadius), 'uint32', ['pointer']),
            LogicCharacterData_getCollisionRadius:
                new NativeFunction(base.add(offsets.LogicCharacterData_getCollisionRadius), 'uint32', ['pointer']),
            BattleScreen_getLogicBattleModeClient:
                new NativeFunction(base.add(offsets.GameScreen__getLogicBattle), 'pointer', ['pointer']),
            LogicBattleModeClient_getTileMap:
                new NativeFunction(base.add(offsets.LogicBattleModeClient__getTileMap), 'pointer', ['pointer']),
            LogicCharacterClient_getWeaponSkill:
                new NativeFunction(base.add(offsets.LogicCharacterClient__getWeaponSkill), 'pointer', ['pointer']),
            getProjData:
                new NativeFunction(base.add(offsets.getProjData), 'pointer', ['pointer']),
            StringCtor:
                new NativeFunction(base.add(offsets.StringCtor), 'pointer', ['pointer', 'pointer']),
            TextField_setText:
                new NativeFunction(base.add(offsets.TextField_setText), 'pointer', ['pointer', 'pointer']),
            TextField_setText_ui:
                new NativeFunction(base.add(offsets.TextField_setText_ui), 'pointer', ['pointer', 'pointer', 'bool']),
    };

    Object.freeze(_n);
    return _n;
}

export function getFunctions() {
    if (!_n) throw new Error("Functions not initialized! Call initFunctions(base) first.");
    return _n;
}
