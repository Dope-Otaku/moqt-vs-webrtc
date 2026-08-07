import {MoqtTransport} from "./moqt/publisher.js";
import {Subscriber} from "./moqt/subscriber.js";
import type {Frame, TrackConfig} from "./shared/types.js";



// the core hypothesis: defining three tracks with distinct properties.

const tracks: TrackConfig[] = [
    {kind: "control", name:"tool-calls", priority: 0, lossless: true},
    {kind: "audio", name:"voice", priority: 1, lossless: false},
    {kind: "video", name:"frames", priority: 2, lossless: false},
]

async function main(): Promise<void>{
    const transport = new MoqtTransport(tracks);
    const subscriber = new Subscriber();

    //subscriber listening here for delivered frames.
    transport.onFrame((frame:Frame) => subscriber.handle(frame));


    //publishing one frame of each kind, in order of priority.
    const encoder = new TextEncoder();
    let seq = 0;
    for (const t of tracks){
        const frame: Frame = {
            kind: t.kind,
            seq: seq++,
            payload: encoder.encode(`hello coming from ${t.name}`),
            publishedAt: Date.now()
        };
        await transport.publish(frame);
    }
    await transport.close();
    console.log("initial setup done! let's start this shit")
}

main().catch((err) => {
    console.error("Pipeline Failed at this part -->", err)
    process.exitCode = 1
})