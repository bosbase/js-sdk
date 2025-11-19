import { BaseService } from "@/services/BaseService";
import { SendOptions } from "@/tools/options";
import {
    LangChaingoCompletionRequest,
    LangChaingoCompletionResponse,
    LangChaingoRAGRequest,
    LangChaingoRAGResponse,
    LangChaingoDocumentQueryRequest,
    LangChaingoDocumentQueryResponse,
} from "@/tools/langchaingo-types";

export class LangChaingoService extends BaseService {
    private basePath(): string {
        return "/api/langchaingo";
    }

    /**
     * Invokes `/api/langchaingo/completions`.
     */
    async completions(
        payload: LangChaingoCompletionRequest,
        options: SendOptions = {},
    ): Promise<LangChaingoCompletionResponse> {
        return this.client.send(`${this.basePath()}/completions`, {
            method: "POST",
            body: payload,
            ...options,
        });
    }

    /**
     * Invokes `/api/langchaingo/rag`.
     */
    async rag(
        payload: LangChaingoRAGRequest,
        options: SendOptions = {},
    ): Promise<LangChaingoRAGResponse> {
        return this.client.send(`${this.basePath()}/rag`, {
            method: "POST",
            body: payload,
            ...options,
        });
    }

    /**
     * Invokes `/api/langchaingo/documents/query`.
     */
    async queryDocuments(
        payload: LangChaingoDocumentQueryRequest,
        options: SendOptions = {},
    ): Promise<LangChaingoDocumentQueryResponse> {
        return this.client.send(`${this.basePath()}/documents/query`, {
            method: "POST",
            body: payload,
            ...options,
        });
    }
}
