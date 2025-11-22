import Client from "@/Client";
import { BaseService } from "@/services/BaseService";
import { ClientResponseError } from "@/ClientResponseError";

export interface PubSubMessage<T = any> {
    id: string;
    topic: string;
    created: string;
    data: T;
}

export interface PublishAck {
    id: string;
    topic: string;
    created: string;
}

type PendingResolver<T> = {
    resolve: (value: T) => void;
    reject: (reason: any) => void;
    timer?: any;
};

export class PubSubService extends BaseService {
    private socket: WebSocket | null = null;
    private pendingConnects: Array<PendingResolver<void>> = [];
    private pendingAcks: Map<string, PendingResolver<any>> = new Map();
    private subscriptions: Record<string, Set<(msg: PubSubMessage) => void>> = {};
    private reconnectAttempts = 0;
    private reconnectTimeoutId: any;
    private connectTimeoutId: any;
    private manualClose = false;
    private readonly maxConnectTimeout = 15000;
    private readonly ackTimeoutMs = 10000;
    private readonly predefinedReconnectIntervals: Array<number> = [
        200, 300, 500, 1000, 1200, 1500, 2000,
    ];
    private readonly maxReconnectAttempts = Infinity;

    constructor(client: Client) {
        super(client);
    }

    /**
     * Indicates whether the websocket is connected.
     */
    get isConnected(): boolean {
        return !!this.socket && this.socket.readyState === WebSocket.OPEN;
    }

    /**
     * Publish a message to a topic. Resolves when the server acknowledges it.
     */
    async publish<T = any>(topic: string, data: T): Promise<PublishAck> {
        if (!topic) {
            throw new Error("topic must be set.");
        }

        await this.ensureSocket();

        const requestId = this.nextRequestId();
        const ackPromise = this.waitForAck<PublishAck>(requestId, (payload) => ({
            id: payload?.id,
            topic: payload?.topic || topic,
            created: payload?.created,
        }));

        await this.sendEnvelope({
            type: "publish",
            topic: topic,
            data,
            requestId,
        });

        return ackPromise;
    }

    /**
     * Subscribe to a topic. Returns an async unsubscribe function.
     */
    async subscribe(
        topic: string,
        callback: (data: PubSubMessage) => void,
    ): Promise<() => Promise<void>> {
        if (!topic) {
            throw new Error("topic must be set.");
        }

        let isFirstListener = false;
        if (!this.subscriptions[topic]) {
            this.subscriptions[topic] = new Set();
            isFirstListener = true;
        }
        this.subscriptions[topic].add(callback);

        await this.ensureSocket();

        if (isFirstListener) {
            const requestId = this.nextRequestId();
            const ackPromise = this.waitForAck<boolean>(requestId).catch(() => {});
            await this.sendEnvelope({
                type: "subscribe",
                topic: topic,
                requestId,
            });
            await ackPromise;
        }

        return async () => {
            this.subscriptions[topic]?.delete(callback);
            if (this.subscriptions[topic]?.size === 0) {
                delete this.subscriptions[topic];
                await this.sendUnsubscribe(topic);
            }

            if (!this.hasSubscriptions()) {
                this.disconnect();
            }
        };
    }

