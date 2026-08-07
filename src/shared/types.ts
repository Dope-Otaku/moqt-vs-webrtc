// the three data kinds our pipeline carries. This union is the whole
// project thesis in one line: these have DIFFERENT priorities.
export type TrackKind = "video" | "audio" | "control";



// publisherPriority: lower Number = higer priority in MOQT.
// control (tool-calls/transcript) must survive; video degrades first.
export interface TrackConfig {
    kind: TrackKind;
    name: string;
    priority: number; // 0 == highest
    lossless: boolean;
}


// A single unit of data flowing publisher --> subscriber.
export interface Frame {
    kind: TrackKind;
    seq: number; // monotonic sequence number
    payload: Uint8Array; // raw bytes
    publishedAt: number; // Date.now() at publish, used for latency math
}


// both MOQT and webRTC will implement this interface.
// that's the abstraction that makes the benchmark fair.
export interface Transport {
    readonly name: "moqt" | "webrtc";
    publish(frame: Frame): Promise<void>;
    onFrame(handler: (frame: Frame) => void): void;
    close(): Promise<void>;
}

//MOQT protocol config

export interface MoqtOptions {
    relayUrl: string;
    namespace: string[]; //eg. ["moqt-vs-webrtc","run-1"]
    supportedVersions: number[];
}