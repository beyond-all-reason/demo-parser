import { promises as fs } from "fs";
import { delay, Signal } from "jaz-ts-utils";
import { ungzip } from "node-gzip";
import * as path from "path";

import { BufferStream } from "./buffer-stream";
import { DemoModel } from "./demo-model";
import { LuaHandler } from "./lua-parser";
import { PacketParser } from "./packet-parser";
import { ScriptParser } from "./script-parser";
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
    protected playerNames: Map<number, string> = new Map();
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

        this.header = this.parseHeader();

        const script = this.bufferStream.read(this.header.scriptSize);

        let gameDuration: number = this.header.wallclockTime;
        let winningAllyTeamIds: number[] = [];
        this.onPacket.add((packet) => {
            if (isPacket(packet, DemoModel.Packet.ID.GAMEOVER)) {
                gameDuration = packet.actualGameTime;
                winningAllyTeamIds = packet.data.winningAllyTeams;
            }
        });

        const { startPositions, factions } = await this.parsePackets(this.bufferStream.read(this.header.demoStreamSize));

        this.statistics = this.parseStatistics(this.bufferStream.read());

        this.info = this.generateInfo({ script, gameDuration, winningAllyTeamIds, startPositions, factions });

        const endTime = process.hrtime(startTime);
        const endTimeMs = (endTime[0]* 1000000000 + endTime[1]) / 1000000;
        if (this.config.verbose) {
            console.log(`Demo ${fileName} processed in ${endTimeMs.toFixed(2)}ms`);
        }

        return {
            info: this.info,
            header: this.header,
            script: script.toString(),
            statistics: this.statistics,
            chatlog: this.chatlog
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
        const packetParser = new PacketParser(this.config);
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

                if (isPacket(packet, DemoModel.Packet.ID.STARTPOS)) {
                    startPositions[packet.data.teamId] = { x: packet.data.x, y: packet.data.y, z: packet.data.z };
                }

                if (isPacket(packet, DemoModel.Packet.ID.LUAMSG) && packet.data?.data?.name === "FACTION_PICKER") {
                    factions[packet.data.playerNum] = packet.data.data.data;
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

            counter++;
            if (counter % 10000 === 0) {
                await delay(5); // allow garbage collection - https://stackoverflow.com/questions/66110154/nodejs-readable-stream-causing-memory-leak
            }
        }

        return { startPositions, factions };
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

    protected parseChatPacket(packet: DemoModel.Packet.Packet<DemoModel.Packet.ID.CHAT>) : DemoModel.ChatMessage {
        const data = packet.data!;
        const chatType = data.toId === 252 ? "ally" : data.toId === 253 ? "spec" : data.toId === 254 ? "global" : "self";

        return {
            time: packet.actualGameTime,
            playerId: data.fromId,
            name: this.playerNames.get(data.fromId)!,
            type: chatType,
            message: data.message.trim()
        };
    }

    protected generateInfo(setupInfo: DemoModel.Info.SetupInfo) : DemoModel.Info.Info {
        const meta: DemoModel.Info.Meta = {
            gameId: this.header.gameId,
            engine: this.header.versionString,
            startTime: this.header.startTime,
            durationMs: Math.round(setupInfo.gameDuration * 1000),
            fullDurationMs: this.header.wallclockTime * 1000,
            winningAllyTeamIds: setupInfo.winningAllyTeamIds,
        };

        const scriptInfo = new ScriptParser(this.config).parseScript(setupInfo.script);

        for (const player of scriptInfo.players) {
            if (setupInfo.startPositions[player.teamId]) {
                player.startPos = setupInfo.startPositions[player.teamId];
            }
            if (setupInfo.factions[player.playerId]) {
                player.faction = setupInfo.factions[player.playerId];
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