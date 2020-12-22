// https://github.com/spring/spring/blob/develop/rts/Net/Protocol/NetMessageTypes.h
// https://github.com/spring/spring/blob/develop/rts/Net/Protocol/BaseNetProtocol.cpp
// https://github.com/spring/spring/blob/develop/rts/Sim/Units/CommandAI/Command.h
// https://github.com/dansan/spring-replay-site/blob/master/srs/demoparser.py

import * as zlib from "zlib";
import { DemoParser, DemoParserConfig } from "./index";
import { BufferStream } from "./buffer-stream";
import { DemoModel } from "./model";
import { CommandParser } from "./command-parser";
import { LuaParser } from "./lua-parser";

type PacketData<C extends DemoModel.Packet.BasePacket = DemoModel.Packet.BasePacket> = Omit<C, "packetType" | "gameTime">;
type PacketHandler = (bufferStream: BufferStream) => PacketData;

export class PacketParser {
    protected config: DemoParserConfig;
    protected commandParser: CommandParser;
    protected luaParser: LuaParser;
    protected packetHandlers: { [key in DemoModel.Packet.ID]?: PacketHandler };

    constructor(config: DemoParserConfig) {
        this.config = config;

        this.commandParser = new CommandParser(this.config);
        this.luaParser = new LuaParser(this.config);

        this.packetHandlers = {
            [DemoModel.Packet.ID.KEYFRAME]: this.keyFrame,                        // 1
            [DemoModel.Packet.ID.NEWFRAME]: this.newFrame,                        // 2
            [DemoModel.Packet.ID.QUIT]: this.quit,                                // 3
            [DemoModel.Packet.ID.STARTPLAYING]: this.startPlaying,                // 4
            [DemoModel.Packet.ID.SETPLAYERNUM]: this.setPlayerNum,                // 5
            [DemoModel.Packet.ID.PLAYERNAME]: this.playerName,                    // 6
            [DemoModel.Packet.ID.CHAT]: this.chat,                                // 7
            [DemoModel.Packet.ID.RANDSEED]: this.randSeed,                        // 8
            [DemoModel.Packet.ID.GAMEID]: this.gameId,                            // 9
            [DemoModel.Packet.ID.PATH_CHECKSUM]: this.pathChecksum,               // 10
            [DemoModel.Packet.ID.COMMAND]: this.command,                          // 11
            [DemoModel.Packet.ID.SELECT]: this.select,                            // 12
            [DemoModel.Packet.ID.PAUSE]: this.pause,                              // 13
            [DemoModel.Packet.ID.AICOMMAND]: this.aiCommand,                      // 14
            [DemoModel.Packet.ID.AICOMMANDS]: this.aiCommands,                    // 15
            [DemoModel.Packet.ID.AISHARE]: this.aiShare,                          // 16
            // [DemoModel.Command.ID.USER_SPEED]: this.userSpeed,                     // 19
            [DemoModel.Packet.ID.INTERNAL_SPEED]: this.internalSpeed,             // 20
            // [DemoModel.Command.ID.CPU_USAGE]: this.cpuUsage,                       // 21
            // [DemoModel.Command.ID.DIRECT_CONTROL]: this.directControl,             // 22
            // [DemoModel.Command.ID.DC_UPDATE]: this.dcUpdate,                       // 23
            [DemoModel.Packet.ID.SHARE]: this.share,                              // 26
            [DemoModel.Packet.ID.SETSHARE]: this.setShare,                        // 27
            [DemoModel.Packet.ID.PLAYERSTAT]: this.playerStat,                    // 29
            [DemoModel.Packet.ID.GAMEOVER]: this.gameOver,                        // 30
            [DemoModel.Packet.ID.MAPDRAW]: this.mapDraw,                          // 31
            [DemoModel.Packet.ID.SYNCRESPONSE]: this.syncResponse,                // 33
            [DemoModel.Packet.ID.SYSTEMMSG]: this.systemMsg,                      // 35
            [DemoModel.Packet.ID.STARTPOS]: this.startPos,                        // 36
            [DemoModel.Packet.ID.PLAYERINFO]: this.playerInfo,                    // 38
            [DemoModel.Packet.ID.PLAYERLEFT]: this.playerLeft,                    // 39
            // [DemoModel.Command.ID.SD_CHKREQUEST]: this.sdChkRequest,               // 41
            // [DemoModel.Command.ID.SD_CHKRESPONSE]: this.sdChkResponse,             // 42
            // [DemoModel.Command.ID.SD_BLKREQUEST]: this.sdBlkRequest,               // 43
            // [DemoModel.Command.ID.SD_BLKRESPONSE]: this.sdBlkresponse,             // 44
            // [DemoModel.Command.ID.SD_RESET]: this.sdReset,                         // 45
            [DemoModel.Packet.ID.LOGMSG]: this.logMsg,                            // 49
            [DemoModel.Packet.ID.LUAMSG]: this.luaMsg,                            // 50
            [DemoModel.Packet.ID.TEAM]: this.team,                                // 51
            [DemoModel.Packet.ID.GAMEDATA]: this.gameData,                        // 52
            // [DemoModel.Command.ID.ALLIANCE]: this.alliance,                        // 53
            [DemoModel.Packet.ID.CCOMMAND]: this.cCommand,                        // 54
            // [DemoModel.Command.ID.TEAMSTAT]: this.teamStat,                        // 60
            [DemoModel.Packet.ID.CLIENTDATA]: this.clientData,                    // 61
            // [DemoModel.Command.ID.ATTEMPTCONNECT]: this.attemptConnect,            // 65
            // [DemoModel.Command.ID.REJECT_CONNECT]: this.rejectConnect,             // 66
            // [DemoModel.Command.ID.AI_CREATED]: this.aiCreated,                     // 70
            [DemoModel.Packet.ID.AI_STATE_CHANGED]: this.aiStateChanged,          // 71
            // [DemoModel.Command.ID.REQUEST_TEAMSTAT]: this.requestTeamStat,         // 72
            [DemoModel.Packet.ID.CREATE_NEWPLAYER]: this.createNewPlayer,         // 75
            // [DemoModel.Command.ID.AICOMMAND_TRACKED]: this.aiCommandTracked,       // 76
            [DemoModel.Packet.ID.GAME_FRAME_PROGRESS]: this.gameFrameProgress,    // 77
            // [DemoModel.Command.ID.PING]: this.ping,                                // 78
        };
    }

