import { Readable } from "stream";
import { endianness } from "os";
import { DemoModel } from "./model";

// https://github.com/spring/spring/blob/f97ea92993096c43f6597517a51e390f4f4d404e/rts/System/LoadSave/demofile.h

export { DemoModel };

export class DemoParser {
    protected readStream: Readable;
    protected isBigEndian: boolean;

    constructor() {
        this.readStream = new Readable();
        this.isBigEndian = endianness() === "BE";
    }

    public parseDemo(demoBuffer: Buffer) : DemoModel.Demo {
        this.readStream.destroy();
        this.readStream = new Readable();
        this.readStream.push(demoBuffer);
        this.readStream.push(null);
        
        const header = this.parseHeader();
        const script = this.parseScript(header.scriptSize);
        const game = this.parseGame(header.demoStreamSize);

        return { header, script, game };
    }

    protected parseHeader() : DemoModel.Header {
        return {
            magic: this.readString(16),
            version: this.readInt(),
            headerSize: this.readInt(),
            versionString: this.readString(256),
            gameId: this.read(16).toString("hex"),
            startTime: new Date(this.readInt(8, true) * 1000),
            scriptSize: this.readInt(),
            demoStreamSize: this.readInt(),
            gameTime: this.readInt(),
            wallclockTime: this.readInt(),
            numPlayers: this.readInt(),
            playerStatSize: this.readInt(),
            playerStatElemSize: this.readInt(),
            numTeams: this.readInt(),
            teamStatSize: this.readInt(),
            teamStatElemSize: this.readInt(),
            teamStatPeriod: this.readInt(),
            winningAllyTeamsSize: this.readInt(),
        }
    }

    protected parseScript(size: number) : DemoModel.Script {
        let script = this.read(size).toString().replace(/\n/g, "");
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

    protected parseGame(size: number) : DemoModel.GameStream {
        //this.parsePacket(1);
        return {};
    }

    protected parsePacket(size: number) {
        //const modGameTime = this.readStream.read(4);

        //console.log(modGameTime);
    }

    protected parseScriptPair() {

    }

    protected readString(size?: number, trimNulls = true) {
        const buffer = this.read(size);
        const i = buffer.indexOf(0x00);
        return buffer.toString("utf8", 0, i);
    }

    protected readInt(size = 4, unsigned = false) : number {
        if (size > 4) {
            if (unsigned) {
                const bigint = this.isBigEndian ? this.read(size).readBigUInt64BE() : this.read(size).readBigUInt64LE();
                return Number(bigint);
            } else {
                const bigint = this.isBigEndian ? this.read(size).readBigUInt64BE() : this.read(size).readBigUInt64LE();
                return Number(bigint);
            }
        }

        if (unsigned) {
            return this.isBigEndian ? this.read(size).readUIntBE(0, size) : this.read(size).readUIntLE(0, size);
        } else {
            return this.isBigEndian ? this.read(size).readIntBE(0, size) : this.read(size).readIntLE(0, size);
        }
    }

    protected readFloat() : number {
        return this.isBigEndian ? this.read(4).readFloatBE() : this.read(4).readFloatLE();
    }

    protected read(size?: number) {
        return this.readStream.read(size) as Buffer;
    }
}