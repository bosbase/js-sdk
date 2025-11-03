import { BaseService } from "@/services/BaseService";
import { CommonOptions } from "@/tools/options";

interface appleClientSecret {
    secret: string;
}

export class SettingsService extends BaseService {
    /**
     * Fetch all available app settings.
     *
     * @throws {ClientResponseError}
     */
    async getAll(options?: CommonOptions): Promise<{ [key: string]: any }> {
        options = Object.assign(
            {
                method: "GET",
            },
            options,
        );

        return this.client.send("/api/settings", options);
    }

    /**
     * Bulk updates app settings.
     *
     * @throws {ClientResponseError}
     */
    async update(
        bodyParams?: { [key: string]: any } | FormData,
        options?: CommonOptions,
    ): Promise<{ [key: string]: any }> {
        options = Object.assign(
            {
                method: "PATCH",
                body: bodyParams,
            },
            options,
        );

        return this.client.send("/api/settings", options);
    }

    /**
     * Performs a S3 filesystem connection test.
     *
     * The currently supported `filesystem` are "storage" and "backups".
     *
     * @throws {ClientResponseError}
     */
    async testS3(
        filesystem: string = "storage",
        options?: CommonOptions,
    ): Promise<boolean> {
        options = Object.assign(
            {
                method: "POST",
                body: {
                    filesystem: filesystem,
                },
            },
            options,
        );

        return this.client.send("/api/settings/test/s3", options).then(() => true);
    }

    /**
     * Sends a test email.
     *
     * The possible `emailTemplate` values are:
     * - verification
     * - password-reset
     * - email-change
     *
     * @throws {ClientResponseError}
     */
    async testEmail(
        collectionIdOrName: string,
        toEmail: string,
        emailTemplate: string,
        options?: CommonOptions,
    ): Promise<boolean> {
        options = Object.assign(
            {
                method: "POST",
                body: {
                    email: toEmail,
                    template: emailTemplate,
                    collection: collectionIdOrName,
                },
            },
            options,
        );

        return this.client.send("/api/settings/test/email", options).then(() => true);
    }

    /**
     * Generates a new Apple OAuth2 client secret.
     *
     * @throws {ClientResponseError}
     */
    async generateAppleClientSecret(
        clientId: string,
        teamId: string,
        keyId: string,
        privateKey: string,
        duration: number,
        options?: CommonOptions,
    ): Promise<appleClientSecret> {
        options = Object.assign(
            {
                method: "POST",
                body: {
                    clientId,
                    teamId,
                    keyId,
                    privateKey,
                    duration,
                },
            },
            options,
        );

        return this.client.send("/api/settings/apple/generate-client-secret", options);
    }

    // -------------------------------------------------------------------
    // Settings Category Helpers
    // -------------------------------------------------------------------

    /**
     * Gets a specific settings category.
     * 
     * @param category - The settings category name (meta, smtp, s3, backups, batch, rateLimits, trustedProxy, logs)
     * @param options - Optional request options
     * @returns The settings category object
     * @throws {ClientResponseError}
     */
    async getCategory(category: string, options?: CommonOptions): Promise<any> {
        const allSettings = await this.getAll(options);
        return allSettings[category] || null;
    }

