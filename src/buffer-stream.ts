import { Readable } from "stream";
import { endianness } from "os";

export class BufferStream {
    public bufferLength: number;

    protected readStream: Readable;
    protected isBigEndian: boolean;

    constructor(buffer: Buffer, isBigEndian: boolean = endianness() === "BE") {
        this.bufferLength = buffer.length;
        this.isBigEndian = isBigEndian;

        this.readStream = new Readable();
        this.readStream.push(buffer);
        this.readStream.push(null);
    }

    public readString(size?: number, trimNulls = true) {
        const buffer = this.read(size);
        const i = buffer.indexOf(0x00);
        return trimNulls ? buffer.toString("utf8", 0, i) : buffer.toString("utf8");
    } 

    public readInt(size = 4, unsigned = false) : number {
        if (size > 4) {
            if (unsigned) {
                const bigint = this.isBigEndian ? this.read(size).readBigUInt64BE() : this.read(size).readBigUInt64LE();
                return Number(bigint);
            } else {
                const bigint = this.isBigEndian ? this.read(size).readBigUInt64BE() : this.read(size).readBigUInt64LE();
                return Number(bigint);
            }
        }

        if (unsigned) {
            return this.isBigEndian ? this.read(size).readUIntBE(0, size) : this.read(size).readUIntLE(0, size);
        } else {
            return this.isBigEndian ? this.read(size).readIntBE(0, size) : this.read(size).readIntLE(0, size);
        }
    }

    public readFloat() : number {
        return this.isBigEndian ? this.read(4).readFloatBE() : this.read(4).readFloatLE();
    }

    public read(size?: number) {
        return this.readStream.read(size) as Buffer;
    }

    public destroy() {
        this.readStream.destroy();
    }
}