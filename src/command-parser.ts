import * as zlib from "zlib";
import { DemoParser, DemoParserConfig } from "./index";
import { BufferStream } from "./buffer-stream";
import { DemoModel } from "./model";

// https://github.com/spring/spring/blob/develop/rts/Net/Protocol/NetMessageTypes.h
// https://github.com/spring/spring/blob/develop/rts/Net/Protocol/BaseNetProtocol.cpp
// https://github.com/spring/spring/blob/develop/rts/Sim/Units/CommandAI/Command.h
// https://github.com/dansan/spring-replay-site/blob/master/srs/demoparser.py

type CommandData<C extends DemoModel.Command.BaseCommand = DemoModel.Command.BaseCommand> = Omit<C, "packetType" | "gameTime">;
type CommandHandler = (bufferStream: BufferStream) => CommandData;

export class CommandParser {
    protected config: DemoParserConfig;
    protected commandHandlers: { [key in DemoModel.Command.ID]?: CommandHandler };

    constructor(config: DemoParserConfig) {
        this.config = config;

        this.commandHandlers = {
            [DemoModel.Command.ID.KEYFRAME]: this.keyFrame,                        // 1
            [DemoModel.Command.ID.NEWFRAME]: this.newFrame,                        // 2
            [DemoModel.Command.ID.QUIT]: this.quit,                                // 3
            [DemoModel.Command.ID.STARTPLAYING]: this.startPlaying,                // 4
            [DemoModel.Command.ID.SETPLAYERNUM]: this.setPlayerNum,                // 5
            [DemoModel.Command.ID.PLAYERNAME]: this.playerName,                    // 6
            [DemoModel.Command.ID.CHAT]: this.chat,                                // 7
            [DemoModel.Command.ID.RANDSEED]: this.randSeed,                        // 8
            [DemoModel.Command.ID.GAMEID]: this.gameId,                            // 9
            [DemoModel.Command.ID.PATH_CHECKSUM]: this.pathChecksum,               // 10
            [DemoModel.Command.ID.COMMAND]: this.command,                          // 11
            [DemoModel.Command.ID.SELECT]: this.select,                            // 12
            [DemoModel.Command.ID.PAUSE]: this.pause,                              // 13
            [DemoModel.Command.ID.AICOMMAND]: this.aiCommand,                      // 14
            [DemoModel.Command.ID.AICOMMANDS]: this.aiCommands,                    // 15
            [DemoModel.Command.ID.AISHARE]: this.aiShare,                          // 16
            // [DemoModel.Command.ID.USER_SPEED]: this.userSpeed,                     // 19
            [DemoModel.Command.ID.INTERNAL_SPEED]: this.internalSpeed,             // 20
            // [DemoModel.Command.ID.CPU_USAGE]: this.cpuUsage,                       // 21
            // [DemoModel.Command.ID.DIRECT_CONTROL]: this.directControl,             // 22
            // [DemoModel.Command.ID.DC_UPDATE]: this.dcUpdate,                       // 23
            [DemoModel.Command.ID.SHARE]: this.share,                              // 26
            [DemoModel.Command.ID.SETSHARE]: this.setShare,                        // 27
            [DemoModel.Command.ID.PLAYERSTAT]: this.playerStat,                    // 29
            [DemoModel.Command.ID.GAMEOVER]: this.gameOver,                        // 30
            [DemoModel.Command.ID.MAPDRAW]: this.mapDraw,                          // 31
            [DemoModel.Command.ID.SYNCRESPONSE]: this.syncResponse,                // 33
            [DemoModel.Command.ID.SYSTEMMSG]: this.systemMsg,                      // 35
            [DemoModel.Command.ID.STARTPOS]: this.startPos,                        // 36
            [DemoModel.Command.ID.PLAYERINFO]: this.playerInfo,                    // 38
            [DemoModel.Command.ID.PLAYERLEFT]: this.playerLeft,                    // 39
            // [DemoModel.Command.ID.SD_CHKREQUEST]: this.sdChkRequest,               // 41
            // [DemoModel.Command.ID.SD_CHKRESPONSE]: this.sdChkResponse,             // 42
            // [DemoModel.Command.ID.SD_BLKREQUEST]: this.sdBlkRequest,               // 43
            // [DemoModel.Command.ID.SD_BLKRESPONSE]: this.sdBlkresponse,             // 44
            // [DemoModel.Command.ID.SD_RESET]: this.sdReset,                         // 45
            [DemoModel.Command.ID.LOGMSG]: this.logMsg,                            // 49
            [DemoModel.Command.ID.LUAMSG]: this.luaMsg,                            // 50
            [DemoModel.Command.ID.TEAM]: this.team,                                // 51
            [DemoModel.Command.ID.GAMEDATA]: this.gameData,                        // 52
            // [DemoModel.Command.ID.ALLIANCE]: this.alliance,                        // 53
            [DemoModel.Command.ID.CCOMMAND]: this.cCommand,                        // 54
            // [DemoModel.Command.ID.TEAMSTAT]: this.teamStat,                        // 60
            [DemoModel.Command.ID.CLIENTDATA]: this.clientData,                    // 61
            // [DemoModel.Command.ID.ATTEMPTCONNECT]: this.attemptConnect,            // 65
            // [DemoModel.Command.ID.REJECT_CONNECT]: this.rejectConnect,             // 66
            // [DemoModel.Command.ID.AI_CREATED]: this.aiCreated,                     // 70
            [DemoModel.Command.ID.AI_STATE_CHANGED]: this.aiStateChanged,          // 71
            // [DemoModel.Command.ID.REQUEST_TEAMSTAT]: this.requestTeamStat,         // 72
            [DemoModel.Command.ID.CREATE_NEWPLAYER]: this.createNewPlayer,         // 75
            // [DemoModel.Command.ID.AICOMMAND_TRACKED]: this.aiCommandTracked,       // 76
            [DemoModel.Command.ID.GAME_FRAME_PROGRESS]: this.gameFrameProgress,    // 77
            // [DemoModel.Command.ID.PING]: this.ping,                                // 78
        };
    }

