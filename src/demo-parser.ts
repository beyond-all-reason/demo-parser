import {createReadStream} from "node:fs";
import {createGunzip} from "node:zlib";

import { promises as fs } from "fs";
import { ungzip } from "node-gzip";
import * as path from "path";

import { BufferStream } from "./buffer-stream";
import { LuaHandler } from "./lua-parser";
import { DemoModel } from "./model/demo-model";
import { PacketParser } from "./packet-parser";
import { ScriptParser } from "./script-parser";
import { Signal } from "./signal";
import { isPacket } from "./utils";

export interface DemoParserConfig {
    verbose?: boolean;
    /** If not empty, only save packets with these packetIds */
    includePackets?: DemoModel.Packet.ID[];
    /** Array of all packet IDs to ignore */
    excludePackets?: DemoModel.Packet.ID[];
    /** If not empty, only save packets and commands from these playerIds */
    includePlayerIds?: number[];
    /**
     * Include standard Lua data parsers
     * @default true
     * */
    includeStandardLuaHandlers?: boolean;
    /** Array of lua data handlers */
    customLuaHandlers?: LuaHandler[];
    /** String array of Lua handlers to exclude from the packet stream, where each string is the handler's name attribute */
    excludeLuaHandlers?: string[];
    /** Lookup object to replace UnitDefIds with actual unit names */
    unitDefIds?: string[];
    /**
     * If true, only parses the header info.
     *
     * **WARNING:** This may cause certain data in the info object to be incorrect or missing, such as faction or startPos
     * @default false
     * */
    skipPackets?: boolean;
}

const defaultConfig: Partial<DemoParserConfig> = {
    verbose: false,
    includePackets: [],
    excludePackets: [
        DemoModel.Packet.ID.NEWFRAME,
        DemoModel.Packet.ID.KEYFRAME,
        DemoModel.Packet.ID.SYNCRESPONSE,
        DemoModel.Packet.ID.PLAYERINFO
    ],
    includePlayerIds: [],
    includeStandardLuaHandlers: true,
    customLuaHandlers: [],
    excludeLuaHandlers: [
        "MOUSE_POS_BROADCAST",
        "FPS_BROADCAST",
        "CAMERA_LOCKCAMERA",
        "ACTIVITY_BROADCAST",
        "GAME_END",
        "IDLE_PLAYERS",
        "ALLY_SELECTED_UNITS",
        "XMAS"
    ],
    unitDefIds: []
};

// https://github.com/spring/spring/blob/develop/rts/System/LoadSave/demofile.h
// https://github.com/dansan/spring-replay-site/blob/631101d27c99ac84a2051f5547b035513aab3062/srs/parse_demo_file.py

export class DemoParser {
    protected config: DemoParserConfig;
    protected bufferStream!: BufferStream;
    protected info!: DemoModel.Info.Info;
    protected header!: DemoModel.Header;
    protected statistics!: DemoModel.Statistics.Statistics;
    protected chatlog: DemoModel.ChatMessage[] = [];

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

        this.header = DemoParser.parseHeader(this.bufferStream);

        const script = this.bufferStream.read(this.header.scriptSize);

        let gameDuration: number = this.header.wallclockTime;
        let winningAllyTeamIds: number[] = [];
        this.onPacket.add((packet) => {
            if (isPacket(packet, DemoModel.Packet.ID.GAMEOVER)) {
                gameDuration = packet.actualGameTime;
                winningAllyTeamIds = packet.data.winningAllyTeams;
            }
        });

        if (this.config.skipPackets) {
            this.bufferStream.read(this.header.demoStreamSize);
            this.statistics = this.parseStatistics(this.bufferStream.read());

            this.info = this.generateInfo({ script, gameDuration, winningAllyTeamIds: this.statistics.winningAllyTeamIds });

            return {
                info: this.info,
                header: this.header,
                script: script.toString(),
                statistics: this.statistics,
            };
        }

        const { startPositions, factions, colors } = await this.parsePackets(this.bufferStream.read(this.header.demoStreamSize));

