interface ParseOptions {
    decode?: (val: string) => string;
}
/**
 * Parses the given cookie header string into an object
 * The object has the various cookies as keys(names) => values
 */
declare function cookieParse(str: string, options?: ParseOptions): {
    [key: string]: any;
};
interface SerializeOptions {
    encode?: (val: string | number | boolean) => string;
    maxAge?: number;
    domain?: string;
    path?: string;
    expires?: Date;
    httpOnly?: boolean;
    secure?: boolean;
    priority?: string;
    sameSite?: boolean | string;
}
/**
 * Serialize data into a cookie header.
 *
 * Serialize the a name value pair into a cookie string suitable for
 * http headers. An optional options object specified cookie parameters.
 *
 * ```js
 * cookieSerialize('foo', 'bar', { httpOnly: true }) // "foo=bar; httpOnly"
 * ```
 */
declare function cookieSerialize(name: string, val: string, options?: SerializeOptions): string;
interface ListResult<T> {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
    items: Array<T>;
}
interface BaseModel {
    [key: string]: any;
    id: string;
}
interface LogModel extends BaseModel {
    level: string;
    message: string;
    created: string;
    updated: string;
    data: {
        [key: string]: any;
    };
}
interface RecordModel extends BaseModel {
    collectionId: string;
    collectionName: string;
    expand?: {
        [key: string]: any;
    };
}
// -------------------------------------------------------------------
// Collection types
// -------------------------------------------------------------------
interface CollectionField {
    [key: string]: any;
    id: string;
    name: string;
    type: string;
    system: boolean;
    hidden: boolean;
    presentable: boolean;
}
interface TokenConfig {
    duration: number;
    secret?: string;
}
interface AuthAlertConfig {
    enabled: boolean;
    emailTemplate: EmailTemplate;
}
interface OTPConfig {
    enabled: boolean;
    duration: number;
    length: number;
    emailTemplate: EmailTemplate;
}
interface MFAConfig {
    enabled: boolean;
    duration: number;
    rule: string;
}
interface PasswordAuthConfig {
    enabled: boolean;
    identityFields: Array<string>;
}
interface OAuth2Provider {
    pkce?: boolean;
    clientId: string;
    name: string;
    clientSecret: string;
    authURL: string;
    tokenURL: string;
    userInfoURL: string;
    displayName: string;
    extra?: {
        [key: string]: any;
    };
}
interface OAuth2Config {
    enabled: boolean;
    mappedFields: {
        [key: string]: string;
    };
    providers: Array<OAuth2Provider>;
}
interface EmailTemplate {
    subject: string;
    body: string;
}
interface collection extends BaseModel {
    name: string;
    fields: Array<CollectionField>;
    indexes: Array<string>;
    system: boolean;
    listRule?: string;
    viewRule?: string;
    createRule?: string;
    updateRule?: string;
    deleteRule?: string;
}
interface BaseCollectionModel extends collection {
    type: "base";
}
interface ViewCollectionModel extends collection {
    type: "view";
    viewQuery: string;
}
interface AuthCollectionModel extends collection {
    type: "auth";
    authRule?: string;
    manageRule?: string;
    authAlert: AuthAlertConfig;
    oauth2: OAuth2Config;
    passwordAuth: PasswordAuthConfig;
    mfa: MFAConfig;
    otp: OTPConfig;
    authToken: TokenConfig;
    passwordResetToken: TokenConfig;
    emailChangeToken: TokenConfig;
    verificationToken: TokenConfig;
    fileToken: TokenConfig;
    verificationTemplate: EmailTemplate;
    resetPasswordTemplate: EmailTemplate;
    confirmEmailChangeTemplate: EmailTemplate;
}
type CollectionModel = BaseCollectionModel | ViewCollectionModel | AuthCollectionModel;
// -------------------------------------------------------------------
// Schema types
// -------------------------------------------------------------------
/**
 * Collection field schema information.
 * Used for simplified schema queries that return only field names, types, and basic metadata.
 */
interface CollectionFieldSchemaInfo {
    name: string;
    type: string;
    required?: boolean;
    system?: boolean;
    hidden?: boolean;
}
/**
 * Collection schema information.
 * Used for simplified schema queries that return only collection structure information.
 */
interface CollectionSchemaInfo {
    name: string;
    type: string;
    fields: Array<CollectionFieldSchemaInfo>;
}
type AuthRecord = RecordModel | null;
type AuthModel = AuthRecord; // for backward compatibility
// for backward compatibility
type OnStoreChangeFunc = (token: string, record: AuthRecord) => void;
/**
 * Base AuthStore class that stores the auth state in runtime memory (aka. only for the duration of the store instane).
 *
 * Usually you wouldn't use it directly and instead use the builtin LocalAuthStore, AsyncAuthStore
 * or extend it with your own custom implementation.
 */
declare class BaseAuthStore {
    protected baseToken: string;
    protected baseModel: AuthRecord;
    private _onChangeCallbacks;
    /**
     * Retrieves the stored token (if any).
     */
    get token(): string;
    /**
     * Retrieves the stored model data (if any).
     */
    get record(): AuthRecord;
    /**
     * @deprecated use `record` instead.
     */
    get model(): AuthRecord;
    /**
     * Loosely checks if the store has valid token (aka. existing and unexpired exp claim).
     */
    get isValid(): boolean;
    /**
     * Loosely checks whether the currently loaded store state is for superuser.
     *
     * Alternatively you can also compare directly `pb.authStore.record?.collectionName`.
     */
    get isSuperuser(): boolean;
    /**
     * @deprecated use `isSuperuser` instead or simply check the record.collectionName property.
     */
    get isAdmin(): boolean;
    /**
     * @deprecated use `!isSuperuser` instead or simply check the record.collectionName property.
     */
    get isAuthRecord(): boolean;
    /**
     * Saves the provided new token and model data in the auth store.
     */
    save(token: string, record?: AuthRecord): void;
    /**
     * Removes the stored token and model data form the auth store.
     */
    clear(): void;
    /**
     * Parses the provided cookie string and updates the store state
     * with the cookie's token and model data.
     *
     * NB! This function doesn't validate the token or its data.
     * Usually this isn't a concern if you are interacting only with the
     * BosBase API because it has the proper server-side security checks in place,
     * but if you are using the store `isValid` state for permission controls
     * in a node server (eg. SSR), then it is recommended to call `authRefresh()`
     * after loading the cookie to ensure an up-to-date token and model state.
     * For example:
     *
     * ```js
     * pb.authStore.loadFromCookie("cookie string...");
     *
     * try {
     *     // get an up-to-date auth store state by veryfing and refreshing the loaded auth model (if any)
     *     pb.authStore.isValid && await pb.collection('users').authRefresh();
     * } catch (_) {
     *     // clear the auth store on failed refresh
     *     pb.authStore.clear();
     * }
     * ```
     */
    loadFromCookie(cookie: string, key?: string): void;
    /**
     * Exports the current store state as cookie string.
     *
     * By default the following optional attributes are added:
     * - Secure
     * - HttpOnly
     * - SameSite=Strict
     * - Path=/
     * - Expires={the token expiration date}
     *
     * NB! If the generated cookie exceeds 4096 bytes, this method will
     * strip the model data to the bare minimum to try to fit within the
     * recommended size in https://www.rfc-editor.org/rfc/rfc6265#section-6.1.
     */
    exportToCookie(options?: SerializeOptions, key?: string): string;
    /**
     * Register a callback function that will be called on store change.
     *
     * You can set the `fireImmediately` argument to true in order to invoke
     * the provided callback right after registration.
     *
     * Returns a removal function that you could call to "unsubscribe" from the changes.
     */
    onChange(callback: OnStoreChangeFunc, fireImmediately?: boolean): () => void;
    protected triggerChange(): void;
}
/**
 * BaseService class that should be inherited from all API services.
 */