    public parseCommand(buffer: Buffer, modGameTime: number) : DemoModel.Command.BaseCommand | undefined {
        const bufferStream = new BufferStream(buffer, false);

        const commandId = bufferStream.readInt(1) as DemoModel.Command.ID;
        if ((this.config.includeOnly!.length > 0 && !this.config.includeOnly!.includes(commandId)) || this.config.excludeOnly!.includes(commandId)){
            return;
        }
        const commandHandler = this.commandHandlers[commandId];
        if (!commandHandler && this.config.verbose) {
            console.log(`No command handler found for commandId: ${commandId} (${DemoModel.Command.ID[commandId]})`);
        }
        const commandData = commandHandler ? commandHandler(bufferStream) : {};
        const command: DemoModel.Command.BaseCommand = {
            packetType: [commandId, DemoModel.Command.ID[commandId]],
            gameTime: modGameTime,
            ...commandData
        };

        return command;
    }

    protected keyFrame(bufferStream: BufferStream) : CommandData<DemoModel.Command.KEYFRAME> {
        const frameNum = bufferStream.readInt();
        return { frameNum };
    }

    protected newFrame(bufferStream: BufferStream) : CommandData<DemoModel.Command.NEWFRAME> {
        return {};
    }

    protected quit(bufferStream: BufferStream) : CommandData<DemoModel.Command.QUIT> {
        const size = bufferStream.readInt(2);
        const reason = bufferStream.readString(size);
        return { reason };
    }

    protected startPlaying(bufferStream: BufferStream) : CommandData<DemoModel.Command.STARTPLAYING> {
        const countdown = bufferStream.readInt();
        return { countdown };
    }

    protected setPlayerNum(bufferStream: BufferStream) : CommandData<DemoModel.Command.SETPLAYERNUM> {
        const playerNum = bufferStream.readInt(1, true);
        return { playerNum };
    }

    protected playerName(bufferStream: BufferStream) : CommandData<DemoModel.Command.PLAYERNAME> {
        const size = bufferStream.readInt(1);
        const playerNum = bufferStream.readInt(1);
        const playerName = bufferStream.read(size).toString();
        return { playerNum, playerName };
    }

    protected chat(bufferStream: BufferStream) : CommandData<DemoModel.Command.CHAT> {
        const size = bufferStream.readInt(1, true);
        const fromId = bufferStream.readInt(1, true);
        const toId = bufferStream.readInt(1, true);
        const message = bufferStream.readString();
        return { fromId, toId, message };
    }

    protected randSeed(bufferStream: BufferStream) : CommandData<DemoModel.Command.RANDSEED> {
        const randSeed = bufferStream.readInt(4, true);
        return { randSeed };
    }

    protected gameId(bufferStream: BufferStream) : CommandData<DemoModel.Command.GAMEID> {
        const gameId = bufferStream.read(16).toString("hex");
        return { gameId };
    }

    protected pathChecksum(bufferStream: BufferStream) : CommandData<DemoModel.Command.PATH_CHECKSUM> {
        const playerNum = bufferStream.readInt(1);
        const checksum = bufferStream.read(4).toString("hex");
        return { playerNum, checksum };
    }