    /**
     * Unsubscribe from a specific topic or from all topics.
     */
    async unsubscribe(topic?: string): Promise<void> {
        if (topic) {
            delete this.subscriptions[topic];
            await this.sendUnsubscribe(topic);
        } else {
            this.subscriptions = {};
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                await this.sendEnvelope({ type: "unsubscribe" });
            }
            this.disconnect();
        }
    }

    /**
     * Close the websocket connection and clear pending requests.
     */
    disconnect(): void {
        this.manualClose = true;
        this.rejectAllPending(new Error("pubsub connection closed"));
        this.closeSocket();
        this.pendingConnects = [];
    }

    private hasSubscriptions(): boolean {
        return Object.keys(this.subscriptions).length > 0;
    }

    private buildWebSocketURL(): string {
        const raw = this.client.buildURL("/api/pubsub");
        let url: URL;

        try {
            url = new URL(
                raw,
                typeof window !== "undefined" ? window.location.href : "http://localhost",
            );
        } catch {
            url = new URL("http://localhost");
        }

        const token = this.client.authStore?.token;
        if (token) {
            url.searchParams.set("token", token);
        }

        if (url.protocol === "https:") {
            url.protocol = "wss:";
        } else if (url.protocol === "http:") {
            url.protocol = "ws:";
        } else if (!url.protocol || url.protocol === ":") {
            url.protocol = "ws:";
        }

        return url.toString();
    }

    private nextRequestId(): string {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    private async ensureSocket(): Promise<void> {
        if (this.isConnected) {
            return;
        }

        return new Promise((resolve, reject) => {
            this.pendingConnects.push({ resolve, reject });

            if (this.pendingConnects.length > 1) {
                return;
            }

            this.initConnect();
        });
    }

    private initConnect() {
        this.closeSocket(true);
        this.manualClose = false;

        let url: string;
        try {
            url = this.buildWebSocketURL();
        } catch (err: any) {
            this.connectErrorHandler(err);
            return;
        }

        if (typeof WebSocket === "undefined") {
            this.connectErrorHandler(
                new Error("WebSocket is not available in this runtime environment."),
            );
            return;
        }

        try {
            this.socket = new WebSocket(url);
        } catch (err: any) {
            this.connectErrorHandler(err);
            return;
        }

        clearTimeout(this.connectTimeoutId);
        this.connectTimeoutId = setTimeout(() => {
            this.connectErrorHandler(new Error("WebSocket connect took too long."));
        }, this.maxConnectTimeout);

        this.socket.onmessage = (event) => this.handleMessage(event.data);
        this.socket.onerror = () => {
            this.connectErrorHandler(
                new ClientResponseError("WebSocket connection failed."),
            );
        };
        this.socket.onclose = () => {
            this.handleClose();
        };
    }

    private handleMessage(payload: any) {
        clearTimeout(this.connectTimeoutId);

        if (typeof payload !== "string") {
            return;
        }

        let data: any = null;
        try {
            data = JSON.parse(payload);
        } catch {
            return;
        }

        switch (data?.type) {
            case "ready":
                this.handleConnected();
                break;
            case "message": {
                const topic = data.topic || "";
                const listeners = this.subscriptions[topic];
                if (!listeners) {
                    return;
                }
                const message: PubSubMessage = {
                    id: data.id,
                    topic: topic,
                    created: data.created,
                    data: data.data,
                };
                listeners.forEach((cb) => {
                    try {
                        cb(message);
                    } catch (_) {}
                });
                break;
            }
            case "published":
            case "subscribed":
            case "unsubscribed":
            case "pong":
                this.resolvePending(data.requestId, data);
                break;
            case "error": {
                const err = new Error(data.message || "pubsub error");
                if (data.requestId) {
                    this.rejectPending(data.requestId, err);
                }
                break;
            }
            default:
                break;
        }
    }

    private handleConnected() {
        const shouldResubscribe = this.reconnectAttempts > 0;
        this.reconnectAttempts = 0;
        clearTimeout(this.reconnectTimeoutId);
        clearTimeout(this.connectTimeoutId);

        for (let p of this.pendingConnects) {
            p.resolve();
        }
        this.pendingConnects = [];

        if (shouldResubscribe) {
            Object.keys(this.subscriptions).forEach((topic) => {
                const requestId = this.nextRequestId();
                this.sendEnvelope({
                    type: "subscribe",
                    topic,
                    requestId,
                });
            });
        }
    }

    private handleClose() {
        this.socket = null;

        if (this.manualClose) {
            return;
        }

        this.rejectAllPending(new Error("pubsub connection closed"));

        if (!this.hasSubscriptions()) {
            this.pendingConnects = [];
            return;
        }

        const timeout =
            this.predefinedReconnectIntervals[this.reconnectAttempts] ||
            this.predefinedReconnectIntervals[this.predefinedReconnectIntervals.length - 1];
        if (this.reconnectAttempts <= this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            clearTimeout(this.reconnectTimeoutId);
            this.reconnectTimeoutId = setTimeout(() => this.initConnect(), timeout);
        }
    }

    private async sendEnvelope(data: any): Promise<void> {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            await this.ensureSocket();
        }

        if (!this.socket) {
            throw new Error("Unable to send websocket message - socket not initialized.");
        }

        this.socket.send(JSON.stringify(data));
    }

    private async sendUnsubscribe(topic: string): Promise<void> {
        if (!this.socket) {
            return;
        }

        const requestId = this.nextRequestId();
        const ackPromise = this.waitForAck<boolean>(requestId).catch(() => {});
        await this.sendEnvelope({
            type: "unsubscribe",
            topic,
            requestId,
        });
        await ackPromise;
    }

    private connectErrorHandler(err: any) {
        clearTimeout(this.connectTimeoutId);

        if (this.reconnectAttempts > this.maxReconnectAttempts || this.manualClose) {
            for (let p of this.pendingConnects) {
                p.reject(new ClientResponseError(err));
            }
            this.pendingConnects = [];
            this.closeSocket();
            return;
        }

        this.closeSocket(true);
        const timeout =
            this.predefinedReconnectIntervals[this.reconnectAttempts] ||
            this.predefinedReconnectIntervals[this.predefinedReconnectIntervals.length - 1];
        this.reconnectAttempts++;
        clearTimeout(this.reconnectTimeoutId);
        this.reconnectTimeoutId = setTimeout(() => this.initConnect(), timeout);
    }

    private closeSocket(keepSubscriptions = false) {
        if (this.socket) {
            try {
                this.socket.onclose = null;
                this.socket.onerror = null;
                this.socket.onmessage = null;
                this.socket.close();
            } catch (_) {}
        }
        this.socket = null;

        clearTimeout(this.connectTimeoutId);
        clearTimeout(this.reconnectTimeoutId);

        if (!keepSubscriptions) {
            this.subscriptions = {};
            this.pendingAcks.clear();
        }
    }

    private waitForAck<T = any>(
        requestId: string,
        mapper?: (payload: any) => T,
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pendingAcks.delete(requestId);
                reject(new Error("Timed out waiting for pubsub response."));
            }, this.ackTimeoutMs);

            this.pendingAcks.set(requestId, {
                resolve: (payload: any) => {
                    clearTimeout(timer);
                    this.pendingAcks.delete(requestId);
                    resolve(mapper ? mapper(payload) : (payload as T));
                },
                reject: (err: any) => {
                    clearTimeout(timer);
                    this.pendingAcks.delete(requestId);
                    reject(err);
                },
            });
        });
    }

    private resolvePending(requestId: string, payload: any) {
        const pending = requestId ? this.pendingAcks.get(requestId) : null;
        pending?.resolve(payload);
    }

    private rejectPending(requestId: string, err: any) {
        const pending = requestId ? this.pendingAcks.get(requestId) : null;
        pending?.reject(err);
    }

    private rejectAllPending(err: any) {
        for (let pending of this.pendingAcks.values()) {
            pending.reject(err);
        }
        this.pendingAcks.clear();

        for (let p of this.pendingConnects) {
            p.reject(err);
        }
        this.pendingConnects = [];
    }
}
