export namespace DemoModel {
    export interface Demo {
        header: Header;
        script: Script;
        demoStream: Command.BaseCommand[];
    }

    export interface Header {
        magic: string;
        version: number;
        headerSize: number;
        versionString: string;
        gameId: string;
        startTime: Date;
        scriptSize: number;
        demoStreamSize: number,
        gameTime: number,
        wallclockTime: number,
        numPlayers: number,
        playerStatSize: number,
        playerStatElemSize: number,
        numTeams: number,
        teamStatSize: number,
        teamStatElemSize: number,
        teamStatPeriod: number,
        winningAllyTeamsSize: number
    }

    export interface Script {
        gameSettings: ScriptGameSettings;
        modSettings: ScriptModSettings;
        mapSettings: ScriptMapSettings;
        restrictions: ScriptRestrictions;
        allyTeams: ScriptAllyTeam[];
        spectators: ScriptPlayer[];
    }

    export interface ScriptGameSettings {
        [key: string]: string | number | boolean;
        autohostrank: number;
        numplayers: number;
        gametype: string;
        autohostport: number;
        hostip: string;
        ishost: boolean;
        mapname: string;
        startpostype: number;
        numrestrictions: number;
        autohostaccountid: number;
        autohostname: string;
        autohostcountrycode: string;
        hostport: number;
        numallyteams: number;
        hosttype: string;
        numteams: number;
    }

    export interface ScriptModSettings {
        [key: string]: string | number | boolean;
    }

    export interface ScriptMapSettings {
        [key: string]: string;
    }

    export interface ScriptRestrictions {
        [key: string]: string;
    }

    export interface ScriptAllyTeam {
        id: number;
        numallies: number;
        startrectbottom: number;
        startrectleft: number;
        startrecttop: number;
        startrectright: number;
        teams: ScriptTeam[];
    }

    export interface ScriptTeam {
        id: number;
        teamleader: number;
        rgbcolor: number[];
        allyteam: number;
        handicap: number;
        side: string;
        players: ScriptPlayer[];
    }

    export interface ScriptPlayer {
        id: number;
        skillclass: number;
        accountid: number;
        name: string;
        countrycode: string;
        skilluncertainty: number;
        rank: number;
        skill: string;
        team?: number;
    }

    // https://github.com/spring/spring/blob/develop/rts/Net/Protocol/NetMessageTypes.h
    export namespace Command {
        export enum ID {
            KEYFRAME            = 1,
            NEWFRAME            = 2,
            QUIT                = 3,
            STARTPLAYING        = 4,
            SETPLAYERNUM        = 5,
            PLAYERNAME          = 6,
            CHAT                = 7,
            RANDSEED            = 8,
            GAMEID              = 9,
            PATH_CHECKSUM       = 10,
            COMMAND             = 11,
            SELECT              = 12,
            PAUSE               = 13,
            AICOMMAND           = 14,
            AICOMMANDS          = 15,
            AISHARE             = 16,
            USER_SPEED          = 19,
            INTERNAL_SPEED      = 20,
            CPU_USAGE           = 21,
            DIRECT_CONTROL      = 22,
            DC_UPDATE           = 23,
            SHARE               = 26,
            SETSHARE            = 27,
            PLAYERSTAT          = 29,
            GAMEOVER            = 30,
            MAPDRAW             = 31,
            SYNCRESPONSE        = 33,
            SYSTEMMSG           = 35,
            STARTPOS            = 36,
            PLAYERINFO          = 38,
            PLAYERLEFT          = 39,
            SD_CHKREQUEST       = 41,
            SD_CHKRESPONSE      = 42,
            SD_BLKREQUEST       = 43,
            SD_BLKRESPONSE      = 44,
            SD_RESET            = 45,
            LOGMSG              = 49,
            LUAMSG              = 50,
            TEAM                = 51,
            GAMEDATA            = 52,
            ALLIANCE            = 53,
            CCOMMAND            = 54,
            TEAMSTAT            = 60,
            CLIENTDATA          = 61,
            ATTEMPTCONNECT      = 65,
            REJECT_CONNECT      = 66,
            AI_CREATED          = 70,
            AI_STATE_CHANGED    = 71,
            REQUEST_TEAMSTAT    = 72,
            CREATE_NEWPLAYER    = 75,
            AICOMMAND_TRACKED   = 76,
            GAME_FRAME_PROGRESS = 77,
            PING                = 78,
        }
        export interface BaseCommand {
            packetType: [ID, string];
            gameTime: number;
        }

