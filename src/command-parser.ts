// https://github.com/spring/spring/blob/develop/rts/Sim/Units/CommandAI/Command.h
// https://github.com/spring/spring/blob/develop/rts/Sim/Units/CommandAI/CommandAI.cpp

import { DemoModel, DemoParserConfig } from "./index";

type CommandHandler = (params: number[]) => {};

export class CommandParser {
    protected config: DemoParserConfig;
    
    constructor(config: DemoParserConfig) {
        this.config = config;
    }

    protected commandHandlers: { [key in DemoModel.Command.ID]?: CommandHandler } = {
        // [DemoModel.Command.ID.STOP]           : this.stop,   // 0
        // [DemoModel.Command.ID.INSERT]         : this.insert,   // 1
        // [DemoModel.Command.ID.REMOVE]         : this.remove,   // 2
        // [DemoModel.Command.ID.WAIT]           : this.wait,   // 5
        // [DemoModel.Command.ID.TIMEWAIT]       : this.timewait,   // 6
        // [DemoModel.Command.ID.DEATHWAIT]      : this.deathwait,   // 7
        // [DemoModel.Command.ID.SQUADWAIT]      : this.squadwait,   // 8
        // [DemoModel.Command.ID.GATHERWAIT]     : this.gatherwait,   // 9
        // [DemoModel.Command.ID.MOVE]           : this.move,   // 10
        // [DemoModel.Command.ID.PATROL]         : this.patrol,   // 15
        // [DemoModel.Command.ID.FIGHT]          : this.fight,   // 16
        // [DemoModel.Command.ID.ATTACK]         : this.attack,   // 20
        // [DemoModel.Command.ID.AREA_ATTACK]    : this.areaAttack,   // 21
        // [DemoModel.Command.ID.GUARD]          : this.guard,   // 25
        // [DemoModel.Command.ID.AISELECT]       : this.aiselect,   // 30
        // [DemoModel.Command.ID.GROUPSELECT]    : this.groupselect,   // 35
        // [DemoModel.Command.ID.GROUPADD]       : this.groupadd,   // 36
        // [DemoModel.Command.ID.GROUPCLEAR]     : this.groupclear,   // 37
        // [DemoModel.Command.ID.REPAIR]         : this.repair,   // 40
        // [DemoModel.Command.ID.FIRE_STATE]     : this.fireState,   // 45
        // [DemoModel.Command.ID.MOVE_STATE]     : this.moveState,   // 50
        // [DemoModel.Command.ID.SETBASE]        : this.setbase,   // 55
        // [DemoModel.Command.ID.INTERNAL]       : this.internal,   // 60
        // [DemoModel.Command.ID.SELFD]          : this.selfd,   // 65
        // [DemoModel.Command.ID.LOAD_UNITS]     : this.loadUnits,   // 75
        // [DemoModel.Command.ID.LOAD_ONTO]      : this.loadOnto,   // 76
        // [DemoModel.Command.ID.UNLOAD_UNITS]   : this.unloadUnits,   // 80
        // [DemoModel.Command.ID.UNLOAD_UNIT]    : this.unloadUnit,   // 81
        // [DemoModel.Command.ID.ONOFF]          : this.onoff,   // 85
        // [DemoModel.Command.ID.RECLAIM]        : this.reclaim,   // 90
        // [DemoModel.Command.ID.CLOAK]          : this.cloak,   // 95
        // [DemoModel.Command.ID.STOCKPILE]      : this.stockpile,   // 100
        // [DemoModel.Command.ID.MANUALFIRE]     : this.manualfire,   // 105
        // [DemoModel.Command.ID.RESTORE]        : this.restore,   // 110
        // [DemoModel.Command.ID.REPEAT]         : this.repeat,   // 115
        // [DemoModel.Command.ID.TRAJECTORY]     : this.trajectory,   // 120
        // [DemoModel.Command.ID.RESURRECT]      : this.resurrect,   // 125
        // [DemoModel.Command.ID.CAPTURE]        : this.capture,   // 130
        // [DemoModel.Command.ID.AUTOREPAIRLEVEL]: this.autorepairlevel,  // 135
        // [DemoModel.Command.ID.IDLEMODE]       : this.idlemode,   // 145
        // [DemoModel.Command.ID.FAILED]         : this.failed,   // 150
    }

    public parseCommand(cmdId: DemoModel.Command.ID, optionBitmask: number, params: number[]) : DemoModel.Command.BaseCommand {
        // const commandHandler = this.commandHandlers[cmdId];
        // if (!commandHandler && this.config.verbose) {
        //     console.log(`No command handler found for command id: ${cmdId} (${DemoModel.Command.ID[cmdId]})`);
        //     console.log(params);
        // }
        //const data: Omit<DemoModel.Command.Type.Any, "rawValues"> = commandHandler ? commandHandler(params) : {};

        const id = Math.abs(cmdId);
        const cmdName = cmdId > 0 ? DemoModel.Command.ID[cmdId] : "UnitDefID";
        const options = this.parseOptionBitmask(optionBitmask);

        return { 
            id: [id, cmdName],
            options,
            rawData: params,
            //data
        };
    }

    protected parseOptionBitmask(optionBitmask: number) : DemoModel.Command.Options {
        return {
            META_KEY: (optionBitmask & 4) !== 0,
            INTERNAL_ORDER: (optionBitmask & 8) !== 0,
            RIGHT_MOUSE_KEY: (optionBitmask & 16) !== 0,
            SHIFT_KEY: (optionBitmask & 32) !== 0,
            CONTROL_KEY: (optionBitmask & 64) !== 0,
            ALT_KEY: (optionBitmask & 128) !== 0,
        };
    }

    // protected stop(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected insert(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }
    
    // protected remove(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected wait(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected timewait(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected deathwait(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected squadwait(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected gatherwait(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected move(params: number[]) : DemoModel.Command.Type.Pos {
    //     return { x: params[0], y: params[1], z: params[2] };
    // }

    // protected patrol(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected fight(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected attack(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected areaAttack(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected guard(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected aiselect(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected groupselect(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected groupadd(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected groupclear(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected repair(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected fireState(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected moveState(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected setbase(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected internal(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected selfd(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected loadUnits(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected loadOnto(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected unloadUnits(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected unloadUnit(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected onoff(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected reclaim(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected cloak(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected stockpile(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected manualfire(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected restore(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected repeat(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected trajectory(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected resurrect(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected capture(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected autorepairlevel(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected idlemode(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }

    // protected failed(params: number[]) : DemoModel.Command.Type.Empty {
    //     return {} as any;
    // }
}