        this.statistics = this.parseStatistics(this.bufferStream.read());

        this.info = this.generateInfo({ script, gameDuration, winningAllyTeamIds, startPositions, factions, colors });

        const endTime = process.hrtime(startTime);
        const endTimeMs = (endTime[0]* 1000000000 + endTime[1]) / 1000000;
        if (this.config.verbose) {
            console.log(`Demo ${fileName} processed in ${endTimeMs.toFixed(2)}ms`);
        }

        if (this.chatlog) {
            const playerNames = new Map<number, string>();
            for (const player of this.info.players) {
                playerNames.set(player.playerId, player.name);
            }
            for (const player of this.info.spectators) {
                playerNames.set(player.playerId, player.name);
            }

            for (const message of this.chatlog) {
                const name = playerNames.get(message.playerId);
                if (name) {
                    message.name = name;
                }
            }
        }

        return {
            info: this.info,
            header: this.header,
            script: script.toString(),
            statistics: this.statistics,
            chatlog: this.chatlog
        };
    }

    public static getHeaders(demoFilePath: string): Promise<DemoModel.HeadersOnly> {
        return new Promise((resolve, reject) => {
            const HEADER_SIZE = 352;
            const chunks: Buffer[] = [];
            let totalLength = 0;
            let header: DemoModel.Header | null = null;
            let requiredBytes = HEADER_SIZE;
            let resolved = false;

            const fileStream = createReadStream(demoFilePath);
            const gunzip = createGunzip();

            const cleanup = () => {
                gunzip.removeAllListeners();
                fileStream.removeAllListeners();
                gunzip.destroy();
                fileStream.destroy();
            };

            gunzip.on("data", (chunk: Buffer) => {
                if (resolved) {
                    return;
                }

                chunks.push(chunk);
                totalLength += chunk.length;

                if (!header && totalLength >= HEADER_SIZE) {
                    const buffer = Buffer.concat(chunks);
                    header = DemoParser.parseHeader(new BufferStream(buffer));
                    requiredBytes = HEADER_SIZE + header.scriptSize;
                }

                if (header && totalLength >= requiredBytes) {
                    resolved = true;
                    cleanup();

                    const buffer = Buffer.concat(chunks);
                    const script = buffer.subarray(HEADER_SIZE, HEADER_SIZE + header.scriptSize);
                    const scriptParser = new ScriptParser({});
                    const scriptInfo = scriptParser.parseScript(script);

                    const meta: Omit<DemoModel.Info.Meta, "winningAllyTeamIds"> = {
                        gameId: header.gameId,
                        engine: header.versionString,
                        game: scriptInfo.hostSettings.gametype,
                        map: scriptInfo.hostSettings.mapname,
                        startTime: header.startTime,
                        durationMs: header.wallclockTime * 1000,
                        fullDurationMs: header.wallclockTime * 1000,
                        startPosType: parseInt(scriptInfo.hostSettings.startpostype)
                    };

                    resolve({
                        info: { meta, ...scriptInfo },
                        header,
                        script: script.toString(),
                    });
                }
            });

            gunzip.on("error", (err) => {
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    reject(err);
                }
            });

            gunzip.on("end", () => {
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    reject(new Error("Unexpected end of gzip stream before reading complete header and script"));
                }
            });

            fileStream.on("error", (err) => {
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    reject(err);
                }
            });

            fileStream.pipe(gunzip);
        });
    }

    protected static parseHeader(bufferStream: BufferStream) : DemoModel.Header {
        return {
            magic: bufferStream.readString(16),
            version: bufferStream.readInt(),
            headerSize: bufferStream.readInt(),
            versionString: bufferStream.readString(256, true),
            gameId: bufferStream.read(16).toString("hex"),
            startTime: new Date(Number(bufferStream.readBigInt()) * 1000),
            scriptSize: bufferStream.readInt(),
            demoStreamSize: bufferStream.readInt(),
            gameTime: bufferStream.readInt(),
            wallclockTime: bufferStream.readInt(),
            numPlayers: bufferStream.readInt(),
            playerStatSize: bufferStream.readInt(),
            playerStatElemSize: bufferStream.readInt(),
            numTeams: bufferStream.readInt(),
            teamStatSize: bufferStream.readInt(),
            teamStatElemSize: bufferStream.readInt(),
            teamStatPeriod: bufferStream.readInt(),
            winningAllyTeamsSize: bufferStream.readInt(),
        };
    }

    protected async parsePackets(buffer: Buffer) {
        const bufferStream = new BufferStream(buffer);
        const packetParser = new PacketParser(this.config);
        const startPositions: { [teamId: number]: DemoModel.Command.Type.MapPos } = {};
        const factions: { [playerId: number]: string } = {};
        let colors: Array<{ teamID: number, r: number, g: number, b: number }> = [];

        while (bufferStream.readStream.readableLength > 0) {
            const modGameTime = bufferStream.readFloat();
            const length = bufferStream.readInt(4, true);
            const packetData = bufferStream.read(length);

            const packet = packetParser.parsePacket(packetData, modGameTime, this.header.wallclockTime - this.header.gameTime);

            if (packet && packet.data) {
                if (packet.data.playerNum !== undefined && this.config.includePlayerIds?.length && !this.config.includePlayerIds?.includes(packet.data.playerNum)) {
                    continue;
                }

                if (isPacket(packet, DemoModel.Packet.ID.STARTPOS)) {
                    startPositions[packet.data.teamId] = { x: packet.data.x, y: packet.data.y, z: packet.data.z };
                }

                if (isPacket(packet, DemoModel.Packet.ID.LUAMSG) && packet.data?.data?.name === "FACTION_PICKER") {
                    factions[packet.data.playerNum] = packet.data.data.data;
                }

                if (isPacket(packet, DemoModel.Packet.ID.LUAMSG) && packet.data?.data?.name === "COLORS") {
                    colors = packet.data.data.data;
                }

                if (isPacket(packet, DemoModel.Packet.ID.CHAT)) {
                    const chatMessage = this.parseChatPacket(packet);
                    if (chatMessage.type !== "self") {
                        this.chatlog.push(chatMessage);
                    }
                }

                if (isPacket(packet, DemoModel.Packet.ID.LUAMSG) && packet.data?.data?.name === "UNITDEFS") {
                    this.config.unitDefIds = packet.data.data.data;
                }

                this.onPacket.dispatch(packet);
            }
        }

        return { startPositions, factions, colors };
    }

    protected parseStatistics(buffer: Buffer) : DemoModel.Statistics.Statistics {
        const bufferStream = new BufferStream(buffer);

        let winningAllyTeamIds: number[] = [];
        if (bufferStream.readStream.readableLength) {
            winningAllyTeamIds = this.header.winningAllyTeamsSize === 0 ? [] : bufferStream.readInts(this.header.winningAllyTeamsSize, 1, true);
        }

        const playerStats = this.parsePlayerStatistics(bufferStream.read(this.header.playerStatSize));
        const teamStats = this.parseTeamStatistics(bufferStream.read(this.header.teamStatSize)); // this will be empty for spring-dedicated demos

        return { winningAllyTeamIds, playerStats, teamStats };
    }

    // https://github.com/springfiles/SpringStatsViewer/blob/master/SpringDemoFile.py#L1540
    // this data seems wrong for spring-dedicated demos
    protected parsePlayerStatistics(buffer: Buffer) {
        const bufferStream = new BufferStream(buffer);
        const players: DemoModel.Statistics.Player[] = [];
        for (let i=0; i<this.header.numPlayers; i++) {
            players.push({
                playerId: i,
                numCommands: bufferStream.readInt(),
                unitCommands: bufferStream.readInt(),
                mousePixels: bufferStream.readInt(),
                mouseClicks: bufferStream.readInt(),
                keyPresses: bufferStream.readInt(),
            });
        }
        return players;
    }

    // https://github.com/springfiles/SpringStatsViewer/blob/master/SpringDemoFile.py#L1603
    protected parseTeamStatistics(buffer: Buffer) {
        const bufferStream = new BufferStream(buffer);
        const teamStats: Record<number, DemoModel.Statistics.Team[]> = {};

        const numOfStatsForTeams: number[] = [];
        for (let i=0; i<this.header.numTeams; i++) {
            numOfStatsForTeams.push(bufferStream.readInt());
            teamStats[i] = [];
        }

        let teamId = 0;
        for (const numOfStats of numOfStatsForTeams) {
            for (let i=0; i<numOfStats; i++) {
                teamStats[teamId].push({
                    frame: bufferStream.readInt(),
                    metalUsed: bufferStream.readFloat(),
                    energyUsed: bufferStream.readFloat(),
                    metalProduced: bufferStream.readFloat(),
                    energyProduced: bufferStream.readFloat(),
                    metalExcess: bufferStream.readFloat(),
                    energyExcess: bufferStream.readFloat(),
                    metalReceived: bufferStream.readFloat(),
                    energyReceived: bufferStream.readFloat(),
                    metalSent: bufferStream.readFloat(),
                    energySent: bufferStream.readFloat(),
                    damageDealt: bufferStream.readFloat(),
                    damageReceived: bufferStream.readFloat(),
                    unitsProduced: bufferStream.readInt(),
                    unitsDied: bufferStream.readInt(),
                    unitsReceived: bufferStream.readInt(),
                    unitsSent: bufferStream.readInt(),
                    unitsCaptured: bufferStream.readInt(),
                    unitsOutCaptured: bufferStream.readInt(),
                    unitsKilled: bufferStream.readInt(),
                });
            }
            teamId++;
        }

        return teamStats;
    }

    protected parseChatPacket(packet: DemoModel.Packet.Packet<DemoModel.Packet.ID.CHAT>) : DemoModel.ChatMessage {
        const data = packet.data!;
        const chatType = data.toId === 252 ? "ally" : data.toId === 253 ? "spec" : data.toId === 254 ? "global" : "self";
        return {
            timeMs: Math.round(packet.actualGameTime * 1000),
            playerId: data.fromId,
            name: "",
            type: chatType,
            message: data.message.trim()
        };
    }

    protected generateInfo(setupInfo: DemoModel.Info.SetupInfo) : DemoModel.Info.Info {
        const scriptInfo = new ScriptParser(this.config).parseScript(setupInfo.script);

        const meta: DemoModel.Info.Meta = {
            gameId: this.header.gameId,
            engine: this.header.versionString,
            game: scriptInfo.hostSettings.gametype,
            map: scriptInfo.hostSettings.mapname,
            startTime: this.header.startTime,
            durationMs: Math.round(setupInfo.gameDuration * 1000),
            fullDurationMs: this.header.wallclockTime * 1000,
            winningAllyTeamIds: setupInfo.winningAllyTeamIds,
            startPosType: parseInt(scriptInfo.hostSettings.startpostype)
        };

        for (const player of scriptInfo.players) {
            if (setupInfo.startPositions) {
                if (setupInfo.startPositions[player.teamId]) {
                    player.startPos = setupInfo.startPositions[player.teamId];
                }
            }
            if (setupInfo.factions) {
                if (setupInfo.factions[player.playerId]) {
                    player.faction = setupInfo.factions[player.playerId];
                }
            }
        }

        if (setupInfo.colors) {
            for (const color of setupInfo.colors) {
                for (const player of scriptInfo.players) {
                    const { teamID, ...colors } = color;
                    if (player.teamId === color.teamID) {
                        player.rgbColor = colors;
                    }
                }
            }
        }

        // AI start positions seem completely wrong so ignoring for now
        // for (const ai of scriptInfo.ais) {
        //     if (setupInfo.startPositions[ai.teamId]) {
        //         ai.startPos = setupInfo.startPositions[ai.teamId];
        //     }
        // }

        return { meta, ... scriptInfo };
    }
}