declare abstract class BaseService {
    readonly client: Client;
    constructor(client: Client);
}
interface SendOptions extends RequestInit {
    // for backward compatibility and to minimize the verbosity,
    // any top-level field that doesn't exist in RequestInit or the
    // fields below will be treated as query parameter.
    [key: string]: any;
    /**
     * Optional custom fetch function to use for sending the request.
     */
    fetch?: (url: RequestInfo | URL, config?: RequestInit) => Promise<Response>;
    /**
     * Custom headers to send with the requests.
     */
    headers?: {
        [key: string]: string;
    };
    /**
     * The body of the request (serialized automatically for json requests).
     */
    body?: any;
    /**
     * Query parameters that will be appended to the request url.
     */
    query?: {
        [key: string]: any;
    };
    /**
     * @deprecated use `query` instead
     *
     * for backward-compatibility `params` values are merged with `query`,
     * but this option may get removed in the final v1 release
     */
    params?: {
        [key: string]: any;
    };
    /**
     * The request identifier that can be used to cancel pending requests.
     */
    requestKey?: string | null;
    /**
     * @deprecated use `requestKey:string` instead
     */
    $cancelKey?: string;
    /**
     * @deprecated use `requestKey:null` instead
     */
    $autoCancel?: boolean;
}
interface CommonOptions extends SendOptions {
    fields?: string;
}
interface ListOptions extends CommonOptions {
    page?: number;
    perPage?: number;
    sort?: string;
    filter?: string;
    skipTotal?: boolean;
}
interface FullListOptions extends ListOptions {
    batch?: number;
}
interface RecordOptions extends CommonOptions {
    expand?: string;
}
interface RecordListOptions extends ListOptions, RecordOptions {
}
interface RecordFullListOptions extends FullListOptions, RecordOptions {
}
interface RecordSubscribeOptions extends SendOptions {
    fields?: string;
    filter?: string;
    expand?: string;
}
interface LogStatsOptions extends CommonOptions {
    filter?: string;
}
interface FileOptions extends CommonOptions {
    thumb?: string;
    download?: boolean;
}
interface AuthOptions extends CommonOptions {
    /**
     * If autoRefreshThreshold is set it will take care to auto refresh
     * when necessary the auth data before each request to ensure that
     * the auth state is always valid.
     *
     * The value must be in seconds, aka. the amount of seconds
     * that will be subtracted from the current token `exp` claim in order
     * to determine whether it is going to expire within the specified time threshold.
     *
     * For example, if you want to auto refresh the token if it is
     * going to expire in the next 30mins (or already has expired),
     * it can be set to `1800`
     */
    autoRefreshThreshold?: number;
}
// modifies in place the provided options by moving unknown send options as query parameters.
declare function normalizeUnknownQueryParams(options?: SendOptions): void;
declare function serializeQueryParams(params: {
    [key: string]: any;
}): string;
interface appleClientSecret {
    secret: string;
}
declare class SettingsService extends BaseService {
    /**
     * Fetch all available app settings.
     *
     * @throws {ClientResponseError}
     */
    getAll(options?: CommonOptions): Promise<{
        [key: string]: any;
    }>;
    /**
     * Bulk updates app settings.
     *
     * @throws {ClientResponseError}
     */
    update(bodyParams?: {
        [key: string]: any;
    } | FormData, options?: CommonOptions): Promise<{
        [key: string]: any;
    }>;
    /**
     * Performs a S3 filesystem connection test.
     *
     * The currently supported `filesystem` are "storage" and "backups".
     *
     * @throws {ClientResponseError}
     */
    testS3(filesystem?: string, options?: CommonOptions): Promise<boolean>;
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
    testEmail(collectionIdOrName: string, toEmail: string, emailTemplate: string, options?: CommonOptions): Promise<boolean>;
    /**
     * Generates a new Apple OAuth2 client secret.
     *
     * @throws {ClientResponseError}
     */
    generateAppleClientSecret(clientId: string, teamId: string, keyId: string, privateKey: string, duration: number, options?: CommonOptions): Promise<appleClientSecret>;
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
    getCategory(category: string, options?: CommonOptions): Promise<any>;
    /**
     * Updates the Meta configuration (app name, URL, sender info, etc.).
     *
     * @param config - Meta configuration updates
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    updateMeta(config: {
        appName?: string;
        appURL?: string;
        senderName?: string;
        senderAddress?: string;
        hideControls?: boolean;
    }, options?: CommonOptions): Promise<{
        [key: string]: any;
    }>;
    // -------------------------------------------------------------------
    // Application Configuration Helpers (Meta + TrustedProxy + RateLimits + Batch)
    // -------------------------------------------------------------------
    /**
     * Gets the current application configuration settings.
     *
     * This is a convenience method that returns all application configuration,
     * matching what's shown on the application settings page (`/_/#/settings`):
     * - Meta settings (app name, URL, hideControls)
     * - TrustedProxy settings
     * - RateLimits settings
     * - Batch settings
     *
     * @param options - Optional request options
     * @returns Object containing application configuration
     * @throws {ClientResponseError}
     */
    getApplicationSettings(options?: CommonOptions): Promise<{
        meta?: {
            appName?: string;
            appURL?: string;
            senderName?: string;
            senderAddress?: string;
            hideControls?: boolean;
        };
        trustedProxy?: {
            headers?: Array<string>;
            useLeftmostIP?: boolean;
        };
        rateLimits?: {
            rules?: Array<any>;
        };
        batch?: {
            enabled?: boolean;
            maxRequests?: number;
            interval?: number;
        };
    }>;
    /**
     * Updates application configuration settings.
     *
     * This is a convenience method for managing all application configuration
     * categories at once (meta, trustedProxy, rateLimits, batch).
     *
     * @param config - Application configuration updates
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    updateApplicationSettings(config: {
        meta?: {
            appName?: string;
            appURL?: string;
            senderName?: string;
            senderAddress?: string;
            hideControls?: boolean;
        };
        trustedProxy?: {
            headers?: Array<string>;
            useLeftmostIP?: boolean;
        };
        rateLimits?: {
            rules?: Array<any>;
        };
        batch?: {
            enabled?: boolean;
            maxRequests?: number;
            interval?: number;
        };
    }, options?: CommonOptions): Promise<{
        [key: string]: any;
    }>;
    /**
     * Updates the SMTP email configuration.
     *
     * @param config - SMTP configuration updates
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    updateSMTP(config: {
        enabled?: boolean;
        host?: string;
        port?: number;
        username?: string;
        password?: string;
        authMethod?: string;
        tls?: boolean;
        localName?: string;
    }, options?: CommonOptions): Promise<{
        [key: string]: any;
    }>;
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
    getMailSettings(options?: CommonOptions): Promise<{
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
    }>;
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
    updateMailSettings(config: {
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
    }, options?: CommonOptions): Promise<{
        [key: string]: any;
    }>;
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
    testMail(toEmail: string, template?: string, collectionIdOrName?: string, options?: CommonOptions): Promise<boolean>;
    /**
     * Updates the S3 storage configuration.
     *
     * @param config - S3 configuration updates
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    updateS3(config: {
        enabled?: boolean;
        bucket?: string;
        region?: string;
        endpoint?: string;
        accessKey?: string;
        secret?: string;
        forcePathStyle?: boolean;
    }, options?: CommonOptions): Promise<{
        [key: string]: any;
    }>;
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
    getStorageS3(options?: CommonOptions): Promise<any>;
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
    updateStorageS3(config: {
        enabled?: boolean;
        bucket?: string;
        region?: string;
        endpoint?: string;
        accessKey?: string;
        secret?: string;
        forcePathStyle?: boolean;
    }, options?: CommonOptions): Promise<{
        [key: string]: any;
    }>;
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
    testStorageS3(options?: CommonOptions): Promise<boolean>;
    /**
     * Updates the Backups configuration (scheduling and S3 storage).
     *
     * @param config - Backups configuration updates
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    updateBackups(config: {
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
    }, options?: CommonOptions): Promise<{
        [key: string]: any;
    }>;
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
    getBackupSettings(options?: CommonOptions): Promise<{
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
    }>;
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
    updateBackupSettings(config: {
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
    }, options?: CommonOptions): Promise<{
        [key: string]: any;
    }>;
    /**
     * Sets the auto-backup cron schedule.
     *
     * @param cron - Cron expression (e.g., "0 0 * * *" for daily). Use empty string to disable.
     * @param cronMaxKeep - Maximum number of backups to keep (required if cron is set)
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    setAutoBackupSchedule(cron: string, cronMaxKeep?: number, options?: CommonOptions): Promise<{
        [key: string]: any;
    }>;
    /**
     * Disables auto-backup (removes cron schedule).
     *
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    disableAutoBackup(options?: CommonOptions): Promise<{
        [key: string]: any;
    }>;
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
    testBackupsS3(options?: CommonOptions): Promise<boolean>;
    /**
     * Updates the Batch request configuration.
     *
     * @param config - Batch configuration updates
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    updateBatch(config: {
        enabled?: boolean;
        maxRequests?: number;
        timeout?: number;
        maxBodySize?: number;
    }, options?: CommonOptions): Promise<{
        [key: string]: any;
    }>;
    /**
     * Updates the Rate Limits configuration.
     *
     * @param config - Rate limits configuration updates
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    updateRateLimits(config: {
        enabled?: boolean;
        rules?: Array<{
            label: string;
            audience?: string;
            duration: number;
            maxRequests: number;
        }>;
    }, options?: CommonOptions): Promise<{
        [key: string]: any;
    }>;
    /**
     * Updates the Trusted Proxy configuration.
     *
     * @param config - Trusted proxy configuration updates
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    updateTrustedProxy(config: {
        headers?: Array<string>;
        useLeftmostIP?: boolean;
    }, options?: CommonOptions): Promise<{
        [key: string]: any;
    }>;
    /**
     * Updates the Logs configuration.
     *
     * @param config - Logs configuration updates
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    updateLogs(config: {
        maxDays?: number;
        minLevel?: number;
        logIP?: boolean;
        logAuthId?: boolean;
    }, options?: CommonOptions): Promise<{
        [key: string]: any;
    }>;
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
    getLogSettings(options?: CommonOptions): Promise<{
        maxDays?: number;
        minLevel?: number;
        logIP?: boolean;
        logAuthId?: boolean;
    }>;
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
    updateLogSettings(config: {
        maxDays?: number;
        minLevel?: number;
        logIP?: boolean;
        logAuthId?: boolean;
    }, options?: CommonOptions): Promise<{
        [key: string]: any;
    }>;
    /**
     * Sets the maximum number of days to retain logs.
     *
     * @param maxDays - Maximum days to retain logs (0 or greater)
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    setLogRetentionDays(maxDays: number, options?: CommonOptions): Promise<{
        [key: string]: any;
    }>;
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
    setMinLogLevel(minLevel: number, options?: CommonOptions): Promise<{
        [key: string]: any;
    }>;
    /**
     * Enables or disables IP address logging.
     *
     * @param enabled - Whether to log IP addresses
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    setLogIPAddresses(enabled: boolean, options?: CommonOptions): Promise<{
        [key: string]: any;
    }>;
    /**
     * Enables or disables authentication ID logging.
     *
     * @param enabled - Whether to log authentication IDs
     * @param options - Optional request options
     * @returns Updated settings
     * @throws {ClientResponseError}
     */
    setLogAuthIds(enabled: boolean, options?: CommonOptions): Promise<{
        [key: string]: any;
    }>;
}
type UnsubscribeFunc = () => Promise<void>;
declare class RealtimeService extends BaseService {
    clientId: string;
    private eventSource;
    private subscriptions;
    private lastSentSubscriptions;
    private connectTimeoutId;
    private maxConnectTimeout;
    private reconnectTimeoutId;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private predefinedReconnectIntervals;
    private pendingConnects;
    /**
     * Returns whether the realtime connection has been established.
     */
    get isConnected(): boolean;
    /**
     * An optional hook that is invoked when the realtime client disconnects
     * either when unsubscribing from all subscriptions or when the
     * connection was interrupted or closed by the server.
     *
     * The received argument could be used to determine whether the disconnect
     * is a result from unsubscribing (`activeSubscriptions.length == 0`)
     * or because of network/server error (`activeSubscriptions.length > 0`).
     *
     * If you want to listen for the opposite, aka. when the client connection is established,
     * subscribe to the `PB_CONNECT` event.
     */
    onDisconnect?: (activeSubscriptions: Array<string>) => void;
    /**
     * Register the subscription listener.
     *
     * You can subscribe multiple times to the same topic.
     *
     * If the SSE connection is not started yet,
     * this method will also initialize it.
     */
    subscribe(topic: string, callback: (data: any) => void, options?: SendOptions): Promise<UnsubscribeFunc>;
    /**
     * Unsubscribe from all subscription listeners with the specified topic.
     *
     * If `topic` is not provided, then this method will unsubscribe
     * from all active subscriptions.
     *
     * This method is no-op if there are no active subscriptions.
     *
     * The related sse connection will be autoclosed if after the
     * unsubscribe operation there are no active subscriptions left.
     */
    unsubscribe(topic?: string): Promise<void>;
    /**
     * Unsubscribe from all subscription listeners starting with the specified topic prefix.
     *
     * This method is no-op if there are no active subscriptions with the specified topic prefix.
     *
     * The related sse connection will be autoclosed if after the
     * unsubscribe operation there are no active subscriptions left.
     */
    unsubscribeByPrefix(keyPrefix: string): Promise<void>;
    /**
     * Unsubscribe from all subscriptions matching the specified topic and listener function.
     *
     * This method is no-op if there are no active subscription with
     * the specified topic and listener.
     *
     * The related sse connection will be autoclosed if after the
     * unsubscribe operation there are no active subscriptions left.
     */
    unsubscribeByTopicAndListener(topic: string, listener: EventListener): Promise<void>;
    private hasSubscriptionListeners;
    private submitSubscriptions;
    private getSubscriptionsCancelKey;
    private getSubscriptionsByTopic;
    private getNonEmptySubscriptionKeys;
    private addAllSubscriptionListeners;
    private removeAllSubscriptionListeners;
    private connect;
    private initConnect;
    private hasUnsentSubscriptions;
    private connectErrorHandler;
    private disconnect;
}
declare abstract class CrudService<M> extends BaseService {
    /**
     * Base path for the crud actions (without trailing slash, eg. '/admins').
     */
    abstract get baseCrudPath(): string;
    /**
     * Response data decoder.
     */
    decode<T = M>(data: {
        [key: string]: any;
    }): T;
    /**
     * Returns a promise with all list items batch fetched at once
     * (by default 500 items per request; to change it set the `batch` query param).
     *
     * You can use the generic T to supply a wrapper type of the crud model.
     *
     * @throws {ClientResponseError}
     */
    getFullList<T = M>(options?: FullListOptions): Promise<Array<T>>;
    /**
     * Legacy version of getFullList with explicitly specified batch size.
     */
    getFullList<T = M>(batch?: number, options?: ListOptions): Promise<Array<T>>;
    /**
     * Returns paginated items list.
     *
     * You can use the generic T to supply a wrapper type of the crud model.
     *
     * @throws {ClientResponseError}
     */
    getList<T = M>(page?: number, perPage?: number, options?: ListOptions): Promise<ListResult<T>>;
    /**
     * Returns the first found item by the specified filter.
     *
     * Internally it calls `getList(1, 1, { filter, skipTotal })` and
     * returns the first found item.
     *
     * You can use the generic T to supply a wrapper type of the crud model.
     *
     * For consistency with `getOne`, this method will throw a 404
     * ClientResponseError if no item was found.
     *
     * @throws {ClientResponseError}
     */
    getFirstListItem<T = M>(filter: string, options?: CommonOptions): Promise<T>;
    /**
     * Returns single item by its id.
     *
     * You can use the generic T to supply a wrapper type of the crud model.
     *
     * If `id` is empty it will throw a 404 error.
     *
     * @throws {ClientResponseError}
     */
    getOne<T = M>(id: string, options?: CommonOptions): Promise<T>;
    /**
     * Creates a new item.
     *
     * You can use the generic T to supply a wrapper type of the crud model.
     *
     * @throws {ClientResponseError}
     */
    create<T = M>(bodyParams?: {
        [key: string]: any;
    } | FormData, options?: CommonOptions): Promise<T>;
    /**
     * Updates an existing item by its id.
     *
     * You can use the generic T to supply a wrapper type of the crud model.
     *
     * @throws {ClientResponseError}
     */
    update<T = M>(id: string, bodyParams?: {
        [key: string]: any;
    } | FormData, options?: CommonOptions): Promise<T>;
    /**
     * Deletes an existing item by its id.
     *
     * @throws {ClientResponseError}
     */
    delete(id: string, options?: CommonOptions): Promise<boolean>;
    /**
     * Returns a promise with all list items batch fetched at once.
     */
    protected _getFullList<T = M>(batchSize?: number, options?: ListOptions): Promise<Array<T>>;
}
interface RecordAuthResponse<T = RecordModel> {
    /**
     * The signed BosBase auth record.
     */
    record: T;
    /**
     * The BosBase record auth token.
     *
     * If you are looking for the OAuth2 access and refresh tokens
     * they are available under the `meta.accessToken` and `meta.refreshToken` props.
     */
    token: string;
    /**
     * Auth meta data usually filled when OAuth2 is used.
     */
    meta?: {
        [key: string]: any;
    };
}
interface AuthProviderInfo {
    name: string;
    displayName: string;
    state: string;
    authURL: string;
    codeVerifier: string;
    codeChallenge: string;
    codeChallengeMethod: string;
}
interface AuthMethodsList {
    mfa: {
        enabled: boolean;
        duration: number;
    };
    otp: {
        enabled: boolean;
        duration: number;
    };
    password: {
        enabled: boolean;
        identityFields: Array<string>;
    };
    oauth2: {
        enabled: boolean;
        providers: Array<AuthProviderInfo>;
    };
}
interface RecordSubscription<T = RecordModel> {
    action: string; // eg. create, update, delete
    record: T;
}
type OAuth2UrlCallback = (url: string) => void | Promise<void>;
interface OAuth2AuthConfig extends SendOptions {
    // the name of the OAuth2 provider (eg. "google")
    provider: string;
    // custom scopes to overwrite the default ones
    scopes?: Array<string>;
    // optional record create data
    createData?: {
        [key: string]: any;
    };
    // optional callback that is triggered after the OAuth2 sign-in/sign-up url generation
    urlCallback?: OAuth2UrlCallback;
    // optional query params to send with the BosBase auth request (eg. fields, expand, etc.)
    query?: RecordOptions;
}
interface OTPResponse {
    otpId: string;
}
declare class RecordService<M = RecordModel> extends CrudService<M> {
    readonly collectionIdOrName: string;
    constructor(client: Client, collectionIdOrName: string);
    /**
     * @inheritdoc
     */
    get baseCrudPath(): string;
    /**
     * Returns the current collection service base path.
     */
    get baseCollectionPath(): string;
    /**
     * Returns whether the current service collection is superusers.
     */
    get isSuperusers(): boolean;
    // ---------------------------------------------------------------
    // Realtime handlers
    // ---------------------------------------------------------------
    /**
     * Subscribe to realtime changes to the specified topic ("*" or record id).
     *
     * If `topic` is the wildcard "*", then this method will subscribe to
     * any record changes in the collection.
     *
     * If `topic` is a record id, then this method will subscribe only
     * to changes of the specified record id.
     *
     * It's OK to subscribe multiple times to the same topic.
     * You can use the returned `UnsubscribeFunc` to remove only a single subscription.
     * Or use `unsubscribe(topic)` if you want to remove all subscriptions attached to the topic.
     */
    subscribe<T = M>(topic: string, callback: (data: RecordSubscription<T>) => void, options?: RecordSubscribeOptions): Promise<UnsubscribeFunc>;
    /**
     * Unsubscribe from all subscriptions of the specified topic
     * ("*" or record id).
     *
     * If `topic` is not set, then this method will unsubscribe from
     * all subscriptions associated to the current collection.
     */
    unsubscribe(topic?: string): Promise<void>;
    // ---------------------------------------------------------------
    // Crud handers
    // ---------------------------------------------------------------
    /**
     * @inheritdoc
     */
    getFullList<T = M>(options?: RecordFullListOptions): Promise<Array<T>>;
    /**
     * @inheritdoc
     */
    getFullList<T = M>(batch?: number, options?: RecordListOptions): Promise<Array<T>>;
    /**
     * @inheritdoc
     */
    getList<T = M>(page?: number, perPage?: number, options?: RecordListOptions): Promise<ListResult<T>>;
    /**
     * @inheritdoc
     */
    getFirstListItem<T = M>(filter: string, options?: RecordListOptions): Promise<T>;
    /**
     * @inheritdoc
     */
    getOne<T = M>(id: string, options?: RecordOptions): Promise<T>;
    /**
     * @inheritdoc
     */
    create<T = M>(bodyParams?: {
        [key: string]: any;
    } | FormData, options?: RecordOptions): Promise<T>;
    /**
     * @inheritdoc
     *
     * If the current `client.authStore.record` matches with the updated id, then
     * on success the `client.authStore.record` will be updated with the new response record fields.
     */
    update<T = M>(id: string, bodyParams?: {
        [key: string]: any;
    } | FormData, options?: RecordOptions): Promise<T>;
    /**
     * @inheritdoc
     *
     * If the current `client.authStore.record` matches with the deleted id,
     * then on success the `client.authStore` will be cleared.
     */
    delete(id: string, options?: CommonOptions): Promise<boolean>;
    // ---------------------------------------------------------------
    // Auth handlers
    // ---------------------------------------------------------------
    /**
     * Prepare successful collection authorization response.
     */
    protected authResponse<T = M>(responseData: any): RecordAuthResponse<T>;
    /**
     * Returns all available collection auth methods.
     *
     * @throws {ClientResponseError}
     */
    listAuthMethods(options?: CommonOptions): Promise<AuthMethodsList>;
    /**
     * Authenticate a single auth collection record via its username/email and password.
     *
     * On success, this method also automatically updates
     * the client's AuthStore data and returns:
     * - the authentication token
     * - the authenticated record model
     *
     * @throws {ClientResponseError}
     */
    authWithPassword<T = M>(usernameOrEmail: string, password: string, options?: RecordOptions): Promise<RecordAuthResponse<T>>;
    /**
     * Authenticate a single auth collection record with OAuth2 code.
     *
     * If you don't have an OAuth2 code you may also want to check `authWithOAuth2` method.
     *
     * On success, this method also automatically updates
     * the client's AuthStore data and returns:
     * - the authentication token
     * - the authenticated record model
     * - the OAuth2 account data (eg. name, email, avatar, etc.)
     *
     * @throws {ClientResponseError}
     */
    authWithOAuth2Code<T = M>(provider: string, code: string, codeVerifier: string, redirectURL: string, createData?: {
        [key: string]: any;
    }, options?: RecordOptions): Promise<RecordAuthResponse<T>>;
    /**
     * @deprecated
     * Consider using authWithOAuth2Code(provider, code, codeVerifier, redirectURL, createdData, options?).
     */
    authWithOAuth2Code<T = M>(provider: string, code: string, codeVerifier: string, redirectURL: string, createData?: {
        [key: string]: any;
    }, body?: any, query?: any): Promise<RecordAuthResponse<T>>;
    /**
     * @deprecated This form of authWithOAuth2 is deprecated.
     *
     * Please use `authWithOAuth2Code()` OR its simplified realtime version
     * as shown in https://bosbase.io/docs/authentication/#oauth2-integration.
     */
    authWithOAuth2<T = M>(provider: string, code: string, codeVerifier: string, redirectURL: string, createData?: {
        [key: string]: any;
    }, bodyParams?: {
        [key: string]: any;
    }, queryParams?: RecordOptions): Promise<RecordAuthResponse<T>>;
    /**
     * Authenticate a single auth collection record with OAuth2
     * **without custom redirects, deeplinks or even page reload**.
     *
     * This method initializes a one-off realtime subscription and will
     * open a popup window with the OAuth2 vendor page to authenticate.
     * Once the external OAuth2 sign-in/sign-up flow is completed, the popup
     * window will be automatically closed and the OAuth2 data sent back
     * to the user through the previously established realtime connection.
     *
     * You can specify an optional `urlCallback` prop to customize
     * the default url `window.open` behavior.
     *
     * On success, this method also automatically updates
     * the client's AuthStore data and returns:
     * - the authentication token
     * - the authenticated record model
     * - the OAuth2 account data (eg. name, email, avatar, etc.)
     *
     * Example:
     *
     * ```js
     * const authData = await pb.collection("users").authWithOAuth2({
     *     provider: "google",
     * })
     * ```
     *
     * Note1: When creating the OAuth2 app in the provider dashboard
     * you have to configure `https://yourdomain.com/api/oauth2-redirect`
     * as redirect URL.
     *
     * Note2: Safari may block the default `urlCallback` popup because
     * it doesn't allow `window.open` calls as part of an `async` click functions.
     * To workaround this you can either change your click handler to not be marked as `async`
     * OR manually call `window.open` before your `async` function and use the
     * window reference in your own custom `urlCallback` (see https://github.com/bosbase/bosbase/discussions/2429#discussioncomment-5943061).
     * For example:
     * ```js
     * <button id="btn">Login with Gitlab</button>
     * ...
     * document.getElementById("btn").addEventListener("click", () => {
     *     pb.collection("users").authWithOAuth2({
     *         provider: "gitlab",
     *     }).then((authData) => {
     *         console.log(authData)
     *     }).catch((err) => {
     *         console.log(err, err.originalError);
     *     });
     * })
     * ```
     *
     * @throws {ClientResponseError}
     */
    authWithOAuth2<T = M>(options: OAuth2AuthConfig): Promise<RecordAuthResponse<T>>;
    /**
     * Refreshes the current authenticated record instance and
     * returns a new token and record data.
     *
     * On success this method also automatically updates the client's AuthStore.
     *
     * @throws {ClientResponseError}
     */
    authRefresh<T = M>(options?: RecordOptions): Promise<RecordAuthResponse<T>>;
    /**
     * @deprecated
     * Consider using authRefresh(options?).
     */
    authRefresh<T = M>(body?: any, query?: any): Promise<RecordAuthResponse<T>>;
    /**
     * Sends auth record password reset request.
     *
     * @throws {ClientResponseError}
     */
    requestPasswordReset(email: string, options?: CommonOptions): Promise<boolean>;
    /**
     * @deprecated
     * Consider using requestPasswordReset(email, options?).
     */
    requestPasswordReset(email: string, body?: any, query?: any): Promise<boolean>;
    /**
     * Confirms auth record password reset request.
     *
     * @throws {ClientResponseError}
     */
    confirmPasswordReset(passwordResetToken: string, password: string, passwordConfirm: string, options?: CommonOptions): Promise<boolean>;
    /**
     * @deprecated
     * Consider using confirmPasswordReset(passwordResetToken, password, passwordConfirm, options?).
     */
    confirmPasswordReset(passwordResetToken: string, password: string, passwordConfirm: string, body?: any, query?: any): Promise<boolean>;
    /**
     * Sends auth record verification email request.
     *
     * @throws {ClientResponseError}
     */
    requestVerification(email: string, options?: CommonOptions): Promise<boolean>;
    /**
     * @deprecated
     * Consider using requestVerification(email, options?).
     */
    requestVerification(email: string, body?: any, query?: any): Promise<boolean>;
    /**
     * Confirms auth record email verification request.
     *
     * If the current `client.authStore.record` matches with the auth record from the token,
     * then on success the `client.authStore.record.verified` will be updated to `true`.
     *
     * @throws {ClientResponseError}
     */
    confirmVerification(verificationToken: string, options?: CommonOptions): Promise<boolean>;
    /**
     * @deprecated
     * Consider using confirmVerification(verificationToken, options?).
     */
    confirmVerification(verificationToken: string, body?: any, query?: any): Promise<boolean>;
    /**
     * Sends an email change request to the authenticated record model.
     *
     * @throws {ClientResponseError}
     */
    requestEmailChange(newEmail: string, options?: CommonOptions): Promise<boolean>;
    /**
     * @deprecated
     * Consider using requestEmailChange(newEmail, options?).
     */
    requestEmailChange(newEmail: string, body?: any, query?: any): Promise<boolean>;
    /**
     * Confirms auth record's new email address.
     *
     * If the current `client.authStore.record` matches with the auth record from the token,
     * then on success the `client.authStore` will be cleared.
     *
     * @throws {ClientResponseError}
     */
    confirmEmailChange(emailChangeToken: string, password: string, options?: CommonOptions): Promise<boolean>;
    /**
     * @deprecated
     * Consider using confirmEmailChange(emailChangeToken, password, options?).
     */
    confirmEmailChange(emailChangeToken: string, password: string, body?: any, query?: any): Promise<boolean>;
    /**
     * @deprecated use collection("_externalAuths").*
     *
     * Lists all linked external auth providers for the specified auth record.
     *
     * @throws {ClientResponseError}
     */
    listExternalAuths(recordId: string, options?: CommonOptions): Promise<Array<RecordModel>>;
    /**
     * @deprecated use collection("_externalAuths").*
     *
     * Unlink a single external auth provider from the specified auth record.
     *
     * @throws {ClientResponseError}
     */
    unlinkExternalAuth(recordId: string, provider: string, options?: CommonOptions): Promise<boolean>;
    /**
     * Sends auth record OTP to the provided email.
     *
     * @throws {ClientResponseError}
     */
    requestOTP(email: string, options?: CommonOptions): Promise<OTPResponse>;
    /**
     * Authenticate a single auth collection record via OTP.
     *
     * On success, this method also automatically updates
     * the client's AuthStore data and returns:
     * - the authentication token
     * - the authenticated record model
     *
     * @throws {ClientResponseError}
     */
    authWithOTP<T = M>(otpId: string, password: string, options?: CommonOptions): Promise<RecordAuthResponse<T>>;
    /**
     * Impersonate authenticates with the specified recordId and
     * returns a new client with the received auth token in a memory store.
     *
     * If `duration` is 0 the generated auth token will fallback
     * to the default collection auth token duration.
     *
     * This action currently requires superusers privileges.
     *
     * @throws {ClientResponseError}
     */
    impersonate(recordId: string, duration: number, options?: CommonOptions): Promise<Client>;
    // ---------------------------------------------------------------
    // very rudimentary url query params replacement because at the moment
    // URL (and URLSearchParams) doesn't seem to be fully supported in React Native
    //
    // note: for details behind some of the decode/encode parsing check https://unixpapa.com/js/querystring.html
    private _replaceQueryParams;
}
declare class CollectionService extends CrudService<CollectionModel> {
    /**
     * @inheritdoc
     */
    get baseCrudPath(): string;
    /**
     * Deletes a collection (table) by its id or name.
     *
     * This is a convenience method that wraps the inherited `delete()` method
     * to make collection deletion explicit.
     *
     * **Warning**: This operation is destructive and will delete the collection
     * along with all its records and associated data.
     *
     * @param collectionIdOrName - Collection id or name to delete
     * @param options - Optional request options
     * @returns true if deletion succeeds
     * @throws {ClientResponseError}
     */
    deleteCollection(collectionIdOrName: string, options?: CommonOptions): Promise<boolean>;
    /**
     * Returns type indexed map with scaffolded collection models
     * populated with their default field values.
     *
     * @throws {ClientResponseError}
     */
    getScaffolds(options?: CommonOptions): Promise<{
        [key: string]: CollectionModel;
    }>;
    /**
     * Creates a new collection from a scaffold template.
     *
     * This is a convenience method that fetches the scaffold for the specified type
     * and creates a new collection with the given name, using the scaffold as a base.
     *
     * @param type - Collection type: "base", "auth", or "view"
     * @param name - Collection name
     * @param overrides - Optional properties to override in the scaffold
     * @param options - Optional request options
     * @returns Created collection model
     * @throws {ClientResponseError}
     */
    createFromScaffold(type: "base" | "auth" | "view", name: string, overrides?: Partial<CollectionModel>, options?: CommonOptions): Promise<CollectionModel>;
    /**
     * Creates a new base collection.
     *
     * Convenience method for creating a base collection type.
     *
     * @param name - Collection name
     * @param overrides - Optional properties to override
     * @param options - Optional request options
     * @returns Created collection model
     * @throws {ClientResponseError}
     */
    createBase(name: string, overrides?: Partial<CollectionModel>, options?: CommonOptions): Promise<CollectionModel>;
    /**
     * Creates a new auth collection.
     *
     * Convenience method for creating an auth collection type.
     *
     * @param name - Collection name
     * @param overrides - Optional properties to override
     * @param options - Optional request options
     * @returns Created collection model
     * @throws {ClientResponseError}
     */
    createAuth(name: string, overrides?: Partial<CollectionModel>, options?: CommonOptions): Promise<CollectionModel>;
    /**
     * Creates a new view collection.
     *
     * Convenience method for creating a view collection type.
     *
     * @param name - Collection name
     * @param viewQuery - SQL query for the view (required for view collections)
     * @param overrides - Optional properties to override
     * @param options - Optional request options
     * @returns Created collection model
     * @throws {ClientResponseError}
     */
    createView(name: string, viewQuery?: string, overrides?: Partial<CollectionModel>, options?: CommonOptions): Promise<CollectionModel>;
    /**
     * Deletes all records associated with the specified collection.
     *
     * @throws {ClientResponseError}
     */
    truncate(collectionIdOrName: string, options?: CommonOptions): Promise<true>;
    // -------------------------------------------------------------------
    // Export/Import Helpers
    // -------------------------------------------------------------------
    /**
     * Exports collections in a format suitable for import.
     *
     * This method fetches all collections and prepares them for export by:
     * - Removing timestamps (created, updated)
     * - Removing OAuth2 providers (for cleaner export)
     *
     * The returned collections can be saved as JSON and later imported.
     *
     * @param filterCollections - Optional function to filter which collections to export (by default exports all)
     * @param options - Optional request options
     * @returns Array of collection models ready for export
     * @throws {ClientResponseError}
     */
    exportCollections(filterCollections?: (collection: CollectionModel) => boolean, options?: CommonOptions): Promise<Array<CollectionModel>>;
    /**
     * Normalizes collections data for import.
     *
     * This helper method prepares collections data by:
     * - Removing timestamps (created, updated)
     * - Removing duplicate collections by id
     * - Removing duplicate fields within each collection
     *
     * Use this before calling import() to ensure clean data.
     *
     * @param collections - Array of collection models to normalize
     * @returns Normalized array of collections ready for import
     */
    normalizeForImport(collections: Array<CollectionModel>): Array<CollectionModel>;
    /**
     * Imports the provided collections.
     *
     * If `deleteMissing` is `true`, all local collections and their fields,
     * that are not present in the imported configuration, WILL BE DELETED
     * (including their related records data)!
     *
     * **Warning**: This operation is destructive when `deleteMissing` is true.
     * It's recommended to call `normalizeForImport()` on the collections
     * before importing to ensure clean data.
     *
     * @param collections - Array of collection models to import
     * @param deleteMissing - Whether to delete collections not present in the import (default: false)
     * @param options - Optional request options
     * @returns true if import succeeds
     * @throws {ClientResponseError}
     */
    import(collections: Array<CollectionModel>, deleteMissing?: boolean, options?: CommonOptions): Promise<true>;
    // -------------------------------------------------------------------
    // Field Management Helpers
    // -------------------------------------------------------------------
    /**
     * Adds a new field to the collection.
     *
     * @param collectionIdOrName - Collection id or name
     * @param field - Field definition (at minimum: name and type)
     * @param options - Optional request options
     * @returns Updated collection model
     * @throws {ClientResponseError}
     */
    addField(collectionIdOrName: string, field: Partial<CollectionField>, options?: CommonOptions): Promise<CollectionModel>;
    /**
     * Updates an existing field in the collection.
     *
     * @param collectionIdOrName - Collection id or name
     * @param fieldName - Name of the field to update
     * @param updates - Field updates to apply
     * @param options - Optional request options
     * @returns Updated collection model
     * @throws {ClientResponseError}
     */
    updateField(collectionIdOrName: string, fieldName: string, updates: Partial<CollectionField>, options?: CommonOptions): Promise<CollectionModel>;
    /**
     * Removes a field from the collection (deletes a table field).
     *
     * This method removes a field from the collection schema and automatically
     * removes any indexes that reference the deleted field.
     *
     * **Note**: System fields cannot be removed.
     *
     * @param collectionIdOrName - Collection id or name
     * @param fieldName - Name of the field to remove
     * @param options - Optional request options
     * @returns Updated collection model
     * @throws {ClientResponseError} if field not found or if attempting to remove a system field
     */
    removeField(collectionIdOrName: string, fieldName: string, options?: CommonOptions): Promise<CollectionModel>;
    /**
     * Gets a field by name from the collection.
     *
     * @param collectionIdOrName - Collection id or name
     * @param fieldName - Name of the field to retrieve
     * @param options - Optional request options
     * @returns Field object or undefined if not found
     * @throws {ClientResponseError}
     */
    getField(collectionIdOrName: string, fieldName: string, options?: CommonOptions): Promise<CollectionField | undefined>;
    // -------------------------------------------------------------------
    // Index Management Helpers
    // -------------------------------------------------------------------
    /**
     * Adds an index to the collection.
     *
     * @param collectionIdOrName - Collection id or name
     * @param columns - Array of column names to index
     * @param unique - Whether the index should be unique (default: false)
     * @param indexName - Optional custom index name
     * @param options - Optional request options
     * @returns Updated collection model
     * @throws {ClientResponseError}
     */
    addIndex(collectionIdOrName: string, columns: Array<string>, unique?: boolean, indexName?: string, options?: CommonOptions): Promise<CollectionModel>;
    /**
     * Removes an index from the collection (deletes a table index).
     *
     * This method removes an index that contains all the specified columns.
     * The index is identified by matching all provided column names.
     *
     * @param collectionIdOrName - Collection id or name
     * @param columns - Array of column names that identify the index to remove
     * @param options - Optional request options
     * @returns Updated collection model
     * @throws {ClientResponseError} if index not found
     */
    removeIndex(collectionIdOrName: string, columns: Array<string>, options?: CommonOptions): Promise<CollectionModel>;
    /**
     * Gets all indexes for the collection.
     *
     * @param collectionIdOrName - Collection id or name
     * @param options - Optional request options
     * @returns Array of index strings
     * @throws {ClientResponseError}
     */
    getIndexes(collectionIdOrName: string, options?: CommonOptions): Promise<Array<string>>;
    // -------------------------------------------------------------------
    // API Rules Management Helpers
    // -------------------------------------------------------------------
    /**
     * Sets the list rule (read/list access rule) for the collection.
     *
     * API Rules are collection access controls and data filters. Each rule can be:
     * - `null` (locked) - Only superusers can perform the action (default)
     * - `""` (empty string) - Anyone can perform the action
     * - Non-empty string - Only users satisfying the filter expression can perform the action
     *
     * Rules support filter syntax with operators (=, !=, >, <, ~, etc.), macros (@now, @request.auth.id, etc.),
     * and modifiers (:isset, :length, :each, :lower).
     *
     * Examples:
     * - Allow only registered users: `"@request.auth.id != \"\""`
     * - Filter by status: `"status = \"active\""`
     * - Combine conditions: `"@request.auth.id != \"\" && (status = \"active\" || status = \"pending\")"`
     * - Filter by relation: `"@request.auth.id != \"\" && author.id ?= @request.auth.id"`
     *
     * @param collectionIdOrName - Collection id or name
     * @param rule - Rule expression (use null, empty string, or "" to allow anyone; use non-empty string for filter)
     * @param options - Optional request options
     * @returns Updated collection model
     * @throws {ClientResponseError}
     */
    setListRule(collectionIdOrName: string, rule: string | null, options?: CommonOptions): Promise<CollectionModel>;
    /**
     * Sets the view rule (read/view access rule) for the collection.
     *
     * See `setListRule` for details on rule syntax and examples.
     *
     * @param collectionIdOrName - Collection id or name
     * @param rule - Rule expression (use null, empty string, or "" to allow anyone; use non-empty string for filter)
     * @param options - Optional request options
     * @returns Updated collection model
     * @throws {ClientResponseError}
     */
    setViewRule(collectionIdOrName: string, rule: string | null, options?: CommonOptions): Promise<CollectionModel>;
    /**
     * Sets the create rule for the collection.
     *
     * See `setListRule` for details on rule syntax and examples.
     *
     * @param collectionIdOrName - Collection id or name
     * @param rule - Rule expression (use null, empty string, or "" to allow anyone; use non-empty string for filter)
     * @param options - Optional request options
     * @returns Updated collection model
     * @throws {ClientResponseError}
     */
    setCreateRule(collectionIdOrName: string, rule: string | null, options?: CommonOptions): Promise<CollectionModel>;
    /**
     * Sets the update rule for the collection.
     *
     * See `setListRule` for details on rule syntax and examples.
     *
     * @param collectionIdOrName - Collection id or name
     * @param rule - Rule expression (use null, empty string, or "" to allow anyone; use non-empty string for filter)
     * @param options - Optional request options
     * @returns Updated collection model
     * @throws {ClientResponseError}
     */
    setUpdateRule(collectionIdOrName: string, rule: string | null, options?: CommonOptions): Promise<CollectionModel>;
    /**
     * Sets the delete rule for the collection.
     *
     * See `setListRule` for details on rule syntax and examples.
     *
     * @param collectionIdOrName - Collection id or name
     * @param rule - Rule expression (use null, empty string, or "" to allow anyone; use non-empty string for filter)
     * @param options - Optional request options
     * @returns Updated collection model
     * @throws {ClientResponseError}
     */
    setDeleteRule(collectionIdOrName: string, rule: string | null, options?: CommonOptions): Promise<CollectionModel>;
    /**
     * Sets all API rules at once for the collection.
     *
     * This is a convenience method to update multiple rules in a single operation.
     *
     * @param collectionIdOrName - Collection id or name
     * @param rules - Object containing rule expressions (listRule, viewRule, createRule, updateRule, deleteRule)
     * @param options - Optional request options
     * @returns Updated collection model
     * @throws {ClientResponseError}
     */
    setRules(collectionIdOrName: string, rules: {
        listRule?: string | null;
        viewRule?: string | null;
        createRule?: string | null;
        updateRule?: string | null;
        deleteRule?: string | null;
    }, options?: CommonOptions): Promise<CollectionModel>;
    /**
     * Gets all API rules for the collection.
     *
     * @param collectionIdOrName - Collection id or name
     * @param options - Optional request options
     * @returns Object containing all rules (listRule, viewRule, createRule, updateRule, deleteRule)
     * @throws {ClientResponseError}
     */
    getRules(collectionIdOrName: string, options?: CommonOptions): Promise<{
        listRule?: string;
        viewRule?: string;
        createRule?: string;
        updateRule?: string;
        deleteRule?: string;
    }>;
    /**
     * Sets the manage rule for an auth collection.
     *
     * ManageRule gives admin-like permissions to allow fully managing auth record(s),
     * e.g. changing password without requiring the old one, directly updating verified state and email, etc.
     * This rule is executed in addition to the Create and Update API rules.
     *
     * Only available for auth collections (type === "auth").
     *
     * @param collectionIdOrName - Auth collection id or name
     * @param rule - Rule expression (use null to remove; empty string is not allowed for manageRule)
     * @param options - Optional request options
     * @returns Updated collection model
     * @throws {ClientResponseError} if collection is not an auth collection
     */
    setManageRule(collectionIdOrName: string, rule: string | null, options?: CommonOptions): Promise<CollectionModel>;
    /**
     * Sets the auth rule for an auth collection.
     *
     * AuthRule specifies additional record constraints applied after record authentication
     * and right before returning the auth token response to the client.
     * For example, to allow only verified users: `"verified = true"`
     *
     * Set to empty string to allow any Auth collection record to authenticate.
     * Set to null to disallow authentication altogether for the collection.
     *
     * Only available for auth collections (type === "auth").
     *
     * @param collectionIdOrName - Auth collection id or name
     * @param rule - Rule expression (use null to disallow auth; empty string to allow all; non-empty for filter)
     * @param options - Optional request options
     * @returns Updated collection model
     * @throws {ClientResponseError} if collection is not an auth collection
     */
    setAuthRule(collectionIdOrName: string, rule: string | null, options?: CommonOptions): Promise<CollectionModel>;
    // -------------------------------------------------------------------
    // Schema Query Methods
    // -------------------------------------------------------------------
    /**
     * Gets the schema (fields and types) for a single collection.
     *
     * This method returns simplified schema information containing only
     * field names, types, and basic metadata (required, system, hidden flags).
     * This is useful for AI systems to understand the structure of collections
     * without fetching the full collection definition.
     *
     * @param collectionIdOrName - Collection id or name
     * @param options - Optional request options
     * @returns Collection schema information
     * @throws {ClientResponseError}
     */
    getSchema(collectionIdOrName: string, options?: CommonOptions): Promise<CollectionSchemaInfo>;
    /**
     * Gets the schema (fields and types) for all collections in the system.
     *
     * This method returns simplified schema information for all collections,
     * containing only field names, types, and basic metadata (required, system, hidden flags).
     * This is useful for AI systems to understand the overall structure of the system
     * and all available collections without fetching full collection definitions.
     *
     * @param options - Optional request options
     * @returns Object containing array of collection schemas
     * @throws {ClientResponseError}
     */
    getAllSchemas(options?: CommonOptions): Promise<{
        collections: Array<CollectionSchemaInfo>;
    }>;
}
interface HourlyStats {
    total: number;
    date: string;
}
declare class LogService extends BaseService {
    /**
     * Returns paginated logs list.
     *
     * @throws {ClientResponseError}
     */
    getList(page?: number, perPage?: number, options?: ListOptions): Promise<ListResult<LogModel>>;
    /**
     * Returns a single log by its id.
     *
     * If `id` is empty it will throw a 404 error.
     *
     * @throws {ClientResponseError}
     */
    getOne(id: string, options?: CommonOptions): Promise<LogModel>;
    /**
     * Returns logs statistics.
     *
     * @throws {ClientResponseError}
     */
    getStats(options?: LogStatsOptions): Promise<Array<HourlyStats>>;
}
interface HealthCheckResponse {
    code: number;
    message: string;
    data: {
        [key: string]: any;
    };
}
declare class HealthService extends BaseService {
    /**
     * Checks the health status of the api.
     *
     * @throws {ClientResponseError}
     */
    check(options?: CommonOptions): Promise<HealthCheckResponse>;
}
declare class FileService extends BaseService {
    /**
     * @deprecated Please replace with `pb.files.getURL()`.
     */
    getUrl(record: {
        [key: string]: any;
    }, filename: string, queryParams?: FileOptions): string;
    /**
     * Builds and returns an absolute record file url for the provided filename.
     */
    getURL(record: {
        [key: string]: any;
    }, filename: string, queryParams?: FileOptions): string;
    /**
     * Requests a new private file access token for the current auth model.
     *
     * @throws {ClientResponseError}
     */
    getToken(options?: CommonOptions): Promise<string>;
}
interface BackupFileInfo {
    key: string;
    size: number;
    modified: string;
}
declare class BackupService extends BaseService {
    /**
     * Returns list with all available backup files.
     *
     * @throws {ClientResponseError}
     */
    getFullList(options?: CommonOptions): Promise<Array<BackupFileInfo>>;
    /**
     * Initializes a new backup.
     *
     * @throws {ClientResponseError}
     */
    create(basename: string, options?: CommonOptions): Promise<boolean>;
    /**
     * Uploads an existing backup file.
     *
     * Example:
     *
     * ```js
     * await pb.backups.upload({
     *     file: new Blob([...]),
     * });
     * ```
     *
     * @throws {ClientResponseError}
     */
    upload(bodyParams: {
        [key: string]: any;
    } | FormData, options?: CommonOptions): Promise<boolean>;
    /**
     * Deletes a single backup file.
     *
     * @throws {ClientResponseError}
     */
    delete(key: string, options?: CommonOptions): Promise<boolean>;
    /**
     * Initializes an app data restore from an existing backup.
     *
     * @throws {ClientResponseError}
     */
    restore(key: string, options?: CommonOptions): Promise<boolean>;
    /**
     * @deprecated Please use `getDownloadURL()`.
     */
    getDownloadUrl(token: string, key: string): string;
    /**
     * Builds a download url for a single existing backup using a
     * superuser file token and the backup file key.
     *
     * The file token can be generated via `pb.files.getToken()`.
     */
    getDownloadURL(token: string, key: string): string;
}
interface CronJob {
    id: string;
    expression: string;
}
declare class CronService extends BaseService {
    /**
     * Returns list with all registered cron jobs.
     *
     * @throws {ClientResponseError}
     */
    getFullList(options?: CommonOptions): Promise<Array<CronJob>>;
    /**
     * Runs the specified cron job.
     *
     * @throws {ClientResponseError}
     */
    run(jobId: string, options?: CommonOptions): Promise<boolean>;
}
interface BatchRequest {
    method: string;
    url: string;
    json?: {
        [key: string]: any;
    };
    files?: {
        [key: string]: Array<any>;
    };
    headers?: {
        [key: string]: string;
    };
}
interface BatchRequestResult {
    status: number;
    body: any;
}
declare class BatchService extends BaseService {
    private requests;
    private subs;
    /**
     * Starts constructing a batch request entry for the specified collection.
     */
    collection(collectionIdOrName: string): SubBatchService;
    /**
     * Sends the batch requests.
     *
     * @throws {ClientResponseError}
     */
    send(options?: SendOptions): Promise<Array<BatchRequestResult>>;
}
declare class SubBatchService {
    private requests;
    private readonly collectionIdOrName;
    constructor(requests: Array<BatchRequest>, collectionIdOrName: string);
    /**
     * Registers a record upsert request into the current batch queue.
     *
     * The request will be executed as update if `bodyParams` have a valid existing record `id` value, otherwise - create.
     */
    upsert(bodyParams?: {
        [key: string]: any;
    } | FormData, options?: RecordOptions): void;
    /**
     * Registers a record create request into the current batch queue.
     */
    create(bodyParams?: {
        [key: string]: any;
    } | FormData, options?: RecordOptions): void;
    /**
     * Registers a record update request into the current batch queue.
     */
    update(id: string, bodyParams?: {
        [key: string]: any;
    } | FormData, options?: RecordOptions): void;
    /**
     * Registers a record delete request into the current batch queue.
     */
    delete(id: string, options?: SendOptions): void;
    private prepareRequest;
}
/**
 * Vector types and interfaces for abstracted vector database support.
 * This abstraction allows for compatibility with different vector databases.
 */
