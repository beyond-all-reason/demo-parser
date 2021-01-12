import { promises as fs } from "fs";
import { Signal } from "jaz-signals";
import { ungzip } from "node-gzip";
import * as path from "path";

import { BufferStream } from "./buffer-stream";
import { DemoModel } from "./demo-model";
import { LuaHandler } from "./lua-parser";
import { PacketParser } from "./packet-parser";

export interface DemoParserConfig {
    verbose?: boolean;
    /** If not empty, only save packets with these packetIds */
    includePackets?: DemoModel.Packet.ID[];
    /** Array of all packet IDs to ignore */
    excludePackets?: DemoModel.Packet.ID[];
    /** If not empty, only save commands with these commandIds */
    includeCommands?: DemoModel.Command.ID[];
    /** Array of all command IDs to ignore */
    excludeCommands?: DemoModel.Command.ID[];
    /** If not empty, only save packets and commands from these playerIds */
    includePlayerIds?: number[];
    /**
     * If false, will still include LUAMSG packets even if their data cannot be parsed
     * @default true
     * */
    excludeUnparsedLuaData?: boolean;
    /**
     * Include standard Lua data parsers
     * @default true
     * */
    includeStandardLuaHandlers?: boolean;
    /** Array of lua data handlers */
    customLuaHandlers?: LuaHandler[];
    /** Lookup object to replace UnitDefIds with actual unit names */
    unitDefIds?: { [key: string]: string };
}

const defaultConfig: Partial<DemoParserConfig> = {
    verbose: false,
    includePackets: [],
    excludePackets: [
        DemoModel.Packet.ID.NEWFRAME
    ],
    includeCommands: [],
    excludeCommands: [],
    includePlayerIds: [],
    excludeUnparsedLuaData: true,
    includeStandardLuaHandlers: true,
    customLuaHandlers: [],
    unitDefIds: {}
};

// https://github.com/spring/spring/blob/develop/rts/System/LoadSave/demofile.h
// https://github.com/dansan/spring-replay-site/blob/631101d27c99ac84a2051f5547b035513aab3062/srs/parse_demo_file.py

export class DemoParser {
    protected config: DemoParserConfig;
    protected bufferStream!: BufferStream;
    protected header!: DemoModel.Header;
    protected script!: DemoModel.Script.Script;
    protected packets!: DemoModel.Packet.AbstractPacket[];
    protected statistics!: DemoModel.Statistics.Statistics;

    public onPacket: Signal<DemoModel.Packet.AbstractPacket> = new Signal();

    constructor(config?: DemoParserConfig) {
        this.config = Object.assign({}, defaultConfig, config);
    }

    public async parseDemo(demoFilePath: string) : Promise<DemoModel.Demo> {
        const startTime = process.hrtime();

        const fileName = path.parse(demoFilePath).name;

        if (this.config.verbose) {
            console.log(`Processing demo: ${fileName}...`);
        }

        const sdfz = await fs.readFile(demoFilePath);

        const sdf = await ungzip(sdfz);

        this.bufferStream = new BufferStream(sdf);

        this.header = this.parseHeader();
        this.script = this.parseScript(this.bufferStream.read(this.header.scriptSize));
        this.packets = this.parsePackets(this.bufferStream.read(this.header.demoStreamSize));
        this.statistics = this.parseStatistics(this.bufferStream.read());

        const endTime = process.hrtime(startTime);
        const endTimeMs = (endTime[0]* 1000000000 + endTime[1]) / 1000000;
        if (this.config.verbose) {
            console.log(`Demo ${fileName} processed in ${endTimeMs.toFixed(2)}ms`);
        }

        return {
            header: this.header,
            script: this.script,
            statistics: this.statistics,
            demoStream: this.packets,
        };
    }

    protected parseHeader() : DemoModel.Header {
        return {
            magic: this.bufferStream.readString(16),
            version: this.bufferStream.readInt(),
            headerSize: this.bufferStream.readInt(),
            versionString: this.bufferStream.readString(256, true),
            gameId: this.bufferStream.read(16).toString("hex"),
            startTime: new Date(Number(this.bufferStream.readBigInt()) * 1000),
            scriptSize: this.bufferStream.readInt(),
            demoStreamSize: this.bufferStream.readInt(),
            gameTime: this.bufferStream.readInt(),
            wallclockTime: this.bufferStream.readInt(),
            numPlayers: this.bufferStream.readInt(),
            playerStatSize: this.bufferStream.readInt(),
            playerStatElemSize: this.bufferStream.readInt(),
            numTeams: this.bufferStream.readInt(),
            teamStatSize: this.bufferStream.readInt(),
            teamStatElemSize: this.bufferStream.readInt(),
            teamStatPeriod: this.bufferStream.readInt(),
            winningAllyTeamsSize: this.bufferStream.readInt(),
        };
    }

