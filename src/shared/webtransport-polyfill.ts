import { WebTransport, quicheLoaded } from "@fails-components/webtransport";


await quicheLoaded;

if (typeof (globalThis as { WebTransport?: unknown }).WebTransport === "undefined") {
    (globalThis as { WebTransport?: unknown }).WebTransport = WebTransport;
}