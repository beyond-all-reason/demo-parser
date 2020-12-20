import * as zlib from "zlib";
import { BufferStream } from "./buffer-stream";
import { DemoModel } from "./model";

// https://github.com/spring/spring/blob/develop/rts/Net/Protocol/NetMessageTypes.h

type CommandData<C extends DemoModel.Command.Command = DemoModel.Command.Command> = Omit<C, "id" | "gameTime">;
type CommandHandler = (bufferStream: BufferStream) => CommandData;

export class CommandParser {
    protected verbose: boolean;
    protected commandHandlers: { [key in DemoModel.Command.ID]: CommandHandler };

    constructor(verbose = false) {
        this.verbose = verbose;

        this.commandHandlers = {
            [DemoModel.Command.ID.KEYFRAME]: this.keyFrame,
            [DemoModel.Command.ID.NEWFRAME]: this.newFrame,
            [DemoModel.Command.ID.QUIT]: this.quit,
            [DemoModel.Command.ID.STARTPLAYING]: this.startPlaying,
            [DemoModel.Command.ID.SETPLAYERNUM]: this.setPlayerNum,
            [DemoModel.Command.ID.PLAYERNAME]: this.playerName,
            [DemoModel.Command.ID.CHAT]: this.chat,
            [DemoModel.Command.ID.RANDSEED]: this.randSeed,
            [DemoModel.Command.ID.GAMEID]: this.gameId,
            [DemoModel.Command.ID.PATH_CHECKSUM]: this.pathChecksum,
            [DemoModel.Command.ID.COMMAND]: this.command,
            [DemoModel.Command.ID.SELECT]: this.select,
            [DemoModel.Command.ID.PAUSE]: this.pause,
            [DemoModel.Command.ID.AICOMMAND]: this.aiCommand,
            [DemoModel.Command.ID.AICOMMANDS]: this.aiCommands,
            [DemoModel.Command.ID.AISHARE]: this.aiShare,
            [DemoModel.Command.ID.USER_SPEED]: this.userSpeed,
            [DemoModel.Command.ID.INTERNAL_SPEED]: this.internalSpeed,
            [DemoModel.Command.ID.CPU_USAGE]: this.cpuUsage,
            [DemoModel.Command.ID.DIRECT_CONTROL]: this.directControl,
            [DemoModel.Command.ID.DC_UPDATE]: this.dcUpdate,
            [DemoModel.Command.ID.SHARE]: this.share,
            [DemoModel.Command.ID.SETSHARE]: this.setShare,
            [DemoModel.Command.ID.PLAYERSTAT]: this.playerStat,
            [DemoModel.Command.ID.GAMEOVER]: this.gameOver,
            [DemoModel.Command.ID.MAPDRAW]: this.mapDraw,
            [DemoModel.Command.ID.SYNCRESPONSE]: this.syncResponse,
            [DemoModel.Command.ID.SYSTEMMSG]: this.systemMsg,
            [DemoModel.Command.ID.STARTPOS]: this.startPos,
            [DemoModel.Command.ID.PLAYERINFO]: this.playerInfo,
            [DemoModel.Command.ID.PLAYERLEFT]: this.playerLeft,
            [DemoModel.Command.ID.SD_CHKREQUEST]: this.sdChkRequest,
            [DemoModel.Command.ID.SD_CHKRESPONSE]: this.sdChkResponse,
            [DemoModel.Command.ID.SD_BLKREQUEST]: this.sdBlkRequest,
            [DemoModel.Command.ID.SD_BLKRESPONSE]: this.sdBlkresponse,
            [DemoModel.Command.ID.SD_RESET]: this.sdReset,
            [DemoModel.Command.ID.LOGMSG]: this.logMsg,
            [DemoModel.Command.ID.LUAMSG]: this.luaMsg,
            [DemoModel.Command.ID.TEAM]: this.team,
            [DemoModel.Command.ID.GAMEDATA]: this.gameData,
            [DemoModel.Command.ID.ALLIANCE]: this.alliance,
            [DemoModel.Command.ID.CCOMMAND]: this.cCommand,
            [DemoModel.Command.ID.TEAMSTAT]: this.teamStat,
            [DemoModel.Command.ID.CLIENTDATA]: this.clientData,
            [DemoModel.Command.ID.ATTEMPTCONNECT]: this.attemptConnect,
            [DemoModel.Command.ID.REJECT_CONNECT]: this.rejectConnect,
            [DemoModel.Command.ID.AI_CREATED]: this.aiCreated,
            [DemoModel.Command.ID.AI_STATE_CHANGED]: this.aiStateChanged,
            [DemoModel.Command.ID.REQUEST_TEAMSTAT]: this.requestTeamStat,
            [DemoModel.Command.ID.CREATE_NEWPLAYER]: this.createNewPlayer,
            [DemoModel.Command.ID.AICOMMAND_TRACKED]: this.aiCommandTracked,
            [DemoModel.Command.ID.GAME_FRAME_PROGRESS]: this.gameFrameProgress,
            [DemoModel.Command.ID.PING]: this.ping,
        };
    }

    public parseCommand(buffer: Buffer, modGameTime: number) : DemoModel.Command.Command {
        const bufferStream = new BufferStream(buffer, false);

        const commandId = bufferStream.readInt(1) as DemoModel.Command.ID;
        const commandHandler = this.commandHandlers[commandId];
        if (!commandHandler && this.verbose) {
            console.log(`No command handler found for commandId: ${commandId}`);
        }
        const commandData = commandHandler ? commandHandler(bufferStream) : {};
        const command: DemoModel.Command.Command = {
            id: commandId,
            gameTime: modGameTime,
            ...commandData
        };

        return command;
    }

    protected keyFrame(bufferStream: BufferStream) : CommandData<DemoModel.Command.NewFrame> {
        return {};
    }

    protected newFrame(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected quit(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected startPlaying(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected setPlayerNum(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected playerName(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected chat(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected randSeed(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected gameId(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected pathChecksum(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected command(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected select(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected pause(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected aiCommand(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected aiCommands(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected aiShare(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected userSpeed(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected internalSpeed(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected cpuUsage(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected directControl(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected dcUpdate(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected share(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected setShare(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected playerStat(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected gameOver(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected mapDraw(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected syncResponse(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected systemMsg(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected startPos(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected playerInfo(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected playerLeft(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected sdChkRequest(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected sdChkResponse(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected sdBlkRequest(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected sdBlkresponse(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected sdReset(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected logMsg(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected luaMsg(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected team(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected gameData(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        const size = bufferStream.readInt(2);
        const compressedSize = bufferStream.readInt(2);
        const setupText = zlib.deflateSync(bufferStream.read(compressedSize)).toString();
        const mapChecksum = bufferStream.read(64).toString("hex");
        const modChecksum = bufferStream.read(64).toString("hex");
        const randomSeed = bufferStream.readInt(4, true);

        return { setupText, mapChecksum, modChecksum, randomSeed };
    }

    protected alliance(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected cCommand(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected teamStat(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected clientData(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected attemptConnect(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected rejectConnect(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected aiCreated(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected aiStateChanged(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected requestTeamStat(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected createNewPlayer(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected aiCommandTracked(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected gameFrameProgress(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected ping(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }

    protected last(bufferStream: BufferStream) : CommandData<DemoModel.Command.Command> {
        return {};
    }
}