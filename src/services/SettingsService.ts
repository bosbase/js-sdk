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

    // -------------------------------------------------------------------
    // Mail-Specific Helpers (SMTP + Sender Info)
    // -------------------------------------------------------------------

    /**
     * Gets the current mail settings (both sender info from meta and SMTP configuration).
     * 
     * This is a convenience method that returns both the sender information (meta)
     * and SMTP configuration together, matching what's shown on the mail settings page.
     * 
     * @param options - Optional request options
     * @returns Object containing meta (senderName, senderAddress) and smtp configuration
     * @throws {ClientResponseError}
     */
    async getMailSettings(options?: CommonOptions): Promise<{
        meta?: {
            senderName?: string;
            senderAddress?: string;
        };
        smtp?: {
            enabled?: boolean;
            host?: string;
            port?: number;
            username?: string;
            password?: string;
            authMethod?: string;
            tls?: boolean;
            localName?: string;
        };
    }> {
        const allSettings = await this.getAll(options);
        return {
            meta: {
                senderName: allSettings.meta?.senderName,
                senderAddress: allSettings.meta?.senderAddress,
            },
            smtp: allSettings.smtp,
        };
    }

    /**
     * Updates mail settings (both sender info and SMTP configuration).
     * 
     * This is a convenience method that updates both the sender information (meta)
     * and SMTP configuration in a single call, matching the mail settings page behavior.
     * 
     * @param config - Mail settings updates (can include both sender info and SMTP config)
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    async updateMailSettings(
        config: {
            senderName?: string;
            senderAddress?: string;
            smtp?: {
                enabled?: boolean;
                host?: string;
                port?: number;
                username?: string;
                password?: string;
                authMethod?: string;
                tls?: boolean;
                localName?: string;
            };
        },
        options?: CommonOptions,
    ): Promise<{ [key: string]: any }> {
        const updateBody: { [key: string]: any } = {};

        if (config.senderName !== undefined || config.senderAddress !== undefined) {
            updateBody.meta = {};
            if (config.senderName !== undefined) {
                updateBody.meta.senderName = config.senderName;
            }
            if (config.senderAddress !== undefined) {
                updateBody.meta.senderAddress = config.senderAddress;
            }
        }

        if (config.smtp !== undefined) {
            updateBody.smtp = config.smtp;
        }

        return this.update(updateBody, options);
    }

    /**
     * Sends a test email with the configured SMTP settings.
     * 
     * This is a convenience method for testing email configuration.
     * The possible email template values are:
     * - verification
     * - password-reset
     * - email-change
     * - otp
     * - login-alert
     * 
     * @param toEmail - Email address to send the test email to
     * @param template - Email template to use (default: "verification")
     * @param collectionIdOrName - Collection ID or name (default: "_superusers")
     * @param options - Optional request options
     * @returns true if email was sent successfully
     * @throws {ClientResponseError}
     */
    async testMail(
        toEmail: string,
        template: string = "verification",
        collectionIdOrName: string = "_superusers",
        options?: CommonOptions,
    ): Promise<boolean> {
        return this.testEmail(collectionIdOrName, toEmail, template, options);
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

    // -------------------------------------------------------------------
    // Backup-Specific Helpers (Auto-Backup + S3 Storage)
    // -------------------------------------------------------------------

    /**
     * Gets the current backup settings (auto-backup schedule and S3 storage configuration).
     * 
     * This is a convenience method that returns backup configuration,
     * matching what's shown on the backups settings page.
     * 
     * @param options - Optional request options
     * @returns Object containing backup configuration (cron, cronMaxKeep, s3)
     * @throws {ClientResponseError}
     */
    async getBackupSettings(options?: CommonOptions): Promise<{
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
    }> {
        const allSettings = await this.getAll(options);
        return allSettings.backups || {};
    }

    /**
     * Updates backup settings (auto-backup schedule and S3 storage configuration).
     * 
     * This is a convenience method for managing backup configuration:
     * - Auto-backup cron schedule (leave empty to disable)
     * - Maximum number of backups to keep
     * - S3 storage configuration for backups
     * 
     * @param config - Backup settings updates
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    async updateBackupSettings(
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
        return this.updateBackups(config, options);
    }

    /**
     * Sets the auto-backup cron schedule.
     * 
     * @param cron - Cron expression (e.g., "0 0 * * *" for daily). Use empty string to disable.
     * @param cronMaxKeep - Maximum number of backups to keep (required if cron is set)
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    async setAutoBackupSchedule(
        cron: string,
        cronMaxKeep?: number,
        options?: CommonOptions,
    ): Promise<{ [key: string]: any }> {
        const config: any = { cron: cron || "" };
        if (cronMaxKeep !== undefined) {
            config.cronMaxKeep = cronMaxKeep;
        }
        return this.updateBackups(config, options);
    }

    /**
     * Disables auto-backup (removes cron schedule).
     * 
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    async disableAutoBackup(options?: CommonOptions): Promise<{ [key: string]: any }> {
        return this.updateBackups({ cron: "" }, options);
    }

    /**
     * Tests the S3 backups connection.
     * 
     * This is a convenience method that tests the "backups" filesystem,
     * equivalent to calling testS3("backups").
     * 
     * @param options - Optional request options
     * @returns true if connection test succeeds
     * @throws {ClientResponseError}
     */
    async testBackupsS3(options?: CommonOptions): Promise<boolean> {
        return this.testS3("backups", options);
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

    // -------------------------------------------------------------------
    // Log-Specific Helpers
    // -------------------------------------------------------------------

    /**
     * Gets the current log settings configuration.
     * 
     * This is a convenience method that returns log configuration,
     * matching what's shown on the logs settings panel.
     * 
     * @param options - Optional request options
     * @returns Object containing log configuration (maxDays, minLevel, logIP, logAuthId)
     * @throws {ClientResponseError}
     */
    async getLogSettings(options?: CommonOptions): Promise<{
        maxDays?: number;
        minLevel?: number;
        logIP?: boolean;
        logAuthId?: boolean;
    }> {
        const allSettings = await this.getAll(options);
        return allSettings.logs || {};
    }

    /**
     * Updates log settings configuration.
     * 
     * This is a convenience method for managing log configuration:
     * - Maximum days to retain logs
     * - Minimum log level
     * - Whether to log IP addresses
     * - Whether to log authentication IDs
     * 
     * @param config - Log settings updates
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    async updateLogSettings(
        config: {
            maxDays?: number;
            minLevel?: number;
            logIP?: boolean;
            logAuthId?: boolean;
        },
        options?: CommonOptions,
    ): Promise<{ [key: string]: any }> {
        return this.updateLogs(config, options);
    }

    /**
     * Sets the maximum number of days to retain logs.
     * 
     * @param maxDays - Maximum days to retain logs (0 or greater)
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    async setLogRetentionDays(
        maxDays: number,
        options?: CommonOptions,
    ): Promise<{ [key: string]: any }> {
        return this.updateLogs({ maxDays }, options);
    }

    /**
     * Sets the minimum log level.
     * 
     * Log levels:
     * - Negative values: Debug/Info levels
     * - 0: Default/Warning level
     * - Positive values: Error levels
     * 
     * Only logs at or above this level will be retained.
     * 
     * @param minLevel - Minimum log level (-100 to 100)
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    async setMinLogLevel(
        minLevel: number,
        options?: CommonOptions,
    ): Promise<{ [key: string]: any }> {
        return this.updateLogs({ minLevel }, options);
    }

    /**
     * Enables or disables IP address logging.
     * 
     * @param enabled - Whether to log IP addresses
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    async setLogIPAddresses(
        enabled: boolean,
        options?: CommonOptions,
    ): Promise<{ [key: string]: any }> {
        return this.updateLogs({ logIP: enabled }, options);
    }

    /**
     * Enables or disables authentication ID logging.
     * 
     * @param enabled - Whether to log authentication IDs
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    async setLogAuthIds(
        enabled: boolean,
        options?: CommonOptions,
    ): Promise<{ [key: string]: any }> {
        return this.updateLogs({ logAuthId: enabled }, options);
    }
}