/**
 * Represents a vector embedding as an array of numbers.
 */
type VectorEmbedding = number[];
/**
 * Metadata associated with a vector (optional key-value pairs).
 */
interface VectorMetadata {
    [key: string]: any;
}
/**
 * A vector document/record that can be stored and queried.
 */
interface VectorDocument {
    /**
     * Unique identifier for the vector document.
     */
    id?: string;
    /**
     * The vector embedding.
     */
    vector: VectorEmbedding;
    /**
     * Optional metadata to attach to the vector.
     */
    metadata?: VectorMetadata;
    /**
     * Optional content/text that this vector represents (for display purposes).
     */
    content?: string;
}
/**
 * A result from a vector similarity search.
 */
interface VectorSearchResult {
    /**
     * The vector document that matched.
     */
    document: VectorDocument;
    /**
     * The similarity score (higher is better, typically 0-1 range).
     */
    score: number;
    /**
     * Optional distance metric value (lower is better).
     */
    distance?: number;
}
/**
 * Options for vector search operations.
 */
interface VectorSearchOptions {
    /**
     * The query vector to search for.
     */
    queryVector: VectorEmbedding;
    /**
     * Maximum number of results to return.
     */
    limit?: number;
    /**
     * Optional filter metadata criteria.
     */
    filter?: VectorMetadata;
    /**
     * Minimum score threshold (results below this will be filtered out).
     */
    minScore?: number;
    /**
     * Minimum distance threshold (results above this will be filtered out).
     */
    maxDistance?: number;
    /**
     * Whether to return distances in addition to scores.
     */
    includeDistance?: boolean;
    /**
     * Whether to include the full document content.
     */
    includeContent?: boolean;
}
/**
 * Options for batch vector insert operations.
 */
