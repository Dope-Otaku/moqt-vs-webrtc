import type {Frame} from "../shared/types.js"

export class Subscriber {
    private received = 0;

    handle(frame:Frame):void{
        const latencyMs = Date.now() - frame.publishedAt;
        this.received +=1
        console.log(`[recv #${this.received}] kind=${frame.kind} seq=${frame.seq}` +
            `bytes=${frame.payload.length} latency=${latencyMs}ms`
        )
    }
}