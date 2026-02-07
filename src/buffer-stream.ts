export type PacketIntSize = 1|2|3|4;

export class BufferStream {
    public buffer: Buffer;
    public offset: number;
    public isBigEndian: boolean;

    constructor(buffer: Buffer, isBigEndian = false) {
        this.buffer = buffer;
        this.offset = 0;
        this.isBigEndian = isBigEndian;
    }

    public get remaining(): number {
        return this.buffer.length - this.offset;
    }

    public readString(size?: number, trimNulls = true): string {
        const data = this.read(size);
        const str = data.toString();
        if (trimNulls) {
            return str.replace(/\0/g, "");
        }
        return str;
    }

    public readInt(size: PacketIntSize = 4, unsigned = false): number {
        let val: number;
        if (unsigned) {
            val = this.isBigEndian
                ? this.buffer.readUIntBE(this.offset, size)
                : this.buffer.readUIntLE(this.offset, size);
        } else {
            val = this.isBigEndian
                ? this.buffer.readIntBE(this.offset, size)
                : this.buffer.readIntLE(this.offset, size);
        }
        this.offset += size;
        return val;
    }

    public readInts(amount: number, size: PacketIntSize = 4, unsigned = false): number[] {
        const nums: number[] = [];
        for (let i = 0; i < amount; i++) {
            nums.push(this.readInt(size, unsigned));
        }
        return nums;
    }

    public readBigInt(unsigned = false): bigint {
        let val: bigint;
        if (unsigned) {
            val = this.isBigEndian
                ? this.buffer.readBigUInt64BE(this.offset)
                : this.buffer.readBigUInt64LE(this.offset);
        } else {
            val = this.isBigEndian
                ? this.buffer.readBigInt64BE(this.offset)
                : this.buffer.readBigInt64LE(this.offset);
        }
        this.offset += 8;
        return val;
    }

    public readFloat(): number {
        const val = this.isBigEndian
            ? this.buffer.readFloatBE(this.offset)
            : this.buffer.readFloatLE(this.offset);
        this.offset += 4;
        return val;
    }

    public readFloats(amount: number): number[] {
        const nums: number[] = [];
        for (let i = 0; i < amount; i++) {
            nums.push(this.readFloat());
        }
        return nums;
    }

    public readUntilNull(): Buffer {
        const start = this.offset;
        while (this.offset < this.buffer.length && this.buffer[this.offset] !== 0) {
            this.offset++;
        }
        const result = this.buffer.subarray(start, this.offset);
        this.offset++; // skip null byte
        return result;
    }

    public readIntFloatPairs(): number[][] {
        const options: number[][] = [];
        const size = this.remaining / 8;
        for (let i = 0; i < size; i++) {
            const key = this.readInt();
            const val = this.readFloat();
            options.push([key, val]);
        }
        return options;
    }

    public readBool(): boolean {
        const int = this.readInt(1, true);
        return Boolean(int);
    }

    public read(size?: number): Buffer {
        if (size === undefined) {
            const result = this.buffer.subarray(this.offset);
            this.offset = this.buffer.length;
            return result;
        }
        const result = this.buffer.subarray(this.offset, this.offset + size);
        this.offset += size;
        return result;
    }
}