interface VectorBatchInsertOptions {
    /**
     * The vectors to insert.
     */
    documents: VectorDocument[];
    /**
     * Whether to skip duplicate IDs.
     */
    skipDuplicates?: boolean;
}
/**
 * Response from a vector search operation.
 */
interface VectorSearchResponse {
    /**
     * The search results.
     */
    results: VectorSearchResult[];
    /**
     * Total number of vectors that matched before limit.
     */
    totalMatches?: number;
    /**
     * Query execution time in milliseconds.
     */
    queryTime?: number;
}
/**
 * Response from a vector insert operation.
 */
interface VectorInsertResponse {
    /**
     * The inserted document ID (if generated).
     */
    id: string;
    /**
     * Whether the insert succeeded.
     */
    success: boolean;
}
/**
 * Response from a batch vector insert operation.
 */
interface VectorBatchInsertResponse {
    /**
     * Number of successfully inserted vectors.
     */
    insertedCount: number;
    /**
     * Number of failed insertions.
     */
    failedCount: number;
    /**
     * List of inserted document IDs.
     */
    ids: string[];
    /**
     * List of errors (if any).
     */
    errors?: string[];
}
/**
 * Vector database provider type.
 */
type VectorProvider = "sqlite_vec" | "pinecone" | "weaviate" | "qdrant" | "milvus" | "custom";
/**
 * Configuration for vector operations.
 */
