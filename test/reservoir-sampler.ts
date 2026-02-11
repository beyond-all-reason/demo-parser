export type RandomFn = () => number; // returns [0, 1)

function xorshift32(seed: number): RandomFn {
    let state = seed >>> 0 || 1; // ensure non-zero
    return () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return (state >>> 0) / 0x100000000;
    };
}

export class ReservoirSampler<T> {
    private reservoir: T[] = [];
    private count = 0;
    private random: RandomFn;

    constructor(
    private readonly k: number,
    private seed?: number
    ) {
        if (k < 1) {
            throw new Error("k must be >= 1");
        }
        this.random = xorshift32(seed ?? Date.now());
    }

    push(item: T): void {
        this.count++;
        if (this.reservoir.length < this.k) {
            this.reservoir.push(item);
        } else {
            const j = Math.floor(this.random() * this.count);
            if (j < this.k) {
                this.reservoir[j] = item;
            }
        }
    }

    getSample(): T[] {
        return [...this.reservoir];
    }
}