    /**
     * Updates the Meta configuration (app name, URL, sender info, etc.).
     * 
     * @param config - Meta configuration updates
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    async updateMeta(
        config: {
            appName?: string;
            appURL?: string;
            senderName?: string;
            senderAddress?: string;
            hideControls?: boolean;
        },
        options?: CommonOptions,
    ): Promise<{ [key: string]: any }> {
        return this.update({ meta: config }, options);
    }

    /**
     * Updates the SMTP email configuration.
     * 
     * @param config - SMTP configuration updates
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    async updateSMTP(
        config: {
            enabled?: boolean;
            host?: string;
            port?: number;
            username?: string;
            password?: string;
            authMethod?: string;
            tls?: boolean;
            localName?: string;
        },
        options?: CommonOptions,
    ): Promise<{ [key: string]: any }> {
        return this.update({ smtp: config }, options);
    }

    /**
     * Updates the S3 storage configuration.
     * 
     * @param config - S3 configuration updates
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    async updateS3(
        config: {
            enabled?: boolean;
            bucket?: string;
            region?: string;
            endpoint?: string;
            accessKey?: string;
            secret?: string;
            forcePathStyle?: boolean;
        },
        options?: CommonOptions,
    ): Promise<{ [key: string]: any }> {
        return this.update({ s3: config }, options);
    }

    // -------------------------------------------------------------------
    // Storage-Specific Helpers (S3 File Storage)
    // -------------------------------------------------------------------

    /**
     * Gets the current S3 storage configuration.
     * 
     * This is a convenience method specifically for file storage S3 configuration,
     * equivalent to calling getCategory("s3").
     * 
     * @param options - Optional request options
     * @returns S3 storage configuration object
     * @throws {ClientResponseError}
     */
    async getStorageS3(options?: CommonOptions): Promise<any> {
        return this.getCategory("s3", options);
    }

    /**
     * Updates the S3 storage configuration for file storage.
     * 
     * This is a convenience method specifically for file storage S3 configuration,
     * equivalent to calling updateS3().
     * 
     * @param config - S3 storage configuration updates
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    async updateStorageS3(
        config: {
            enabled?: boolean;
            bucket?: string;
            region?: string;
            endpoint?: string;
            accessKey?: string;
            secret?: string;
            forcePathStyle?: boolean;
        },
        options?: CommonOptions,
    ): Promise<{ [key: string]: any }> {
        return this.updateS3(config, options);
    }

    /**
     * Tests the S3 storage connection for file storage.
     * 
     * This is a convenience method that tests the "storage" filesystem,
     * equivalent to calling testS3("storage").
     * 
     * @param options - Optional request options
     * @returns true if connection test succeeds
     * @throws {ClientResponseError}
     */
    async testStorageS3(options?: CommonOptions): Promise<boolean> {
        return this.testS3("storage", options);
    }

    /**
     * Updates the Backups configuration (scheduling and S3 storage).
     * 
     * @param config - Backups configuration updates
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    async updateBackups(
        config: {
            cron?: string;
            cronMaxKeep?: number;
            s3?: {
                enabled?: boolean;
                bucket?: string;
                region?: string;
                endpoint?: string;
                accessKey?: string;
                secret?: string;
                forcePathStyle?: boolean;
            };
        },
        options?: CommonOptions,
    ): Promise<{ [key: string]: any }> {
        return this.update({ backups: config }, options);
    }

    /**
     * Updates the Batch request configuration.
     * 
     * @param config - Batch configuration updates
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    async updateBatch(
        config: {
            enabled?: boolean;
            maxRequests?: number;
            timeout?: number;
            maxBodySize?: number;
        },
        options?: CommonOptions,
    ): Promise<{ [key: string]: any }> {
        return this.update({ batch: config }, options);
    }

    /**
     * Updates the Rate Limits configuration.
     * 
     * @param config - Rate limits configuration updates
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    async updateRateLimits(
        config: {
            enabled?: boolean;
            rules?: Array<{
                label: string;
                audience?: string;
                duration: number;
                maxRequests: number;
            }>;
        },
        options?: CommonOptions,
    ): Promise<{ [key: string]: any }> {
        return this.update({ rateLimits: config }, options);
    }

    /**
     * Updates the Trusted Proxy configuration.
     * 
     * @param config - Trusted proxy configuration updates
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    async updateTrustedProxy(
        config: {
            headers?: Array<string>;
            useLeftmostIP?: boolean;
        },
        options?: CommonOptions,
    ): Promise<{ [key: string]: any }> {
        return this.update({ trustedProxy: config }, options);
    }

    /**
     * Updates the Logs configuration.
     * 
     * @param config - Logs configuration updates
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    async updateLogs(
        config: {
            maxDays?: number;
            minLevel?: number;
            logIP?: boolean;
            logAuthId?: boolean;
        },
        options?: CommonOptions,
    ): Promise<{ [key: string]: any }> {
        return this.update({ logs: config }, options);
    }
}