    public parsePacket(buffer: Buffer, modGameTime: number) : DemoModel.Packet.BasePacket | undefined {
        const bufferStream = new BufferStream(buffer, false);

        const packetId = bufferStream.readInt(1) as DemoModel.Packet.ID;
        if ((this.config.includePackets!.length > 0 && !this.config.includePackets!.includes(packetId)) || this.config.excludePackets!.includes(packetId)){
            return;
        }
        const packetHandler = this.packetHandlers[packetId];
        if (!packetHandler && this.config.verbose) {
            console.log(`No packet handler found for packet id: ${packetId} (${DemoModel.Packet.ID[packetId]})`);
        }
        const packetData = packetHandler ? packetHandler.call(this, bufferStream) : {};
        const packet: DemoModel.Packet.BasePacket = {
            packetType: [packetId, DemoModel.Packet.ID[packetId]],
            gameTime: modGameTime,
            ...packetData
        };

        return packet;
    }

    protected keyFrame(bufferStream: BufferStream) : PacketData<DemoModel.Packet.KEYFRAME> {
        const frameNum = bufferStream.readInt();
        return { frameNum };
    }

    protected newFrame(bufferStream: BufferStream) : PacketData<DemoModel.Packet.NEWFRAME> {
        return {};
    }

    protected quit(bufferStream: BufferStream) : PacketData<DemoModel.Packet.QUIT> {
        const size = bufferStream.readInt(2);
        const reason = bufferStream.readString(size);
        return { reason };
    }

    protected startPlaying(bufferStream: BufferStream) : PacketData<DemoModel.Packet.STARTPLAYING> {
        const countdown = bufferStream.readInt();
        return { countdown };
    }