interface VectorConfig {
    /**
     * The vector database provider to use.
     */
    provider: VectorProvider;
    /**
     * Configuration specific to the provider.
     */
    providerConfig?: {
        [key: string]: any;
    };
}
interface VectorServiceOptions extends SendOptions {
    /**
     * Collection or table name to operate on.
     */
    collection?: string;
}
/**
 * VectorService provides an abstracted interface for vector database operations.
 * This abstraction allows support for multiple vector databases through a unified API.
 */
declare class VectorService extends BaseService {
    /**
     * Base path for vector operations.
     */
    private get baseVectorPath();
    /**
     * Collection-specific path.
     */
    private getPath;
    /**
     * Insert a single vector document.
     *
     * @example
     * ```js
     * const result = await pb.vectors.insert({
     *     vector: [0.1, 0.2, 0.3],
     *     metadata: { category: 'example' },
     *     content: 'Example text'
     * }, { collection: 'documents' });
     * ```
     */
    insert(document: VectorDocument, options?: VectorServiceOptions): Promise<VectorInsertResponse>;
    /**
     * Insert multiple vector documents in a batch.
     *
     * @example
     * ```js
     * const result = await pb.vectors.batchInsert({
     *     documents: [
     *         { vector: [0.1, 0.2, 0.3], content: 'Example 1' },
     *         { vector: [0.4, 0.5, 0.6], content: 'Example 2' }
     *     ],
     *     skipDuplicates: true
     * }, { collection: 'documents' });
     * ```
     */
    batchInsert(data: VectorBatchInsertOptions, options?: VectorServiceOptions): Promise<VectorBatchInsertResponse>;
    /**
     * Update an existing vector document.
     *
     * @example
     * ```js
     * const result = await pb.vectors.update('doc_id', {
     *     vector: [0.1, 0.2, 0.3],
     *     metadata: { updated: true }
     * }, { collection: 'documents' });
     * ```
     */
    update(id: string, document: Partial<VectorDocument>, options?: VectorServiceOptions): Promise<VectorInsertResponse>;
    /**
     * Delete a vector document by ID.
     *
     * @example
     * ```js
     * await pb.vectors.delete('doc_id', { collection: 'documents' });
     * ```
     */
    delete(id: string, options?: VectorServiceOptions): Promise<void>;
    /**
     * Search for similar vectors.
     *
     * @example
     * ```js
     * const results = await pb.vectors.search({
     *     queryVector: [0.1, 0.2, 0.3],
     *     limit: 10,
     *     minScore: 0.7
     * }, { collection: 'documents' });
     * ```
     */
    search(searchOptions: VectorSearchOptions, options?: VectorServiceOptions): Promise<VectorSearchResponse>;
    /**
     * Get a vector document by ID.
     *
     * @example
     * ```js
     * const doc = await pb.vectors.get('doc_id', { collection: 'documents' });
     * ```
     */
    get(id: string, options?: VectorServiceOptions): Promise<VectorDocument>;
    /**
     * List all vector documents in a collection (with optional pagination).
     *
     * @example
     * ```js
     * const docs = await pb.vectors.list({
     *     page: 1,
     *     perPage: 100
     * }, { collection: 'documents' });
     * ```
     */
    list(options?: VectorServiceOptions & {
        page?: number;
        perPage?: number;
    }): Promise<{
        items: VectorDocument[];
        page: number;
        perPage: number;
        totalItems: number;
    }>;
    /**
     * Create or ensure a vector collection/table exists.
     *
     * @example
     * ```js
     * await pb.vectors.createCollection('documents', {
     *     dimension: 384,
     *     distance: 'cosine'
     * });
     * ```
     */
    createCollection(name: string, config?: {
        dimension?: number;
        distance?: string;
    }, options?: VectorServiceOptions): Promise<void>;
    /**
     * Update a vector collection configuration (distance metric and options).
     * Note: Collection name and dimension cannot be changed after creation.
     *
     * @example
     * ```js
     * await pb.vectors.updateCollection('documents', {
     *     distance: 'l2'  // Change from cosine to L2
     * });
     * ```
     */
    updateCollection(name: string, config?: {
        distance?: string;
        options?: Record<string, any>;
    }, options?: VectorServiceOptions): Promise<void>;
    /**
     * Delete a vector collection/table.
     *
     * @example
     * ```js
     * await pb.vectors.deleteCollection('documents');
     * ```
     */
    deleteCollection(name: string, options?: VectorServiceOptions): Promise<void>;
    /**
     * List all available vector collections.
     *
     * @example
     * ```js
     * const collections = await pb.vectors.listCollections();
     * ```
     */
    listCollections(options?: VectorServiceOptions): Promise<Array<{
        name: string;
        dimension?: number;
        count?: number;
    }>>;
}
interface BeforeSendResult {
    [key: string]: any; // for backward compatibility
    url?: string;
    options?: {
        [key: string]: any;
    };
}
/**
 * BosBase JS Client.
 */
