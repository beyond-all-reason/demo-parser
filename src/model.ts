export namespace DemoModel {
    export interface Demo {
        header: Header;
        script: Script;
        game: GameStream;
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

    export interface GameStream {

    }
}