    protected setPlayerNum(bufferStream: BufferStream) : PacketData<DemoModel.Packet.SETPLAYERNUM> {
        const playerNum = bufferStream.readInt(1, true);
        return { playerNum };
    }

    protected playerName(bufferStream: BufferStream) : PacketData<DemoModel.Packet.PLAYERNAME> {
        const size = bufferStream.readInt(1);
        const playerNum = bufferStream.readInt(1);
        const playerName = bufferStream.read(size).toString();
        return { playerNum, playerName };
    }

    protected chat(bufferStream: BufferStream) : PacketData<DemoModel.Packet.CHAT> {
        const size = bufferStream.readInt(1, true);
        const fromId = bufferStream.readInt(1, true);
        const toId = bufferStream.readInt(1, true); // 127 = allies, 126 = specs, 125 = global
        const message = bufferStream.readString();
        return { fromId, toId, message };
    }

    protected randSeed(bufferStream: BufferStream) : PacketData<DemoModel.Packet.RANDSEED> {
        const randSeed = bufferStream.readInt(4, true);
        return { randSeed };
    }

    protected gameId(bufferStream: BufferStream) : PacketData<DemoModel.Packet.GAMEID> {
        const gameId = bufferStream.read(16).toString("hex");
        return { gameId };
    }

    protected pathChecksum(bufferStream: BufferStream) : PacketData<DemoModel.Packet.PATH_CHECKSUM> {
        const playerNum = bufferStream.readInt(1);
        const checksum = bufferStream.read(4).toString("hex");
        return { playerNum, checksum };
    }

    protected command(bufferStream: BufferStream) : PacketData<DemoModel.Packet.COMMAND> {
        const size = bufferStream.readInt(2);
        const playerNum = bufferStream.readInt(1, true);
        const commandId = bufferStream.readInt(4);
        const timeout = bufferStream.readInt(4);
        const options = bufferStream.readInt(1, true);
        const numParams = bufferStream.readInt(4, true);
        const params = bufferStream.readFloats(numParams);
        const command = this.commandParser.parseCommand(commandId, options, params);
        return { playerNum, timeout, command };
    }

    protected select(bufferStream: BufferStream) : PacketData<DemoModel.Packet.SELECT> {
        const size = bufferStream.readInt(2);
        const playerNum = bufferStream.readInt(1, true);
        const selectedUnitIds = bufferStream.readInts(bufferStream.readStream.readableLength / 2, 2, true);
        return { playerNum, selectedUnitIds };
    }

    protected pause(bufferStream: BufferStream) : PacketData<DemoModel.Packet.PAUSE> {
        const playerNum = bufferStream.readInt(1, true);
        const paused = bufferStream.readBool();
        return { playerNum, paused };
    }

    protected aiCommand(bufferStream: BufferStream) : PacketData<DemoModel.Packet.AICOMMAND> {
        const size = bufferStream.readInt(2);
        const playerNum = bufferStream.readInt(1, true);
        const aiId = bufferStream.readInt(1, true);
        const aiTeamId = bufferStream.readInt(1, true);
        const unitId = bufferStream.readInt(2);
        const commandId = bufferStream.readInt();
        const timeout = bufferStream.readInt();
        const options = bufferStream.readInt(1, true);
        const numParams = bufferStream.readInt(4, true);
        const params = bufferStream.readFloats(numParams);
        return { playerNum, aiId, aiTeamId, unitId, commandId, timeout, options, params };
    }