declare class Client {
    /**
     * The base BosBase backend url address (eg. 'http://127.0.0.1.8090').
     */
    baseURL: string;
    /**
     * Legacy getter alias for baseURL.
     * @deprecated Please replace with baseURL.
     */
    get baseUrl(): string;
    /**
     * Legacy setter alias for baseURL.
     * @deprecated Please replace with baseURL.
     */
    set baseUrl(v: string);
    /**
     * Hook that get triggered right before sending the fetch request,
     * allowing you to inspect and modify the url and request options.
     *
     * For list of the possible options check https://developer.mozilla.org/en-US/docs/Web/API/fetch#options
     *
     * You can return a non-empty result object `{ url, options }` to replace the url and request options entirely.
     *
     * Example:
     * ```js
     * const pb = new BosBase("https://example.com")
     *
     * pb.beforeSend = function (url, options) {
     *     options.headers = Object.assign({}, options.headers, {
     *         'X-Custom-Header': 'example',
     *     })
     *
     *     return { url, options }
     * }
     *
     * // use the created client as usual...
     * ```
     */
    beforeSend?: (url: string, options: SendOptions) => BeforeSendResult | Promise<BeforeSendResult>;
    /**
     * Hook that get triggered after successfully sending the fetch request,
     * allowing you to inspect/modify the response object and its parsed data.
     *
     * Returns the new Promise resolved `data` that will be returned to the client.
     *
     * Example:
     * ```js
     * const pb = new BosBase("https://example.com")
     *
     * pb.afterSend = function (response, data, options) {
     *     if (response.status != 200) {
     *         throw new ClientResponseError({
     *             url:      response.url,
     *             status:   response.status,
     *             response: { ... },
     *         })
     *     }
     *
     *     return data;
     * }
     *
     * // use the created client as usual...
     * ```
     */
    afterSend?: ((response: Response, data: any) => any) & ((response: Response, data: any, options: SendOptions) => any);
    /**
     * Optional language code (default to `en-US`) that will be sent
     * with the requests to the server as `Accept-Language` header.
     */
    lang: string;
    /**
     * A replaceable instance of the local auth store service.
     */
    authStore: BaseAuthStore;
    /**
     * An instance of the service that handles the **Settings APIs**.
     */
    readonly settings: SettingsService;
    /**
     * An instance of the service that handles the **Collection APIs**.
     */
    readonly collections: CollectionService;
    /**
     * An instance of the service that handles the **File APIs**.
     */
    readonly files: FileService;
    /**
     * An instance of the service that handles the **Log APIs**.
     */
    readonly logs: LogService;
    /**
     * An instance of the service that handles the **Realtime APIs**.
     */
    readonly realtime: RealtimeService;
    /**
     * An instance of the service that handles the **Health APIs**.
     */
    readonly health: HealthService;
    /**
     * An instance of the service that handles the **Backup APIs**.
     */
    readonly backups: BackupService;
    /**
     * An instance of the service that handles the **Cron APIs**.
     */
    readonly crons: CronService;
    /**
     * An instance of the service that handles the **Vector APIs**.
     */
    readonly vectors: VectorService;
    private cancelControllers;
    private recordServices;
    private enableAutoCancellation;
    constructor(baseURL?: string, authStore?: BaseAuthStore | null, lang?: string);
    /**
     * @deprecated
     * With BosBase v0.23.0 admins are converted to a regular auth
     * collection named "_superusers", aka. you can use directly collection("_superusers").
     */
    get admins(): RecordService;
    /**
     * Creates a new batch handler for sending multiple transactional
     * create/update/upsert/delete collection requests in one network call.
     *
     * Example:
     * ```js
     * const batch = pb.createBatch();
     *
     * batch.collection("example1").create({ ... })
     * batch.collection("example2").update("RECORD_ID", { ... })
     * batch.collection("example3").delete("RECORD_ID")
     * batch.collection("example4").upsert({ ... })
     *
     * await batch.send()
     * ```
     */
    createBatch(): BatchService;
    /**
     * Returns the RecordService associated to the specified collection.
     */
    collection<M = RecordModel>(idOrName: string): RecordService<M>;
    /**
     * Globally enable or disable auto cancellation for pending duplicated requests.
     */
    autoCancellation(enable: boolean): Client;
    /**
     * Cancels single request by its cancellation key.
     */
    cancelRequest(requestKey: string): Client;
    /**
     * Cancels all pending requests.
     */
    cancelAllRequests(): Client;
    /**
     * Constructs a filter expression with placeholders populated from a parameters object.
     *
     * Placeholder parameters are defined with the `{:paramName}` notation.
     *
     * The following parameter values are supported:
     *
     * - `string` (_single quotes are autoescaped_)
     * - `number`
     * - `boolean`
     * - `Date` object (_stringified into the BosBase datetime format_)
     * - `null`
     * - everything else is converted to a string using `JSON.stringify()`
     *
     * Example:
     *
     * ```js
     * pb.collection("example").getFirstListItem(pb.filter(
     *    'title ~ {:title} && created >= {:created}',
     *    { title: "example", created: new Date()}
     * ))
     * ```
     */
    filter(raw: string, params?: {
        [key: string]: any;
    }): string;
    /**
     * @deprecated Please use `pb.files.getURL()`.
     */
    getFileUrl(record: {
        [key: string]: any;
    }, filename: string, queryParams?: FileOptions): string;
    /**
     * @deprecated Please use `pb.buildURL()`.
     */
    buildUrl(path: string): string;
    /**
     * Builds a full client url by safely concatenating the provided path.
     */
    buildURL(path: string): string;
    /**
     * Sends an api http request.
     *
     * @throws {ClientResponseError}
     */
    send<T = any>(path: string, options: SendOptions): Promise<T>;
    /**
     * Shallow copy the provided object and takes care to initialize
     * any options required to preserve the backward compatability.
     *
     * @param  {SendOptions} options
     * @return {SendOptions}
     */
    private initSendOptions;
    /**
     * Extracts the header with the provided name in case-insensitive manner.
     * Returns `null` if no header matching the name is found.
     */
    private getHeader;
}
/**
 * ClientResponseError is a custom Error class that is intended to wrap
 * and normalize any error thrown by `Client.send()`.
 */
