export type PacketIntSize = 1|2|3|4;

export class BufferStream {
    public buffer: Buffer;
    public offset: number;

    constructor(buffer: Buffer) {
        this.buffer = buffer;
        this.offset = 0;
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
        let value: number;
        if (unsigned) {
            value = this.buffer.readUIntLE(this.offset, size);
        } else {
            value = this.buffer.readIntLE(this.offset, size);
        }
        this.offset += size;
        return value;
    }

    public readInts(amount: number, size: PacketIntSize = 4, unsigned = false): number[] {
        const nums: number[] = [];
        for (let i = 0; i < amount; i++) {
            nums.push(this.readInt(size, unsigned));
        }
        return nums;
    }

    public readBigInt(unsigned = false): bigint {
        let value: bigint;
        if (unsigned) {
            value = this.buffer.readBigUInt64LE(this.offset);
        } else {
            value = this.buffer.readBigInt64LE(this.offset);
        }
        this.offset += 8;
        return value;
    }

    public readFloat(): number {
        const value = this.buffer.readFloatLE(this.offset);
        this.offset += 4;
        return value;
    }

    public readFloats(amount: number): number[] {
        const nums: number[] = [];
        for (let i = 0; i < amount; i++) {
            nums.push(this.readFloat());
        }
        return nums;
    }

    public readUntilNull(): Buffer {
        const nullPos = this.buffer.indexOf(0x00, this.offset);
        if (nullPos === -1) {
            const slice = this.buffer.subarray(this.offset);
            this.offset = this.buffer.length;
            return slice;
        }
        const slice = this.buffer.subarray(this.offset, nullPos);
        this.offset = nullPos + 1;
        return slice;
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