    protected aiCommands(bufferStream: BufferStream) : PacketData<DemoModel.Packet.AICOMMANDS> {
        const size = bufferStream.readInt(2);
        const playerNum = bufferStream.readInt(1, true);
        const aiId = bufferStream.readInt(1, true);
        const pairwise = bufferStream.readInt(1, true);
        const refCmdId = bufferStream.readInt(4, true);
        const refCmdOpts = bufferStream.readInt(1, true);
        const refCmdSize = bufferStream.readInt(2, true);
        const unitCount = bufferStream.readInt(2);
        const unitIds = bufferStream.readInts(unitCount, 2);
        const commandCount = bufferStream.readInt(2, true);
        const commands: Array<DemoModel.Command.BaseCommand> = [];
        for (let i=0; i<commandCount; i++) {
            const id = refCmdId == 0 ? bufferStream.readInt(4, true) : refCmdId;
            const optionBitmask = refCmdOpts == 0xFF ? bufferStream.readInt(1, true) : refCmdOpts;
            const size = refCmdSize == 0xFFFF ? bufferStream.readInt(2, true) : refCmdSize;
            const params: number[] = [];
            for (let i=0; i<size; i++) {
                params.push(bufferStream.readFloat());
            }
            const command = this.commandParser.parseCommand(id, optionBitmask, params);
            commands.push(command);
        }
        return { playerNum, aiId, pairwise, refCmdId, refCmdOpts, refCmdSize, unitIds, commands };
    }

    protected aiShare(bufferStream: BufferStream) : PacketData<DemoModel.Packet.AISHARE> {
        const size = bufferStream.readInt(2);
        const playerNum = bufferStream.readInt(1, true);
        const aiId = bufferStream.readInt(1, true);
        const sourceTeam = bufferStream.readInt(1, true);
        const destTeam = bufferStream.readInt(1, true);
        const metal = bufferStream.readFloat();
        const energy = bufferStream.readFloat();
        const unitIds = bufferStream.readInts(bufferStream.readStream.readableLength / 2, 2);
        return { playerNum, aiId, sourceTeam, destTeam, metal, energy, unitIds };
    }

    // protected userSpeed(bufferStream: BufferStream) : CommandData<DemoModel.Command.USER_SPEED> {
    //     return {};
    // }

    protected internalSpeed(bufferStream: BufferStream) : PacketData<DemoModel.Packet.INTERNAL_SPEED> {
        const internalSpeed = bufferStream.readFloat();
        return { internalSpeed };
    }

    // protected cpuUsage(bufferStream: BufferStream) : CommandData<DemoModel.Command.CPU_USAGE> {
    //     return {};
    // }

    // protected directControl(bufferStream: BufferStream) : CommandData<DemoModel.Command.DIRECT_CONTROL> {
    //     return {};
    // }

    // protected dcUpdate(bufferStream: BufferStream) : CommandData<DemoModel.Command.DC_UPDATE> {
    //     return {};
    // }

    protected share(bufferStream: BufferStream) : PacketData<DemoModel.Packet.SHARE> {
        const playerNum = bufferStream.readInt(1);
        const shareTeam = bufferStream.readInt(1);
        const shareUnits = bufferStream.readBool();
        const shareMetal = bufferStream.readFloat();
        const shareEnergy = bufferStream.readFloat();
        return { playerNum, shareTeam, shareUnits, shareMetal, shareEnergy };
    }

    protected setShare(bufferStream: BufferStream) : PacketData<DemoModel.Packet.SETSHARE> {
        const playerNum = bufferStream.readInt(1);
        const myTeam = bufferStream.readInt(1);
        const metalShareFraction = bufferStream.readFloat();
        const energyShareFraction = bufferStream.readFloat();
        return { playerNum, myTeam, metalShareFraction, energyShareFraction };
    }

    protected playerStat(bufferStream: BufferStream) : PacketData<DemoModel.Packet.PLAYERSTAT> {
        const playerNum = bufferStream.readInt(1);
        const numCommands = bufferStream.readInt();
        const unitCommands = bufferStream.readInt();
        const mousePixels = bufferStream.readInt();
        const mouseClicks = bufferStream.readInt();
        const keyPresses = bufferStream.readInt();
        return { playerNum, numCommands, unitCommands, mousePixels, mouseClicks, keyPresses };
    }

    protected gameOver(bufferStream: BufferStream) : PacketData<DemoModel.Packet.GAMEOVER> {
        const playerNum = bufferStream.readInt(1);
        const winningAllyTeams = bufferStream.readInts(bufferStream.readStream.readableLength, 1, true);
        return { playerNum, winningAllyTeams };
    }

