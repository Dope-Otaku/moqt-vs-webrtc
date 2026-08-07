import {MOQtailClient} from "moqtail/client";
import { Frame, TrackConfig, Transport, MoqtOptions, TrackKind } from "../shared/types.js";

export class MoqtSubscriberTransport implements Transport {
    readonly name = "moqt" as const;
    private client: MOQtailClient | null = null
    private handler: ((frame: Frame) => void) | null = null;

    private constructor(
        private readonly opts: MoqtOptions,
        public readonly tracks: TrackConfig[]) {}

    static async connect(opts: MoqtOptions, tracks: TrackConfig[]): Promise<MoqtSubscriberTransport> {
        const t = new MoqtSubscriberTransport(opts, tracks);
        t.client = await MOQtailClient.new({
            url: opts.relayUrl,
            supportedVersions: opts.supportedVersions,
            enableDatagrams: true,
            dataStreamTimeoutMs: 5000,
            controlScreenTimeoutMs: 5000
        });
        return t;
    }

    publish(_frame: Frame): Promise<void> {
        throw new Error("Subscriber transport does not publish frames");
    }

    onFrame(handler: (frame: Frame) => void): void {
        this.handler = handler;
        if (!this.client) throw new Error("Moqtail client not connected");
        for (const cfg of this.tracks) void this.pump(cfg);
    }

    private async pump(cfg: TrackConfig): Promise<void> {
        if (!this.client) throw new Error("Moqtail client not connected");
        const sub = await this.client.subscribe({
            namespace: this.opts.namespace,
            trackName: cfg.name
        })
        for await (const chunk of sub.receiver){
            const publishedAt = (chunk as {extensions?: {publishedAt?: number}}).extensions?.publishedAt ?? Date.now();
            const frame: Frame = {
                kind: cfg.kind as TrackKind,
                seq: (chunk as {groupId: number}).groupId,
                payload: (chunk as {payload: Uint8Array}).payload,
                publishedAt,
            }
            if (this.handler) this.handler(frame);
        }
    }
    async close(): Promise<void> {
        await this.client?.close?.();
        this.client = null;
    }
}