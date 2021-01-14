import { DemoModel } from ".";
import { DemoParserConfig } from "./demo-parser";

export class ScriptParser {
    protected config: DemoParserConfig;

    constructor(config: DemoParserConfig) {
        this.config = config;
    }

    public parseScript(buffer: Buffer) : DemoModel.Script.Script {
        let script = buffer.toString().replace(/\n/g, "");
        const parts = script.slice(7, script.length -1).split(/\{|\}/);
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

        const { allyTeams, spectators } = this.parsePlayers(obj);

        const scriptObj: DemoModel.Script.Script = {
            hostSettings: this.parseSettings(gameSettings),
            gameSettings: obj.modoptions,
            mapSettings: obj.mapoptions,
            restrictions: obj.restrict,
            allyTeams,
            spectators
        };

        return scriptObj as DemoModel.Script.Script;
    }

    protected parseSettings(str: string) : { [key: string]: string } {
        const pairs = str.split(";").filter(Boolean).map(pair => pair.split("="));

        const obj: { [key: string]: string } = {};
        for (const [key, val] of pairs) {
            obj[key] = val;
        }

        return obj;
    }

    protected parsePlayers(script: { [key: string]: { [key: string] : string } }) : { allyTeams: DemoModel.Script.AllyTeam[], spectators: DemoModel.Script.Spectator[] } {
        const allyTeams: DemoModel.Script.AllyTeam[] = [];
        const teams: DemoModel.Script.Team[] = [];
        const players: Array<DemoModel.Script.Player | DemoModel.Script.AI> = [];
        const spectators: DemoModel.Script.Spectator[] = [];

        for (const key in script) {
            const obj = script[key];
            if (key.includes("ally")) {
                const allyTeamId = parseInt(key.split("allyteam")[1]);
                allyTeams[allyTeamId] = {
                    id: allyTeamId,
                    numallies: parseInt(obj.numallies),
                    startBox: {
                        bottom: parseFloat(obj.startrectbottom),
                        left: parseFloat(obj.startrectleft),
                        top: parseFloat(obj.startrecttop),
                        right: parseFloat(obj.startrectright),
                    },
                    teams: []
                };
            } else if (key.includes("team")) {
                const teamId = parseInt(key.split("team")[1]);
                teams[teamId] = {
                    id: teamId,
                    teamLeaderId: parseInt(obj.teamleader),
                    rgbColor: obj.rgbcolor ? obj.rgbcolor.split(" ").map(str => parseFloat(str)) : [],
                    allyTeamId: parseInt(obj.allyteam),
                    handicap: parseInt(obj.handicap),
                    side: obj.side,
                    players: []
                };
            } else if (key.includes("player")) {
                const isSpec = obj.spectator === "1";
                const playerOrSpec: Omit<DemoModel.Script.Player, "teamId"> = {
                    id: parseInt(key.split("player")[1]),
                    userId: parseInt(obj.accountid),
                    name: obj.name,
                    skillclass: parseInt(obj.skillclass),
                    countryCode: obj.countrycode,
                    skillUncertainty: parseInt(obj.skilluncertainty),
                    rank: parseInt(obj.rank),
                    skill: obj.skill
                };
                if (!isSpec) {
                    const player: DemoModel.Script.Player = {
                        ...playerOrSpec,
                        teamId: parseInt(obj.team)
                    }
                    players[player.teamId] = player;
                } else {
                    spectators.push(playerOrSpec);
                }
            } else if (key.includes("ai")) {
                const ai: DemoModel.Script.AI = {
                    id: parseInt(key.split("ai")[1]),
                    shortName: obj.shortname,
                    name: obj.name,
                    host: obj.host === "1",
                    teamId: parseInt(obj.team)
                };
                players[ai.teamId] = ai;
            }
        }

        for (const player of players) {
            if (player.teamId !== undefined) {
                teams[player.teamId].players.push(player);
            }
        }

        for (const team of teams) {
            allyTeams[team.allyTeamId].teams.push(team);
        }

        return { allyTeams, spectators };
    }
}