declare class ClientResponseError extends Error {
    url: string;
    status: number;
    response: {
        [key: string]: any;
    };
    isAbort: boolean;
    originalError: any;
    constructor(errData?: any);
    /**
     * Alias for `this.response` for backward compatibility.
     */
    get data(): {
        [key: string]: any;
    };
    /**
     * Make a POJO's copy of the current error class instance.
     * @see https://github.com/vuex-orm/vuex-orm/issues/255
     */
    toJSON(): this;
}
type AsyncSaveFunc = (serializedPayload: string) => Promise<void>;
type AsyncClearFunc = () => Promise<void>;
/**
 * AsyncAuthStore is a helper auth store implementation
 * that could be used with any external async persistent layer
 * (key-value db, local file, etc.).
 *
 * Here is an example with the React Native AsyncStorage package:
 *
 * ```
 * import AsyncStorage from "@react-native-async-storage/async-storage";
 * import BosBase, { AsyncAuthStore } from "bosbase";
 *
 * const store = new AsyncAuthStore({
 *     save:    async (serialized) => AsyncStorage.setItem("pb_auth", serialized),
 *     initial: AsyncStorage.getItem("pb_auth"),
 * });
 *
 * const pb = new BosBase("https://example.com", store)
 * ```
 */
declare class AsyncAuthStore extends BaseAuthStore {
    private saveFunc;
    private clearFunc?;
    private queue;
    constructor(config: {
        // The async function that is called every time
        // when the auth store state needs to be persisted.
        save: AsyncSaveFunc;
        /// An *optional* async function that is called every time
        /// when the auth store needs to be cleared.
        ///
        /// If not explicitly set, `saveFunc` with empty data will be used.
        clear?: AsyncClearFunc;
        // An *optional* initial data to load into the store.
        initial?: string | Promise<any>;
    });
    /**
     * @inheritdoc
     */
    save(token: string, record?: AuthRecord): void;
    /**
     * @inheritdoc
     */
    clear(): void;
    /**
     * Initializes the auth store state.
     */
    private _loadInitial;
    /**
     * Appends an async function to the queue.
     */
    private _enqueue;
    /**
     * Starts the queue processing.
     */
    private _dequeue;
}
/**
 * The default token store for browsers with auto fallback
 * to runtime/memory if local storage is undefined (e.g. in node env).
 */
