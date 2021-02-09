import { promises as fs } from "fs";
import { Signal } from "jaz-signals";
import { delay } from "jaz-ts-utils";
import { ungzip } from "node-gzip";
import * as path from "path";

import { BufferStream } from "./buffer-stream";
import { DemoModel } from "./demo-model";
import { LuaHandler } from "./lua-parser";
import { PacketParser } from "./packet-parser";
import { ScriptParser } from "./script-parser";
import { isPlayer } from "./utils";

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
        DemoModel.Packet.ID.NEWFRAME,
        DemoModel.Packet.ID.KEYFRAME,
        DemoModel.Packet.ID.SYNCRESPONSE
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
        const rawScript = this.bufferStream.read(this.header.scriptSize);
        this.script = new ScriptParser(this.config).parseScript(rawScript);
        await this.parsePackets(this.bufferStream.read(this.header.demoStreamSize));
        this.statistics = this.parseStatistics(this.bufferStream.read());

        const endTime = process.hrtime(startTime);
        const endTimeMs = (endTime[0]* 1000000000 + endTime[1]) / 1000000;
        if (this.config.verbose) {
            console.log(`Demo ${fileName} processed in ${endTimeMs.toFixed(2)}ms`);
        }

        return {
            header: this.header,
            rawScript: rawScript.toString(),
            script: this.script,
            statistics: this.statistics
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

    protected async parsePackets(buffer: Buffer) {
        const bufferStream = new BufferStream(buffer);
        const packetParser = new PacketParser({ ...this.config });
        const startPositions: { [teamId: number]: DemoModel.Command.Type.MapPos } = {};
        const factions: { [playerId: number]: string } = {};

        let counter = 0;

        while (bufferStream.readStream.readableLength > 0) {
            const modGameTime = bufferStream.readFloat();
            const length = bufferStream.readInt(4, true);
            const packetData = bufferStream.read(length);

            const packet = packetParser.parsePacket(packetData, modGameTime, this.header.wallclockTime - this.header.gameTime);

            if (packet && packet.data) {
                if (packet.data.playerNum !== undefined && this.config.includePlayerIds?.length && !this.config.includePlayerIds?.includes(packet.data.playerNum)) {
                    continue;
                }

                if (packetParser.isPacket(packet, DemoModel.Packet.ID.STARTPOS) && packet.data.readyState === DemoModel.ReadyState.READY) {
                    startPositions[packet.data.myTeam] = { x: packet.data.x, y: packet.data.y, z: packet.data.z };
                }

                if (packetParser.isPacket(packet, DemoModel.Packet.ID.LUAMSG) && packet.data?.data?.name === "FACTION_PICKER") {
                    factions[packet.data.playerNum] = packet.data.data.data;
                }

                this.onPacket.dispatch(packet);
            }

            counter++;
            if (counter % 10000 === 0) {
                // https://stackoverflow.com/questions/66110154/nodejs-readable-stream-causing-memory-leak
                // const memory = process.memoryUsage();
                // const used = memory.heapUsed / 1048576;
                // const total = memory.heapTotal / 1048576;
                // console.log(`Used: ${used}MB, Total: ${total}MB`);
                await delay(5);
            }
        }

        for (const allyTeam of this.script.allyTeams) {
            for (const team of allyTeam.teams) {
                for (const player of team.players) {
                    if (startPositions[player.teamId]) {
                        player.startPos = startPositions[player.teamId];
                    }
                    if (isPlayer(player) && factions[player.id]) {
                        team.side = factions[player.id];
                    }
                }
            }
        }
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