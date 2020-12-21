import { Readable, Writable } from "stream";
import { endianness } from "os";

export class BufferStream {
    public bufferLength: number;
    public readStream: Readable;
    public isBigEndian: boolean;

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

    public readInt(size: 1 | 2 | 3 | 4 = 4, unsigned = false) : number {
        if (unsigned) {
            return this.isBigEndian ? this.read(size).readUIntBE(0, size) : this.read(size).readUIntLE(0, size);
        } else {
            return this.isBigEndian ? this.read(size).readIntBE(0, size) : this.read(size).readIntLE(0, size);
        }
    }

    public readBigInt(unsigned = false) : bigint {
        if (unsigned) {
            return this.isBigEndian ? this.read(8).readBigUInt64BE() : this.read(8).readBigUInt64LE();
        } else {
            return this.isBigEndian ? this.read(8).readBigInt64BE() : this.read(8).readBigInt64LE();
        }
    }

    public readFloat() : number {
        return this.isBigEndian ? this.read(4).readFloatBE() : this.read(4).readFloatLE();
    }

    public readFloats(amount?: number) : number[] {
        const nums: number[] = [];
        if (!amount) {
            const buffer = this.readUntilNull();
            return this.readFloats(buffer.length);
        } else {
            for (let i=0; i<amount; i++){
                nums.push(this.readFloat());
            }
            return nums;
        }
    }

    public readUntilNull(writeBuffer: number[] = []) : Buffer {
        const byte = this.read(1)[0];
        if (byte === 0x00) {
            return Buffer.from(writeBuffer);
        } else {
            writeBuffer.push(byte);
            return this.readUntilNull(writeBuffer);
        }
    }

    public read(size?: number) {
        return this.readStream.read(size) as Buffer;
    }

    public destroy() {
        this.readStream.destroy();
    }
}