    public parseScript(buffer: Buffer) : DemoModel.Script.Script {
        console.log(buffer.toString());

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

    protected parsePlayers(script: { [key: string]: { [key: string] : string } }) : { allyTeams: DemoModel.Script.AllyTeam[], spectators: DemoModel.Script.Player[] } {
        const allyTeams: DemoModel.Script.AllyTeam[] = [];
        const teams: DemoModel.Script.Team[] = [];
        const players: Array<DemoModel.Script.Player | DemoModel.Script.AI> = [];
        const spectators: DemoModel.Script.Player[] = [];

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
                    rgbcolor: obj.rgbcolor ? obj.rgbcolor.split(" ").map(str => parseFloat(str)) : [],
                    allyteam: parseInt(obj.allyteam),
                    handicap: parseInt(obj.handicap),
                    side: obj.side,
                    players: []
                };
            } else if (key.includes("player")) {
                const isSpec = obj.spectator === "1";
                const player: DemoModel.Script.Player = {
                    id: parseInt(key.split("player")[1]),
                    skillclass: parseInt(obj.skillclass),
                    accountid: parseInt(obj.accountid),
                    name: obj.name,
                    countrycode: obj.countrycode,
                    skilluncertainty: parseInt(obj.skilluncertainty),
                    rank: parseInt(obj.rank),
                    skill: obj.skill,
                };
                if (!isSpec) {
                    player.teamId = parseInt(obj.team);
                    players[player.teamId] = player;
                } else {
                    spectators.push(player);
                }
            } else if (key.includes("ai")) {
                const ai: DemoModel.Script.AI = {
                    id: parseInt(key.split("ai")[1]),
                    shortname: obj.shortname,
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
            allyTeams[team.allyteam].teams.push(team);
        }

        return { allyTeams, spectators };
    }

    protected parsePackets(buffer: Buffer) : DemoModel.Packet.AbstractPacket[] {
        const bufferStream = new BufferStream(buffer);
        const packetParser = new PacketParser({ ...this.config });
        const packets: DemoModel.Packet.AbstractPacket[] = [];

        while (bufferStream.readStream.readableLength > 0) {
            const modGameTime = bufferStream.readFloat();
            const length = bufferStream.readInt(4, true);
            const packetData = bufferStream.read(length);

            const packet = packetParser.parsePacket(packetData, modGameTime, this.header.wallclockTime - this.header.gameTime);

            if (packet && packet.data) {
                if (packet.data.playerNum !== undefined && this.config.includePlayerIds?.length && !this.config.includePlayerIds?.includes(packet.data.playerNum)) {
                    continue;
                }
                packets.push(packet);
                this.onPacket.dispatch(packet);
            }
        }

        return packets;
    }

    // TODO
    protected parseStatistics(buffer: Buffer) : DemoModel.Statistics.Statistics {
        const bufferStream = new BufferStream(buffer);

        // not using these because can't figure out how to parse them correctly, using values from demo stream instead
        const shitPlayerStats = this.parsePlayerStatistics(bufferStream.read(this.header.playerStatSize));
        const shitTeamStats = this.parseTeamStatistics(bufferStream.read(this.header.teamStatSize));

        let winningAllyTeamIds: number[] = [];
        if (bufferStream.readStream.readableLength) {
            winningAllyTeamIds = this.header.winningAllyTeamsSize === 0 ? [] : bufferStream.readInts(this.header.winningAllyTeamsSize, 1, true);
        }

        return {
            winningAllyTeamIds, playerStats: shitPlayerStats, teamStats: shitTeamStats
        };
    }

    protected parsePlayerStatistics(buffer: Buffer) {
        const bufferStream = new BufferStream(buffer);
        const players: DemoModel.Statistics.Player[] = [];
        for (let i=0; i<this.header.numPlayers; i++) {
            players.push({
                playerId: i, // pretty sure this is all wrong, but dunno why
                numCommands: bufferStream.readInt(),
                unitCommands: bufferStream.readInt(),
                mousePixels: bufferStream.readInt(),
                mouseClicks: bufferStream.readInt(),
                keyPresses: bufferStream.readInt(),
            });
        }
        return players;
    }

    protected parseTeamStatistics(buffer: Buffer) {
        return [] as DemoModel.Statistics.Team[];
    }
}