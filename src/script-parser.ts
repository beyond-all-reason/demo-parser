import { DemoModel } from "./demo-model";
import { DemoParserConfig } from "./demo-parser";

export class ScriptParser {
    protected config: DemoParserConfig;

    constructor(config: DemoParserConfig) {
        this.config = config;
    }

    public parseScript(buffer: Buffer) : Omit<DemoModel.Info.Info, "meta"> {
        let scriptStr = buffer.toString().replace(/\n/g, "");
        const parts = scriptStr.slice(7, scriptStr.length -1).split(/\{|\}/);
        const gameSettings = parts.pop() as string;
        const obj: { [key: string]: { [key: string] : string } } = {};

        let currentProp = "";
        for (const part of parts) {
            if (part[0] === "[") {
                currentProp = part.slice(1, part.length - 1);
                obj[currentProp] = {};
            } else if (part !== "") {
                const pairs = part.split(";").filter(Boolean).map(pair => pair.split("="));
                for (const pair of pairs) {
                    const key = pair[0];
                    const value = pair[1];
                    obj[currentProp][key] = value;
                }
            }
        }

        const { allyTeams, players, ais, spectators } = this.parsePlayers(obj);

        return {
            hostSettings: this.parseSettings(gameSettings),
            gameSettings: obj.modoptions,
            mapSettings: obj.mapoptions,
            restrictions: obj.restrict,
            allyTeams,
            players,
            ais,
            spectators
        };
    }

    protected parseSettings(str: string) : { [key: string]: string } {
        const pairs = str.split(";").filter(Boolean).map(pair => pair.split("="));

        const obj: { [key: string]: string } = {};
        for (const [key, val] of pairs) {
            obj[key] = val;
        }

        return obj;
    }

    protected parsePlayers(script: { [key: string]: { [key: string] : string } }) {
        const allyTeams: DemoModel.Info.AllyTeam[] = [];
        const teams: { [teamId: number]: DemoModel.Info.Team } = {};
        const partialPlayers: Array<Partial<DemoModel.Info.Player>> = [];
        const partialAis: Array<Partial<DemoModel.Info.AI>> = [];
        const spectators: DemoModel.Info.Spectator[] = [];

        for (const key in script) {
            const obj = script[key];
            if (key.includes("ally")) {
                const allyTeamId = parseInt(key.split("allyteam")[1]);
                allyTeams.push({
                    allyTeamId,
                    startBox: {
                        bottom: parseFloat(obj.startrectbottom),
                        left: parseFloat(obj.startrectleft),
                        top: parseFloat(obj.startrecttop),
                        right: parseFloat(obj.startrectright),
                    }
                });
            } else if (key.includes("team")) {
                const teamId = parseInt(key.split("team")[1]);
                teams[teamId] = {
                    teamId,
                    teamLeaderId: parseInt(obj.teamleader),
                    rgbColor: obj.rgbcolor ? obj.rgbcolor.split(" ").map(str => parseFloat(str)) : [],
                    allyTeamId: parseInt(obj.allyteam),
                    handicap: parseInt(obj.handicap),
                    faction: obj.side,
                };
            } else if (key.includes("player")) {
                const isSpec = obj.spectator === "1";
                const playerOrSpec: DemoModel.Info.Player | DemoModel.Info.Spectator = {
                    playerId: parseInt(key.split("player")[1]),
                    userId: parseInt(obj.accountid),
                    name: obj.name,
                    countryCode: obj.countrycode,
                    rank: parseInt(obj.rank),
                    skillclass: parseInt(obj.skillclass) || undefined,
                    skillUncertainty: parseInt(obj.skilluncertainty) || undefined,
                    skill: obj.skill
                };

                if (!isSpec) {
                    partialPlayers.push({
                        ...playerOrSpec,
                        teamId: parseInt(obj.team)
                    });
                } else {
                    spectators.push(playerOrSpec);
                }
            } else if (key.includes("ai")) {
                const partialAi: Partial<DemoModel.Info.AI> = {
                    aiId: parseInt(key.split("ai")[1]),
                    shortName: obj.shortname,
                    name: obj.name,
                    host: obj.host === "1",
                    teamId: parseInt(obj.team)
                };
                partialAis.push(partialAi);
            }
        }

        for (const player of partialPlayers) {
            const team = teams[player.teamId!];
            player.rgbColor = { r: 255 * team.rgbColor[0], g: 255 * team.rgbColor[1], b: 255 * team.rgbColor[2] };
            player.allyTeamId = team.allyTeamId;
            player.handicap = team.handicap;
            player.faction = team.faction;
        }

        for (const ai of partialAis) {
            const team = teams[ai.teamId!];
            ai.rgbColor = { r: 255 * team.rgbColor[0], g: 255 * team.rgbColor[1], b: 255 * team.rgbColor[2] };
            ai.allyTeamId = team.allyTeamId;
            ai.handicap = team.handicap;
            ai.faction = team.faction;
        }

        const players = partialPlayers as DemoModel.Info.Player[];
        const ais = partialAis as DemoModel.Info.AI[];

        return { allyTeams, players, ais, spectators };
    }
}