        export interface KEYFRAME extends BaseCommand {
            frameNum: number;
        }
        export interface NEWFRAME extends BaseCommand {
        }
        export interface QUIT extends BaseCommand {
            reason: string;
        }
        export interface STARTPLAYING extends BaseCommand {
            countdown: number;
        }
        export interface SETPLAYERNUM extends BaseCommand {
            playerNum: number;
        }
        export interface PLAYERNAME extends BaseCommand {
            playerNum: number;
            playerName: string;
        }
        export interface CHAT extends BaseCommand {
            fromId: number;
            toId: number;
            message: string;
        }
        export interface RANDSEED extends BaseCommand {
            randSeed: number;
        }
        export interface GAMEID extends BaseCommand {
            gameId: string;
        }
        export interface PATH_CHECKSUM extends BaseCommand {
            playerNum: number;
            checksum: string;
        }
        export interface COMMAND extends BaseCommand {
            playerNum: number;
            commandId: number;
            timeout: number;
            options: number;
            params: number[];
        }
        export interface SELECT extends BaseCommand {
            playerNum: number;
            selectedUnitIds: number[];
        }
        export interface PAUSE extends BaseCommand {
            playerNum: number;
            paused: boolean;
        }
        export interface AICOMMAND extends BaseCommand {
            playerNum: number;
            aiId: number;
            aiTeamId: number;
            unitId: number;
            commandId: number;
            timeout: number;
            options: number;
            params: number[];
        }
        export interface AICOMMANDS extends BaseCommand {
            playerNum: number;
            aiId: number;
            pairwise: number;
            sameCmdId: number;
            sameCmdOpt: number;
            sameCmdParamSize: number;
            unitCount: number;
            unitIds: number[];
            commandCount: number;
            commands: Array<{commandId: number, options: number; params: number[]}>;
        }
        export interface AISHARE extends BaseCommand {
            playerNum: number;
            aiId: number;
            sourceTeam: number;
            destTeam: number;
            metal: number;
            energy: number;
            unitIds: number[];
        }
        export interface USER_SPEED extends BaseCommand {
            playerNum: number;
            userSpeed: number;
        }
        export interface INTERNAL_SPEED extends BaseCommand {
            internalSpeed: number;
        }
        export interface CPU_USAGE extends BaseCommand {
            cpuUsage: number;
        }
        export interface DIRECT_CONTROL extends BaseCommand {
            playerNum: number;
        }
        export interface DC_UPDATE extends BaseCommand {
            playerNum: number;
            status: number;
            heading: number;
            pitch: number;
        }
        export interface SHARE extends BaseCommand {
            playerNum: number;
            shareTeam: number;
            shareUnits: boolean;
            shareMetal: number;
            shareEnergy: number;
        }
        export interface SETSHARE extends BaseCommand {
            playerNum: number;
            myTeam: number;
            metalShareFraction: number;
            energyShareFraction: number;
        }
        export interface PLAYERSTAT extends BaseCommand {
            playerNum: number;
            numCommands: number;
            unitCommands: number;
            mousePixels: number;
            mouseClicks: number;
            keyPresses: number;
        }
        export interface GAMEOVER extends BaseCommand {
            playerNum: number;
            winningAllyTeams: number[];
        }
        export interface MAPDRAW extends BaseCommand {
            playerNum: number;
            mapDrawAction: MapDrawAction;
            x: number;
            z: number;
            x2?: number;
            z2?: number;
            label?: string;
        }
        export interface SYNCRESPONSE extends BaseCommand {
            playerNum: number;
            frameNum: number;
            checksum: string;
        }
        export interface SYSTEMMSG extends BaseCommand {
            playerNum: number;
            message: string;
        }
        export interface STARTPOS extends BaseCommand {
            playerNum: number;
            myTeam: number;
            readyState: ReadyState;
            x: number;
            y: number;
            z: number;
        }
        export interface PLAYERINFO extends BaseCommand {
            playerNum: number;
            cpuUsage: number;
            ping: number;
        }
        export interface PLAYERLEFT extends BaseCommand {
            playerNum: number;
            reason: LeaveReason;
        }
        export interface SD_CHKREQUEST extends BaseCommand {
        }
        export interface SD_CHKRESPONSE extends BaseCommand {
        }
        export interface SD_BLKREQUEST extends BaseCommand {
        }
        export interface SD_BLKRESPONSE extends BaseCommand {
        }
        export interface SD_RESET extends BaseCommand {
        }
        export interface LOGMSG extends BaseCommand {
            playerNum: number;
            logMsgLvl: number;
            strData: string;
        }
        export interface LUAMSG extends BaseCommand {
            playerNum: number;
            script: number;
            mode: number;
            rawData: number[];
        }
        export interface TEAM extends BaseCommand {
            playerNum: number;
            action: TeamAction;
            param: number;
        }
        export interface GAMEDATA extends BaseCommand {
            setup: Script;
            mapChecksum: string;
            modChecksum: string;
            randomSeed: number;
        }
        export interface ALLIANCE extends BaseCommand {
            playerNum: number;
            otherAllyTeam: number;
            areAllies: boolean;
        }
        export interface CCOMMAND extends BaseCommand {
            playerNum: number;
            command: string;
            extra: string;
        }
        export interface TEAMSTAT extends BaseCommand {
            teamNum: number;
            statistics: any;
        }
        export interface CLIENTDATA extends BaseCommand {
            setupText: string;
        }
        export interface ATTEMPTCONNECT extends BaseCommand {
            netVersion: number;
            playerName: string;
            password: string;
            versionStringDetailed: string;
        }
        export interface REJECT_CONNECT extends BaseCommand {
            reason: string;
        }
        export interface AI_CREATED extends BaseCommand {
            playerNum: number;
            whichSkirmishAi: number;
            team: number;
            name: string;
        }
        export interface AI_STATE_CHANGED extends BaseCommand {
            playerNum: number;
            whichSkirmishAi: number;
            newState: number;
        }
        export interface REQUEST_TEAMSTAT extends BaseCommand {
            teamNum: number;
            startFrameNum: number;
        }
        export interface CREATE_NEWPLAYER extends BaseCommand {
            playerNum: number;
            spectator: boolean;
            teamNum: number;
            playerName: string;
        }
        export interface AICOMMAND_TRACKED extends BaseCommand {
            playerNum: number;
            aiId: number;
            unitId: number;
            id: number;
            options: number;
            aiCommandId: number;
            params: number[];
        }
        export interface GAME_FRAME_PROGRESS extends BaseCommand {
            frameNum: number;
        }
        export interface PING extends BaseCommand {
            playerNum: number;
            pingTag: number;
            localTime: number;
        }

        export enum LeaveReason {
            LOST_CONNECTION = 0,
            INTENTIONAL = 1,
            KICKED = 2
        }

        export enum ReadyState {
            NOT_READY = 0,
            READY = 1,
            NO_UPDATE = 2
        }

        export enum TeamAction {
            GIVEAWAY = 1,
            RESIGN = 2,
            JOIN_TEAM = 3,
            TEAM_DIED = 4,
            AI_CREATED = 5,
            AI_DESTROYED = 6
        }

        export enum MapDrawAction {
            POINT,
            ERASE,
            LINE
        }
    }
}