import { Frame, TrackConfig, Transport } from "../shared/types.js";


export class MoqtTransport implements Transport {
    readonly name = "moqt" as const;
    private handler: ((frame: Frame) => void) | null = null;

    constructor(public readonly tracks: TrackConfig[]) {}

    async publish(frame: Frame): Promise<void> {
        if (this.handler) this.handler(frame);
    }

    onFrame(handler: (frame:Frame) => void): void {
        this.handler= handler;
    }

    async close(): Promise<void> {
        this.handler = null;
    }
}