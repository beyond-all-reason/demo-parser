import { DemoParserConfig } from "./index";
import { BufferStream } from "./buffer-stream";

export interface LuaData {
    name: string;
    data: any;
}

export interface LuaHandler {
    name: string;
    parseStartIndex: number;
    validator: (str: string) => boolean;
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
        const handler = this.luaHandlers.find(handler => handler.validator(str));

        if (handler === undefined) {
            return buffer.toString("hex");
        }

        const name = handler.name;
        const data = handler.parser(buffer, str);

        return { name, data };
    }
}

export const standardLuaHandlers: LuaHandler[] = [
    {
        // https://github.com/beyond-all-reason/Beyond-All-Reason/blob/master/luarules/gadgets/cmd_mouse_pos_broadcast.lua#L80
        name: "MOUSE_POS_BROADCAST",
        parseStartIndex: 4,
        validator: (str) => str[0] === "£",
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
        parseStartIndex: 4,
        validator: (str) => str[0] === "@",
        parser: (buffer, str) => {
            const fps = Number(str.slice(3));
            return fps;
        }
    }
];