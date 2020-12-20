export namespace DemoModel {
    export interface Demo {
        header: Header;
        script: Script;
        demoStream: Command.Command[];
    }

    export interface Header {
        magic: string;
        version: number;
        headerSize: number;
        versionString: string;
        gameId: string;
        startTime: any;
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
        export interface Command {
            id: ID;
            gameTime: number;
        }

        export interface GameInfo extends Command {
            setupText: string;
            mapChecksum: string;
            modChecksum: string;
            randomSeed: number;
        }
        export interface NewFrame extends Command {
        }
    }
}