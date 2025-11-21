import { BaseService } from "@/services/BaseService";
import { SendOptions } from "@/tools/options";

export interface GraphQLResponse<T = any> {
    data?: T;
    errors?: Array<{ message: string; [key: string]: any }>;
    extensions?: Record<string, any>;
}

export interface GraphQLRequestOptions extends SendOptions {
    operationName?: string;
    variables?: Record<string, any>;
}

export class GraphQLService extends BaseService {
    async query<T = any>(
        query: string,
        variables?: Record<string, any> | null,
        options?: GraphQLRequestOptions,
    ): Promise<GraphQLResponse<T>> {
        const { operationName, variables: optionVariables, ...sendOptions } =
            options || {};

        return this.client.send<GraphQLResponse<T>>("/api/graphql", {
            ...sendOptions,
            method: sendOptions.method || "POST",
            body: {
                query,
                operationName,
                variables: variables ?? optionVariables ?? {},
            },
        });
    }
}
