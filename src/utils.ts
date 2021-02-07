import { DemoModel } from ".";

export function isPlayer(playerOrAI: DemoModel.Script.Player | DemoModel.Script.AI) : playerOrAI is DemoModel.Script.Player {
    return "userId" in playerOrAI;
}