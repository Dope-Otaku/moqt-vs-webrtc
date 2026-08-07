import {MOQtailClient} from "moqtail/client";
import { Frame, TrackConfig, Transport, MoqtOptions } from "../shared/types.js";

export class MoqtTransport implements Transport {
    readonly name = "moqt" as const;
    private client: MOQtailClient | null = null;
    private writers = new Map<string, {write: (obj:unknown) =>Promise<void>}>();

    private constructor(
        private readonly opts: MoqtOptions,
        public readonly tracks: TrackConfig[]) {}

    
    //async factory method to create a MoqtTransport instance
    static async connect(opts: MoqtOptions, tracks: TrackConfig[]): Promise<MoqtTransport> {
        const t = new MoqtTransport(opts, tracks);
        t.client = await MOQtailClient.new({
            url: opts.relayUrl,
            supportedVersions: opts.supportedVersions,
            enableDatagrams: true,
            dataStreamTimeoutMs: 5000,
            controlScreenTimeoutMs: 5000
        });
        await t.client.announcedNamespaces(opts.namespace);
        return t;
    }

    private async writerFor(cfg: TrackConfig){
        const exisiting = this.writers.get(cfg.name);
        if (exisiting) return exisiting;
        if (!this.client) throw new Error("Moqtail client not connected");

        // reliable stream for lossless control
        const track = await this.client.publish({
            namespace: this.opts.namespace,
            trackName: cfg.name,

            //priority + delivery mode
            // publisherPriority: cfg.priority,
            // forwardingPrefference: cfg.lossless ? "reliable" : "unreliable"
        })


        const w = track.writer;
        this.writers.set(cfg.name, w);
        return w;
    }

    async publish(frame: Frame): Promise<void> {
        const cfg = this.tracks.find(t => t.kind === frame.kind);
        if (!cfg) throw new Error(`No track config found for kind ${frame.kind}`);
        const writer = await this.writerFor(cfg);
        await writer.write({
            groupId: frame.seq,
            objectId: 0,
            payload: frame.payload,
            extensions: {publishedAt: frame.publishedAt}
        });
    }
    
    // publisher side should not receive 
    onFrame(_handler: (frame: Frame)=> void): void {}

    async close(): Promise<void> {
        this.writers.clear();
        await this.client?.close?.();
        this.client = null;
    }
}