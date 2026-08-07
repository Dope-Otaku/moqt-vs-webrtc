import type {Frame} from "../shared/types.js";


interface ReasonerOptions {
    apiBaseUrl: string;
    apiKey: string;
    model: string;
}

export class LlmReasoner {
    private decoder = new TextDecoder();
    private latestVision: string | null = null;
    private received = 0;

    constructor(private readonly opts: ReasonerOptions) {}

    async handle(frame: Frame): Promise<void> {
        this.received+=1
        const latencyMs = Date.now() - frame.publishedAt;
        const text = this.decoder.decode(frame.payload);

        console.log(`Reasoner received frame #${frame.seq} of kind ${frame.kind} with payload length ${frame.payload.length} and latency ${latencyMs}ms`);

        if (frame.kind === "video") {
            this.latestVision = text;
            return;
        }

        const reply = await this.reason(text);
        console.log(
            `[reason #${this.received}] Reasoner received ${frame.kind} frame with payload: "${text}". Latest vision: "${this.latestVision}". Reply: "${reply}"`
        );
    }

    private async reason(trigger: string): Promise<string> {
        const res = await fetch(`${this.opts.apiBaseUrl}/v1/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.opts.apiKey}`
            },
            body: JSON.stringify({
                model: this.opts.model,
                messages: [
                    {role: "system",
                        content: "You are a helpful assistant that reasons about the world based on the latest vision and incoming audio/control data."
                    },
                    {
                        role: "user",
                        content: `Latest vision: "${this.latestVision ?? "<<no vision>>"}". Incoming trigger: "${trigger}". Please provide a concise reasoning response.`
                    }
                ]
            })
        });

        if (!res.ok) {
            throw new Error(`Reasoner API request failed with status ${res.status}`);
        }

        const data = (await res.json()) as {
            choices: Array<{message: {content:string}}>;
        }
        return data.choices[0]?.message.content ?? "<<empty>>";
    }
}