    protected command(bufferStream: BufferStream) : CommandData<DemoModel.Command.COMMAND> {
        const size = bufferStream.readInt(2);
        const playerNum = bufferStream.readInt(1, true);
        const commandId = bufferStream.readInt(4); // TODO: parse into a CommandID enum
        const timeout = bufferStream.readInt(4);
        const options = bufferStream.readInt(1, true);
        const numParams = bufferStream.readInt(4, true);
        const params = bufferStream.readFloats(numParams);
        return { playerNum, commandId, timeout, options, params };
    }

    protected select(bufferStream: BufferStream) : CommandData<DemoModel.Command.SELECT> {
        return {} as any;
    }

    protected pause(bufferStream: BufferStream) : CommandData<DemoModel.Command.PAUSE> {
        const playerNum = bufferStream.readInt(1, true);
        const paused = bufferStream.readBool();
        return { playerNum, paused } as any;
    }

    protected aiCommand(bufferStream: BufferStream) : CommandData<DemoModel.Command.AICOMMAND> {
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

    protected aiCommands(bufferStream: BufferStream) : CommandData<DemoModel.Command.AICOMMANDS> {
        const size = bufferStream.readInt(2);
        const playerNum = bufferStream.readInt(1, true);
        const aiId = bufferStream.readInt(1, true);
        const pairwise = bufferStream.readInt(1, true);
        const sameCmdId = bufferStream.readInt(4, true);
        const sameCmdOpt = bufferStream.readInt(1, true);
        const sameCmdParamSize = bufferStream.readInt(2, true);
        const unitCount = bufferStream.readInt(2);
        const unitIds = bufferStream.readInts(unitCount, 2);
        const commandCount = bufferStream.readInt(2);
        const commands: Array<{commandId: number, options: number; params: number[]}> = [];
        // command parsing probably not working
        for (let i=0; i<commandCount; i++) {
            const commandId = sameCmdId === 0 ? bufferStream.readInt() : 0;
            const options = sameCmdOpt === 0xFF ? bufferStream.readInt(1, true) : 0;
            const paramCount = sameCmdParamSize === 0xFFFF ? bufferStream.readInt(2, true) : 0;
            const params = bufferStream.readFloats(paramCount);
            commands.push({ commandId, options, params });
        }
        return { playerNum, aiId, pairwise, sameCmdId, sameCmdOpt, sameCmdParamSize, unitCount, unitIds, commandCount, commands };
    }

    protected aiShare(bufferStream: BufferStream) : CommandData<DemoModel.Command.AISHARE> {
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

    protected internalSpeed(bufferStream: BufferStream) : CommandData<DemoModel.Command.INTERNAL_SPEED> {
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

    protected share(bufferStream: BufferStream) : CommandData<DemoModel.Command.SHARE> {
        const playerNum = bufferStream.readInt(1);
        const shareTeam = bufferStream.readInt(1);
        const shareUnits = bufferStream.readBool();
        const shareMetal = bufferStream.readFloat();
        const shareEnergy = bufferStream.readFloat();
        return { playerNum, shareTeam, shareUnits, shareMetal, shareEnergy };
    }

    protected setShare(bufferStream: BufferStream) : CommandData<DemoModel.Command.SETSHARE> {
        const playerNum = bufferStream.readInt(1);
        const myTeam = bufferStream.readInt(1);
        const metalShareFraction = bufferStream.readFloat();
        const energyShareFraction = bufferStream.readFloat();
        return { playerNum, myTeam, metalShareFraction, energyShareFraction };
    }

    protected playerStat(bufferStream: BufferStream) : CommandData<DemoModel.Command.PLAYERSTAT> {
        const playerNum = bufferStream.readInt(1);
        const numCommands = bufferStream.readInt();
        const unitCommands = bufferStream.readInt();
        const mousePixels = bufferStream.readInt();
        const mouseClicks = bufferStream.readInt();
        const keyPresses = bufferStream.readInt();
        return { playerNum, numCommands, unitCommands, mousePixels, mouseClicks, keyPresses };
    }

    protected gameOver(bufferStream: BufferStream) : CommandData<DemoModel.Command.GAMEOVER> {
        const playerNum = bufferStream.readInt(1);
        const winningAllyTeams = bufferStream.readInts(bufferStream.readStream.readableLength, 1, true);
        return { playerNum, winningAllyTeams };
    }

    protected mapDraw(bufferStream: BufferStream) : CommandData<DemoModel.Command.MAPDRAW> {
        const size = bufferStream.readInt(1);
        const playerNum = bufferStream.readInt(1);
        const mapDrawAction = bufferStream.readInt(1) as DemoModel.Command.MapDrawAction;
        const x = bufferStream.readInt(2);
        const z = bufferStream.readInt(2);
        let x2: number | undefined;
        let z2: number | undefined;
        let label: string | undefined;
        if (mapDrawAction === DemoModel.Command.MapDrawAction.LINE) {
            x2 = bufferStream.readInt(2);
            z2 = bufferStream.readInt(2);
        } else if (mapDrawAction === DemoModel.Command.MapDrawAction.POINT) {
            label = bufferStream.readString();
        }
        return { playerNum, mapDrawAction, x, z, x2, z2, label };
    }

    protected syncResponse(bufferStream: BufferStream) : CommandData<DemoModel.Command.SYNCRESPONSE> {
        const playerNum = bufferStream.readInt(1, true);
        const frameNum = bufferStream.readInt();
        const checksum = bufferStream.read(4).toString("hex");
        return { playerNum, frameNum, checksum };
    }

    protected systemMsg(bufferStream: BufferStream) : CommandData<DemoModel.Command.SYSTEMMSG> {
        const messageSize = bufferStream.readInt(2, true);
        const playerNum = bufferStream.readInt(1, true);
        const message = bufferStream.read(messageSize - 1).toString();
        return { playerNum, message };
    }

    protected startPos(bufferStream: BufferStream) : CommandData<DemoModel.Command.STARTPOS> {
        const playerNum = bufferStream.readInt(1);
        const myTeam = bufferStream.readInt(1);
        const readyState = bufferStream.readInt(1) as DemoModel.Command.ReadyState;
        const x = bufferStream.readFloat();
        const y = bufferStream.readFloat();
        const z = bufferStream.readFloat();
        return { playerNum, myTeam, readyState, x, y, z };
    }

    protected playerInfo(bufferStream: BufferStream) : CommandData<DemoModel.Command.PLAYERINFO> {
        const playerNum = bufferStream.readInt(1, true);
        const cpuUsage = bufferStream.readFloat();
        const ping = bufferStream.readInt();
        return { playerNum, cpuUsage, ping };
    }

    protected playerLeft(bufferStream: BufferStream) : CommandData<DemoModel.Command.PLAYERLEFT> {
        const playerNum = bufferStream.readInt(1, true);
        const reason = bufferStream.readInt(1, true) as DemoModel.Command.LeaveReason;
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

    protected logMsg(bufferStream: BufferStream) : CommandData<DemoModel.Command.LOGMSG> {
        const size = bufferStream.readInt(2, true);
        const playerNum = bufferStream.readInt(1);
        const logMsgLvl = bufferStream.readInt(1);
        const strData = bufferStream.read().toString();
        return { playerNum, logMsgLvl, strData };
    }

    protected luaMsg(bufferStream: BufferStream) : CommandData<DemoModel.Command.LUAMSG> {
        const size = bufferStream.readInt(2, true);
        const playerNum = bufferStream.readInt(1, true);
        const script = bufferStream.readInt(2, true);
        const mode = bufferStream.readInt(1, true);
        const rawData = bufferStream.readInts(bufferStream.readStream.readableLength, 1, true);
        return { playerNum, script, mode, rawData };
    }

    protected team(bufferStream: BufferStream) : CommandData<DemoModel.Command.TEAM> {
        const playerNum = bufferStream.readInt(1, true);
        const action = bufferStream.readInt(1, true) as DemoModel.Command.TeamAction;
        const param = bufferStream.readInt(1, true);
        return { playerNum, action, param };
    }

    protected gameData(bufferStream: BufferStream) : CommandData<DemoModel.Command.GAMEDATA> {
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

    protected cCommand(bufferStream: BufferStream) : CommandData<DemoModel.Command.CCOMMAND> {
        const size = bufferStream.readInt(2, true);
        const playerNum = bufferStream.readInt(4, true);
        const command = bufferStream.readUntilNull().toString();
        const extra = bufferStream.readUntilNull().toString();
        return { playerNum, command, extra };
    }

    // protected teamStat(bufferStream: BufferStream) : CommandData<DemoModel.Command.TEAMSTAT> {
    //     return {};
    // }

    protected clientData(bufferStream: BufferStream) : CommandData<DemoModel.Command.CLIENTDATA> {
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

    protected aiStateChanged(bufferStream: BufferStream) : CommandData<DemoModel.Command.AI_STATE_CHANGED> {
        const playerNum = bufferStream.readInt(1, true);
        const whichSkirmishAi = bufferStream.readInt(1, true);
        const newState = bufferStream.readInt(1, true);
        return { playerNum, whichSkirmishAi, newState };
    }

    // protected requestTeamStat(bufferStream: BufferStream) : CommandData<DemoModel.Command.REQUEST_TEAMSTAT> {
    //     return {};
    // }

    protected createNewPlayer(bufferStream: BufferStream) : CommandData<DemoModel.Command.CREATE_NEWPLAYER> {
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

    protected gameFrameProgress(bufferStream: BufferStream) : CommandData<DemoModel.Command.GAME_FRAME_PROGRESS> {
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