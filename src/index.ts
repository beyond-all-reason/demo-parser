import { DemoModel } from "./model";
import { BufferStream } from "./buffer-stream";
import { CommandParser } from "./command-parser";

// https://github.com/spring/spring/blob/develop/rts/System/LoadSave/demofile.h

export { DemoModel };

export interface DemoParserConfig {
    verbose?: boolean;
}

export class DemoParser {
    protected config: DemoParserConfig;
    protected bufferStream!: BufferStream;
    protected header!: DemoModel.Header;
    protected script!: DemoModel.Script;
    protected demoStream!: DemoModel.Command.Command[];

    constructor(config: DemoParserConfig = { verbose: false }){
        this.config = config;
    }

    public parseDemo(demoBuffer: Buffer) : DemoModel.Demo {
        this.bufferStream = new BufferStream(demoBuffer, false);
        
        this.header = this.parseHeader();
        this.script = this.parseScript(this.bufferStream.read(this.header.scriptSize));
        this.demoStream = this.parseDemoStream(this.bufferStream.read(this.header.demoStreamSize));

        return {
            header: this.header,
            script: this.script,
            demoStream: this.demoStream
        };
    }

    protected parseHeader() : DemoModel.Header {
        return {
            magic               : this.bufferStream.readString(16),
            version             : this.bufferStream.readInt(),
            headerSize          : this.bufferStream.readInt(),
            versionString       : this.bufferStream.readString(256),
            gameId              : this.bufferStream.read(16).toString("hex"),
            startTime           : new Date(this.bufferStream.readInt(8, true) * 1000),
            scriptSize          : this.bufferStream.readInt(),
            demoStreamSize      : this.bufferStream.readInt(),
            gameTime            : this.bufferStream.readInt(),
            wallclockTime       : this.bufferStream.readInt(),
            numPlayers          : this.bufferStream.readInt(),
            playerStatSize      : this.bufferStream.readInt(),
            playerStatElemSize  : this.bufferStream.readInt(),
            numTeams            : this.bufferStream.readInt(),
            teamStatSize        : this.bufferStream.readInt(),
            teamStatElemSize    : this.bufferStream.readInt(),
            teamStatPeriod      : this.bufferStream.readInt(),
            winningAllyTeamsSize: this.bufferStream.readInt(),
        }
    }

    protected parseScript(buffer: Buffer) : DemoModel.Script {
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

        const scriptObj: DemoModel.Script = {
            gameSettings: this.parseGameSettings(gameSettings),
            modSettings: obj.modoptions,
            mapSettings: obj.mapoptions,
            restrictions: obj.restrict,
            allyTeams,
            spectators
        }

        return scriptObj as DemoModel.Script;
    }

    protected parseGameSettings(str: string) : DemoModel.ScriptGameSettings {
        const pairs = str.split(";").filter(Boolean).map(pair => pair.split("="));

        const obj: Partial<DemoModel.ScriptGameSettings> = {};
        for (const [key, val] of pairs) {
            obj[key] = val;
        }

        return obj as DemoModel.ScriptGameSettings;
    }

    protected parsePlayers(script: { [key: string]: { [key: string] : string } }) : { allyTeams: DemoModel.ScriptAllyTeam[], spectators: DemoModel.ScriptPlayer[] } {
        const allyTeams: DemoModel.ScriptAllyTeam[] = [];
        const teams: DemoModel.ScriptTeam[] = [];
        const players: DemoModel.ScriptPlayer[] = [];
        const spectators: DemoModel.ScriptPlayer[] = [];

        for (const key in script) {
            const obj = script[key];
            if (key.includes("ally")) {
                const allyTeamId = parseInt(key.split("allyteam")[1]);
                allyTeams[allyTeamId] = {
                    id: allyTeamId,
                    numallies: parseInt(obj.numallies),
                    startrectbottom: parseFloat(obj.startrectbottom),
                    startrectleft: parseFloat(obj.startrectleft),
                    startrecttop: parseFloat(obj.startrecttop),
                    startrectright: parseFloat(obj.startrectright),
                    teams: []
                };
            } else if (key.includes("team")) {
                const teamId = parseInt(key.split("team")[1]);
                teams[teamId] = {
                    id: teamId,
                    teamleader: parseInt(obj.teamleader),
                    rgbcolor: obj.rgbcolor.split(" ").map(str => parseFloat(str)),
                    allyteam: parseInt(obj.allyteam),
                    handicap: parseInt(obj.handicap),
                    side: obj.side,
                    players: []
                };
            } else if (key.includes("player")) {
                const playerId = parseInt(key.split("player")[1]);
                const isSpec = obj.spectator === "1";
                const player: DemoModel.ScriptPlayer = {
                    id: playerId,
                    skillclass: parseInt(obj.skillclass),
                    accountid: parseInt(obj.accountid),
                    name: obj.name,
                    countrycode: obj.countrycode,
                    skilluncertainty: parseInt(obj.skilluncertainty),
                    rank: parseInt(obj.rank),
                    skill: obj.skill,
                };
                if (!isSpec){
                    player.team = parseInt(obj.team)
                    players[player.team] = player;
                } else {
                    spectators.push(player);
                }
            }
        }
        
        for (const player of players) {
            teams[player.team!].players.push(player);
        }

        for (const team of teams) {
            allyTeams[team.allyteam].teams.push(team);
        }

        return { allyTeams, spectators };
    }

    protected parseDemoStream(buffer: Buffer) : DemoModel.Command.Command[] {
        const bufferStream = new BufferStream(buffer, false);
        const commandParser = new CommandParser();
        const commands: DemoModel.Command.Command[] = [];

        for (let i=0; i<10; i++){
            const modGameTime = bufferStream.readFloat();
            const length = bufferStream.readInt(4, true);
            const packet = bufferStream.read(length);

            const command: DemoModel.Command.Command = commandParser.parseCommand(packet, modGameTime);
            commands.push(command);
        }

        return commands;
    }
}