declare class LocalAuthStore extends BaseAuthStore {
    private storageFallback;
    private storageKey;
    constructor(storageKey?: string);
    /**
     * @inheritdoc
     */
    get token(): string;
    /**
     * @inheritdoc
     */
    get record(): AuthRecord;
    /**
     * @deprecated use `record` instead.
     */
    get model(): AuthRecord;
    /**
     * @inheritdoc
     */
    save(token: string, record?: AuthRecord): void;
    /**
     * @inheritdoc
     */
    clear(): void;
    // ---------------------------------------------------------------
    // Internal helpers:
    // ---------------------------------------------------------------
    /**
     * Retrieves `key` from the browser's local storage
     * (or runtime/memory if local storage is undefined).
     */
    private _storageGet;
    /**
     * Stores a new data in the browser's local storage
     * (or runtime/memory if local storage is undefined).
     */
    private _storageSet;
    /**
     * Removes `key` from the browser's local storage and the runtime/memory.
     */
    private _storageRemove;
    /**
     * Updates the current store state on localStorage change.
     */
    private _bindStorageEvent;
}
/**
 * Returns JWT token's payload data.
 */
declare function getTokenPayload(token: string): {
    [key: string]: any;
};
/**
 * Checks whether a JWT token is expired or not.
 * Tokens without `exp` payload key are considered valid.
 * Tokens with empty payload (eg. invalid token strings) are considered expired.
 *
 * @param token The token to check.
 * @param [expirationThreshold] Time in seconds that will be subtracted from the token `exp` property.
 */
declare function isTokenExpired(token: string, expirationThreshold?: number): boolean;
export { Client as default, BeforeSendResult, ClientResponseError, CollectionService, HealthCheckResponse, HealthService, HourlyStats, LogService, UnsubscribeFunc, RealtimeService, RecordAuthResponse, AuthProviderInfo, AuthMethodsList, RecordSubscription, OAuth2UrlCallback, OAuth2AuthConfig, OTPResponse, RecordService, CrudService, BatchRequest, BatchRequestResult, BatchService, SubBatchService, VectorServiceOptions, VectorService, AsyncSaveFunc, AsyncClearFunc, AsyncAuthStore, AuthRecord, AuthModel, OnStoreChangeFunc, BaseAuthStore, LocalAuthStore, ListResult, BaseModel, LogModel, RecordModel, CollectionField, TokenConfig, AuthAlertConfig, OTPConfig, MFAConfig, PasswordAuthConfig, OAuth2Provider, OAuth2Config, EmailTemplate, BaseCollectionModel, ViewCollectionModel, AuthCollectionModel, CollectionModel, CollectionFieldSchemaInfo, CollectionSchemaInfo, SendOptions, CommonOptions, ListOptions, FullListOptions, RecordOptions, RecordListOptions, RecordFullListOptions, RecordSubscribeOptions, LogStatsOptions, FileOptions, AuthOptions, normalizeUnknownQueryParams, serializeQueryParams, ParseOptions, cookieParse, SerializeOptions, cookieSerialize, getTokenPayload, isTokenExpired, VectorEmbedding, VectorMetadata, VectorDocument, VectorSearchResult, VectorSearchOptions, VectorBatchInsertOptions, VectorSearchResponse, VectorInsertResponse, VectorBatchInsertResponse, VectorProvider, VectorConfig };