    protected mapDraw(bufferStream: BufferStream) : PacketData<DemoModel.Packet.MAPDRAW> {
        const size = bufferStream.readInt(1);
        const playerNum = bufferStream.readInt(1);
        const mapDrawAction = bufferStream.readInt(1) as DemoModel.Packet.MapDrawAction;
        const x = bufferStream.readInt(2);
        const z = bufferStream.readInt(2);
        let x2: number | undefined;
        let z2: number | undefined;
        let label: string | undefined;
        if (mapDrawAction === DemoModel.Packet.MapDrawAction.LINE) {
            x2 = bufferStream.readInt(2);
            z2 = bufferStream.readInt(2);
        } else if (mapDrawAction === DemoModel.Packet.MapDrawAction.POINT) {
            label = bufferStream.readString();
        }
        return { playerNum, mapDrawAction, x, z, x2, z2, label };
    }

    protected syncResponse(bufferStream: BufferStream) : PacketData<DemoModel.Packet.SYNCRESPONSE> {
        const playerNum = bufferStream.readInt(1, true);
        const frameNum = bufferStream.readInt();
        const checksum = bufferStream.read(4).toString("hex");
        return { playerNum, frameNum, checksum };
    }

    protected systemMsg(bufferStream: BufferStream) : PacketData<DemoModel.Packet.SYSTEMMSG> {
        const messageSize = bufferStream.readInt(2, true);
        const playerNum = bufferStream.readInt(1, true);
        const message = bufferStream.read(messageSize - 1).toString();
        return { playerNum, message };
    }

    protected startPos(bufferStream: BufferStream) : PacketData<DemoModel.Packet.STARTPOS> {
        const playerNum = bufferStream.readInt(1);
        const myTeam = bufferStream.readInt(1);
        const readyState = bufferStream.readInt(1) as DemoModel.Packet.ReadyState;
        const x = bufferStream.readFloat();
        const y = bufferStream.readFloat();
        const z = bufferStream.readFloat();
        return { playerNum, myTeam, readyState, x, y, z };
    }

    protected playerInfo(bufferStream: BufferStream) : PacketData<DemoModel.Packet.PLAYERINFO> {
        const playerNum = bufferStream.readInt(1, true);
        const cpuUsage = bufferStream.readFloat();
        const ping = bufferStream.readInt();
        return { playerNum, cpuUsage, ping };
    }

    protected playerLeft(bufferStream: BufferStream) : PacketData<DemoModel.Packet.PLAYERLEFT> {
        const playerNum = bufferStream.readInt(1, true);
        const reason = bufferStream.readInt(1, true) as DemoModel.Packet.LeaveReason;
        return { playerNum, reason };
    }

    // protected sdChkRequest(bufferStream: BufferStream) : CommandData<DemoModel.Command.SD_CHKREQUEST> {
    //     return {};
    // }

    // protected sdChkResponse(bufferStream: BufferStream) : CommandData<DemoModel.Command.SD_CHKRESPONSE> {
    //     return {};
    // }

    // protected sdBlkRequest(bufferStream: BufferStream) : CommandData<DemoModel.Command.SD_BLKREQUEST> {
    //     return {};
    // }

    // protected sdBlkresponse(bufferStream: BufferStream) : CommandData<DemoModel.Command.SD_BLKRESPONSE> {
    //     return {};
    // }

    // protected sdReset(bufferStream: BufferStream) : CommandData<DemoModel.Command.SD_RESET> {
    //     return {};
    // }

    protected logMsg(bufferStream: BufferStream) : PacketData<DemoModel.Packet.LOGMSG> {
        const size = bufferStream.readInt(2, true);
        const playerNum = bufferStream.readInt(1);
        const logMsgLvl = bufferStream.readInt(1);
        const strData = bufferStream.read().toString();
        return { playerNum, logMsgLvl, strData };
    }

    protected luaMsg(bufferStream: BufferStream) : PacketData<DemoModel.Packet.LUAMSG> {
        const size = bufferStream.readInt(2, true);
        const playerNum = bufferStream.readInt(1, true);
        const script = bufferStream.readInt(2, true);
        const mode = bufferStream.readInt(1, true);
        const msg = bufferStream.read();
        const data = this.luaParser.parseLuaData(msg);
        // if (typeof data === "string" && this.config.excludeUnhandlerLuaData) {
        //     return;
        // }
        return { playerNum, script, mode, data };
    }

