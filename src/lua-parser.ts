import { BufferStream } from "./buffer-stream";
import { DemoParserConfig } from "./demo-parser";

export interface LuaData {
    name: string;
    data: any;
}

export interface LuaHandler {
    name: string;
    parseStartIndex: number;
    validator: (buffer: Buffer, str: string) => boolean;
    parser: (buffer: Buffer, str: string) => any;
}

export class LuaParser {
    protected config: DemoParserConfig;
    protected luaHandlers: LuaHandler[] = [];

    constructor(config: DemoParserConfig) {
        this.config = config;

        this.luaHandlers = standardLuaHandlers.concat(config.customLuaHandlers!);
    }

    public parseLuaData(buffer: Buffer) : LuaData | string {
        const str = buffer.toString();

        const handler = this.luaHandlers.find(handler => handler.validator(buffer, str));

        if (handler === undefined) {
            return str;
        }

        const name = handler.name;

        try {
            const data = handler.parser(buffer.slice(handler.parseStartIndex), str.slice(handler.parseStartIndex));
            return { name, data };
        } catch (err) {
            if (this.config.verbose) {
                console.error(`Failed to parse Lua msg: ${name}`);
                console.error(err);
            }
            return str;
        }
    }
}

export const standardLuaHandlers: LuaHandler[] = [
    {
        // https://github.com/beyond-all-reason/Beyond-All-Reason/blob/master/luarules/gadgets/cmd_mouse_pos_broadcast.lua#L80
        name: "MOUSE_POS_BROADCAST",
        parseStartIndex: 0,
        validator: (buffer, str) => str[0] === "£",
        parser: (buffer, str) => {
            const click = str.substr(3, 1) === "1"; // not seen this be true yet, but store it anyway
            const posBuffer = new BufferStream(buffer.slice(5));
            const numMousePos = posBuffer.readStream.readableLength / 4;
            const positions: Array<{x: number, z: number}> = [];
            for (let i=0; i<numMousePos; i++) {
                const x = posBuffer.readInt(2, true);
                const z = posBuffer.readInt(2, true);
                positions.push({ x, z });
            }
            return { click, positions };
        }
    },
    {
        // https://github.com/beyond-all-reason/Beyond-All-Reason/blob/master/luarules/gadgets/fps_broadcast.lua#L37
        name: "FPS_BROADCAST",
        parseStartIndex: 0,
        validator: (buffer, str) => str[0] === "@",
        parser: (buffer, str) => {
            const fps = Number(str.slice(3));
            return fps;
        }
    },
    {
        // https://github.com/beyond-all-reason/Beyond-All-Reason/blob/master/luarules/gadgets/gui_awards.lua#L581
        name: "AWARDS",
        parseStartIndex: 0,
        validator: (buffer, str) => buffer[0] === 0xa1,
        parser: (buffer, str) => {
            const parts = str.split("�").filter(Boolean).map(pairStr => {
                const [ teamId, value ] = pairStr.split(":").map(str => Number(str));
                return { teamId: teamId - 1, value };
            });

            return {
                econDestroyed: [ parts.shift(), parts.shift(), parts.shift() ],
                fightingUnitsDestroyed: [ parts.shift(), parts.shift(), parts.shift() ],
                resourceEfficiency: [ parts.shift(), parts.shift(), parts.shift() ],
                cow: parts.shift(),
                mostResourcesProduced: parts.shift(),
                mostDamageTaken: parts.shift(),
                sleep: parts.shift()
            };
        }
    },
    {
        // https://github.com/beyond-all-reason/Beyond-All-Reason/blob/master/luaui/Widgets_BAR/gui_factionpicker.lua
        name: "FACTION_PICKER",
        parseStartIndex: 1,
        validator: (buffer, str) => buffer[0] === 0x8a,
        parser: (buffer, str) => {
            return str === "542" ? "Cortex" : "Armada";
        }
    }
];