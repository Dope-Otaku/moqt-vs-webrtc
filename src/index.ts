import "./shared/webtransport-polyfill.js";
import {MoqtTransport} from "./moqt/publisher.js";
import {MoqtSubscriberTransport} from "./moqt/subscriber.js";
import {LlmReasoner} from "./agent/reasoner.js";
import type {Frame, TrackConfig, MoqtOptions} from "./shared/types.js";



// the core hypothesis: defining three tracks with distinct properties.

const tracks: TrackConfig[] = [
    {kind: "control", name:"tool-calls", priority: 0, lossless: true},
    {kind: "audio", name:"voice", priority: 1, lossless: false},
    {kind: "video", name:"frames", priority: 2, lossless: false},
]

const moqt: MoqtOptions = {
    relayUrl: process.env.MOQT_RELAY_URL ?? "https://localhost:4433/moq",
    namespace: ["moqt-vs-webrtc","run-1"],
    supportedVersions: [1,2]
}

async function main(): Promise<void>{
    const subTransport = await MoqtSubscriberTransport.connect(moqt, tracks);
    const reasoner = new LlmReasoner({
        apiBaseUrl: process.env.LLM_API_BASE_URL ?? "https://api.openai.com",
        apiKey: process.env.LLM_API_KEY ?? "",
        model: process.env.LLM_MODEL ?? "gpt-3.5-turbo"
    });

    //subscriber listening here for delivered frames.
    subTransport.onFrame((frame:Frame) => void reasoner.handle(frame));


    const pubTransport = await MoqtTransport.connect(moqt, tracks);


    //publishing one frame of each kind, in order of priority.
    const enc = new TextEncoder();
    let seq = 0;
    for (let i =0; i<5; i++){
        await publish(pubTransport, "video", `frame ${i}: person detected, conf 0.9`, seq++, enc);
        await sleep(200)
        };

    await publish(pubTransport, "audio", "user said: what am i looking at?", seq++, enc);
    await publish(pubTransport, "control", "tool_call: describe_scene()", seq++, enc);

    //let async reasoning finish
    await sleep(2000);
    await pubTransport.close();
    await subTransport.close();
    console.log("Pipeline finished successfully -> phase 1");
}


function publish(
    t:MoqtTransport,
    kind: Frame["kind"],
    text: string,
    seq: number,
    enc: TextEncoder
): Promise<void>{
    return t.publish({kind, seq, payload: enc.encode(text), publishedAt: Date.now()})
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));


main().catch((err) => {
    console.error("Pipeline Failed at this part -->", err)
    process.exitCode = 1
})