    protected team(bufferStream: BufferStream) : PacketData<DemoModel.Packet.TEAM> {
        const playerNum = bufferStream.readInt(1, true);
        const action = bufferStream.readInt(1, true) as DemoModel.Packet.TeamAction;
        const param = bufferStream.readInt(1, true);
        return { playerNum, action, param };
    }

    protected gameData(bufferStream: BufferStream) : PacketData<DemoModel.Packet.GAMEDATA> {
        const size = bufferStream.readInt(2);
        const compressedSize = bufferStream.readInt(2);
        const setupText = zlib.unzipSync(bufferStream.read(compressedSize));
        const setup = new DemoParser().parseScript(setupText);
        const mapChecksum = bufferStream.read(64).toString("hex");
        const modChecksum = bufferStream.read(64).toString("hex");
        const randomSeed = bufferStream.readInt(4, true);
        return { setup, mapChecksum, modChecksum, randomSeed };
    }

    // protected alliance(bufferStream: BufferStream) : CommandData<DemoModel.Command.ALLIANCE> {
    //     return {};
    // }

    protected cCommand(bufferStream: BufferStream) : PacketData<DemoModel.Packet.CCOMMAND> {
        const size = bufferStream.readInt(2, true);
        const playerNum = bufferStream.readInt(4, true);
        const command = bufferStream.readUntilNull().toString();
        const extra = bufferStream.readUntilNull().toString();
        return { playerNum, command, extra };
    }

    // protected teamStat(bufferStream: BufferStream) : CommandData<DemoModel.Command.TEAMSTAT> {
    //     return {};
    // }

    protected clientData(bufferStream: BufferStream) : PacketData<DemoModel.Packet.CLIENTDATA> {
        const size = bufferStream.readInt(3);
        const setupText = zlib.unzipSync(bufferStream.read(size)).toString();
        return { setupText };
    }

    // protected attemptConnect(bufferStream: BufferStream) : CommandData<DemoModel.Command.ATTEMPTCONNECT> {
    //     return {};
    // }

    // protected rejectConnect(bufferStream: BufferStream) : CommandData<DemoModel.Command.REJECT_CONNECT> {
    //     return {};
    // }

    // protected aiCreated(bufferStream: BufferStream) : CommandData<DemoModel.Command.AI_CREATED> {
    //     return {};
    // }

    protected aiStateChanged(bufferStream: BufferStream) : PacketData<DemoModel.Packet.AI_STATE_CHANGED> {
        const playerNum = bufferStream.readInt(1, true);
        const whichSkirmishAi = bufferStream.readInt(1, true);
        const newState = bufferStream.readInt(1, true);
        return { playerNum, whichSkirmishAi, newState };
    }

    // protected requestTeamStat(bufferStream: BufferStream) : CommandData<DemoModel.Command.REQUEST_TEAMSTAT> {
    //     return {};
    // }

    protected createNewPlayer(bufferStream: BufferStream) : PacketData<DemoModel.Packet.CREATE_NEWPLAYER> {
        const size = bufferStream.readInt(2);
        const playerNum = bufferStream.readInt(1, true);
        const spectator = bufferStream.readBool();
        const teamNum = bufferStream.readInt(1, true);
        const playerName = bufferStream.readString();
        return { playerNum, spectator, teamNum, playerName };
    }

    // protected aiCommandTracked(bufferStream: BufferStream) : CommandData<DemoModel.Command.AICOMMAND_TRACKED> {
    //     return {};
    // }

    protected gameFrameProgress(bufferStream: BufferStream) : PacketData<DemoModel.Packet.GAME_FRAME_PROGRESS> {
        const frameNum = bufferStream.readInt();
        return { frameNum };
    }

    // protected ping(bufferStream: BufferStream) : CommandData<DemoModel.Command.PING> {
        // const playerNum = bufferStream.readInt(1);
        // const pingTag = bufferStream.readInt(1);
        // const localTime = bufferStream.readFloat();
    //     return {};
    // }
}