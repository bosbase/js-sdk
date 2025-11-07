import { CrudService } from "@/services/CrudService";
import { CollectionModel, CollectionField, CollectionSchemaInfo } from "@/tools/dtos";
import { CommonOptions } from "@/tools/options";

export class CollectionService extends CrudService<CollectionModel> {
    /**
     * @inheritdoc
     */
    get baseCrudPath(): string {
        return "/api/collections";
    }

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
    async deleteCollection(
        collectionIdOrName: string,
        options?: CommonOptions,
    ): Promise<boolean> {
        return this.delete(collectionIdOrName, options);
    }

    /**
     * Returns type indexed map with scaffolded collection models
     * populated with their default field values.
     *
     * @throws {ClientResponseError}
     */
    async getScaffolds(
        options?: CommonOptions,
    ): Promise<{ [key: string]: CollectionModel }> {
        options = Object.assign(
            {
                method: "GET",
            },
            options,
        );

        return this.client.send(this.baseCrudPath + "/meta/scaffolds", options);
    }

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
    async createFromScaffold(
        type: "base" | "auth" | "view",
        name: string,
        overrides?: Partial<CollectionModel>,
        options?: CommonOptions,
    ): Promise<CollectionModel> {
        const scaffolds = await this.getScaffolds(options);
        const scaffold = scaffolds[type];
        
        if (!scaffold) {
            throw new Error(`Scaffold for type "${type}" not found`);
        }

        // Create collection based on scaffold with overrides
        const collection = {
            ...scaffold,
            name: name,
            ...overrides,
        } as CollectionModel;

        return this.create(collection, options);
    }

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
    async createBase(
        name: string,
        overrides?: Partial<CollectionModel>,
        options?: CommonOptions,
    ): Promise<CollectionModel> {
        return this.createFromScaffold("base", name, overrides, options);
    }

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
    async createAuth(
        name: string,
        overrides?: Partial<CollectionModel>,
        options?: CommonOptions,
    ): Promise<CollectionModel> {
        return this.createFromScaffold("auth", name, overrides, options);
    }

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
    async createView(
        name: string,
        viewQuery?: string,
        overrides?: Partial<CollectionModel>,
        options?: CommonOptions,
    ): Promise<CollectionModel> {
        const scaffoldOverrides: Partial<CollectionModel> = {
            ...overrides,
            ...(viewQuery ? { viewQuery } : {}),
        };
        return this.createFromScaffold("view", name, scaffoldOverrides, options);
    }

    /**
     * Deletes all records associated with the specified collection.
     *
     * @throws {ClientResponseError}
     */
    async truncate(collectionIdOrName: string, options?: CommonOptions): Promise<true> {
        options = Object.assign(
            {
                method: "DELETE",
            },
            options,
        );

        return this.client
            .send(
                this.baseCrudPath +
                    "/" +
                    encodeURIComponent(collectionIdOrName) +
                    "/truncate",
                options,
            )
            .then(() => true);
    }

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
    async exportCollections(
        filterCollections?: (collection: CollectionModel) => boolean,
        options?: CommonOptions,
    ): Promise<Array<CollectionModel>> {
        const collections = await this.getFullList<CollectionModel>(options);
        
        // Filter if a filter function is provided
        let filtered = filterCollections 
            ? collections.filter(filterCollections)
            : collections;

        // Clean collections for export (matching UI behavior)
        const cleaned = filtered.map((collection) => {
            const cleaned = { ...collection };
            
            // Remove timestamps
            delete (cleaned as any).created;
            delete (cleaned as any).updated;
            
            // Remove OAuth2 providers
            if ((cleaned as any).oauth2?.providers) {
                delete (cleaned as any).oauth2.providers;
            }
            
            return cleaned;
        });

        return cleaned;
    }

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
    normalizeForImport(collections: Array<CollectionModel>): Array<CollectionModel> {
        // Remove duplicates by id
        const seenIds = new Set<string>();
        const uniqueCollections = collections.filter((collection) => {
            if (collection.id && seenIds.has(collection.id)) {
                return false;
            }
            if (collection.id) {
                seenIds.add(collection.id);
            }
            return true;
        });

        // Normalize each collection
        return uniqueCollections.map((collection) => {
            const normalized = { ...collection };
            
            // Remove timestamps
            delete (normalized as any).created;
            delete (normalized as any).updated;
            
            // Remove duplicate fields by id
            if (Array.isArray(normalized.fields)) {
                const seenFieldIds = new Set<string>();
                normalized.fields = normalized.fields.filter((field: any) => {
                    if (field.id && seenFieldIds.has(field.id)) {
                        return false;
                    }
                    if (field.id) {
                        seenFieldIds.add(field.id);
                    }
                    return true;
                });
            }
            
            return normalized;
        });
    }

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
    async import(
        collections: Array<CollectionModel>,
        deleteMissing: boolean = false,
        options?: CommonOptions,
    ): Promise<true> {
        options = Object.assign(
            {
                method: "PUT",
                body: {
                    collections: collections,
                    deleteMissing: deleteMissing,
                },
            },
            options,
        );

        return this.client.send(this.baseCrudPath + "/import", options).then(() => true);
    }

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
    async addField(
        collectionIdOrName: string,
        field: Partial<CollectionField>,
        options?: CommonOptions,
    ): Promise<CollectionModel> {
        const collection = await this.getOne(collectionIdOrName, options);
        
        if (!field.name || !field.type) {
            throw new Error("Field name and type are required");
        }

        // Check if field with this name already exists
        if (collection.fields.find((f) => f.name === field.name)) {
            throw new Error(`Field with name "${field.name}" already exists`);
        }

        // Initialize field with defaults
        const newField: CollectionField = {
            id: "",
            name: field.name,
            type: field.type,
            system: false,
            hidden: field.hidden ?? false,
            presentable: field.presentable ?? false,
            required: field.required ?? false,
            ...field,
        };

        collection.fields.push(newField);

        return this.update(collectionIdOrName, collection, options);
    }

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
    async updateField(
        collectionIdOrName: string,
        fieldName: string,
        updates: Partial<CollectionField>,
        options?: CommonOptions,
    ): Promise<CollectionModel> {
        const collection = await this.getOne(collectionIdOrName, options);
        
        const fieldIndex = collection.fields.findIndex((f) => f.name === fieldName);
        if (fieldIndex === -1) {
            throw new Error(`Field with name "${fieldName}" not found`);
        }

        const field = collection.fields[fieldIndex];
        
        // Don't allow changing system fields
        if (field.system && (updates.type || updates.name)) {
            throw new Error("Cannot modify system fields");
        }

        // If renaming, check for name conflicts
        if (updates.name && updates.name !== fieldName) {
            if (collection.fields.find((f) => f.name === updates.name && f.name !== fieldName)) {
                throw new Error(`Field with name "${updates.name}" already exists`);
            }
        }

        // Apply updates
        Object.assign(field, updates);
        collection.fields[fieldIndex] = field;

        return this.update(collectionIdOrName, collection, options);
    }

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
    async removeField(
        collectionIdOrName: string,
        fieldName: string,
        options?: CommonOptions,
    ): Promise<CollectionModel> {
        const collection = await this.getOne(collectionIdOrName, options);
        
        const fieldIndex = collection.fields.findIndex((f) => f.name === fieldName);
        if (fieldIndex === -1) {
            throw new Error(`Field with name "${fieldName}" not found`);
        }

        const field = collection.fields[fieldIndex];
        
        // Don't allow removing system fields
        if (field.system) {
            throw new Error("Cannot remove system fields");
        }

        // Remove the field
        collection.fields.splice(fieldIndex, 1);

        // Remove indexes that reference this field
        collection.indexes = collection.indexes.filter((idx) => {
            // Parse index string to check if it contains this field
            // Index format is typically like: "CREATE INDEX idx_name ON table_name (column1, column2)"
            return !idx.includes(`(${fieldName})`) && !idx.includes(`(${fieldName},`) && !idx.includes(`, ${fieldName})`);
        });

        return this.update(collectionIdOrName, collection, options);
    }

    /**
     * Gets a field by name from the collection.
     * 
     * @param collectionIdOrName - Collection id or name
     * @param fieldName - Name of the field to retrieve
     * @param options - Optional request options
     * @returns Field object or undefined if not found
     * @throws {ClientResponseError}
     */
    async getField(
        collectionIdOrName: string,
        fieldName: string,
        options?: CommonOptions,
    ): Promise<CollectionField | undefined> {
        const collection = await this.getOne(collectionIdOrName, options);
        return collection.fields.find((f) => f.name === fieldName);
    }

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
    async addIndex(
        collectionIdOrName: string,
        columns: Array<string>,
        unique: boolean = false,
        indexName?: string,
        options?: CommonOptions,
    ): Promise<CollectionModel> {
        const collection = await this.getOne(collectionIdOrName, options);
        
        if (!columns || columns.length === 0) {
            throw new Error("At least one column must be specified");
        }

        // Validate that all columns exist
        const fieldNames = collection.fields.map((f) => f.name);
        for (const column of columns) {
            if (column !== "id" && !fieldNames.includes(column)) {
                throw new Error(`Field "${column}" does not exist in the collection`);
            }
        }

        // Generate index name if not provided
        const idxName = indexName || `idx_${collection.name}_${columns.join("_")}`;
        const columnsStr = columns.map(col => `\`${col}\``).join(", ");
        const index = unique
            ? `CREATE UNIQUE INDEX \`${idxName}\` ON \`${collection.name}\` (${columnsStr})`
            : `CREATE INDEX \`${idxName}\` ON \`${collection.name}\` (${columnsStr})`;

        // Check if index already exists
        if (collection.indexes.includes(index)) {
            throw new Error("Index already exists");
        }

        collection.indexes.push(index);

        return this.update(collectionIdOrName, collection, options);
    }

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
    async removeIndex(
        collectionIdOrName: string,
        columns: Array<string>,
        options?: CommonOptions,
    ): Promise<CollectionModel> {
        const collection = await this.getOne(collectionIdOrName, options);
        
        if (!columns || columns.length === 0) {
            throw new Error("At least one column must be specified");
        }

        // Find and remove indexes that match the columns
        const initialLength = collection.indexes.length;
        collection.indexes = collection.indexes.filter((idx) => {
            // Check if index contains all the specified columns
            // Handle both backticked and non-backticked formats
            const hasAllColumns = columns.every(col => {
                return idx.includes(`\`${col}\``) || idx.includes(`(${col})`) || 
                       idx.includes(`(${col},`) || idx.includes(`, ${col})`);
            });
            return !hasAllColumns;
        });

        if (collection.indexes.length === initialLength) {
            throw new Error("Index not found");
        }

        return this.update(collectionIdOrName, collection, options);
    }

    /**
     * Gets all indexes for the collection.
     * 
     * @param collectionIdOrName - Collection id or name
     * @param options - Optional request options
     * @returns Array of index strings
     * @throws {ClientResponseError}
     */
    async getIndexes(
        collectionIdOrName: string,
        options?: CommonOptions,
    ): Promise<Array<string>> {
        const collection = await this.getOne(collectionIdOrName, options);
        return collection.indexes || [];
    }

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
    async setListRule(
        collectionIdOrName: string,
        rule: string | null,
        options?: CommonOptions,
    ): Promise<CollectionModel> {
        const collection = await this.getOne(collectionIdOrName, options);
        collection.listRule = rule || undefined;
        return this.update(collectionIdOrName, collection, options);
    }

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
    async setViewRule(
        collectionIdOrName: string,
        rule: string | null,
        options?: CommonOptions,
    ): Promise<CollectionModel> {
        const collection = await this.getOne(collectionIdOrName, options);
        collection.viewRule = rule || undefined;
        return this.update(collectionIdOrName, collection, options);
    }

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
    async setCreateRule(
        collectionIdOrName: string,
        rule: string | null,
        options?: CommonOptions,
    ): Promise<CollectionModel> {
        const collection = await this.getOne(collectionIdOrName, options);
        collection.createRule = rule || undefined;
        return this.update(collectionIdOrName, collection, options);
    }

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
    async setUpdateRule(
        collectionIdOrName: string,
        rule: string | null,
        options?: CommonOptions,
    ): Promise<CollectionModel> {
        const collection = await this.getOne(collectionIdOrName, options);
        collection.updateRule = rule || undefined;
        return this.update(collectionIdOrName, collection, options);
    }

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
    async setDeleteRule(
        collectionIdOrName: string,
        rule: string | null,
        options?: CommonOptions,
    ): Promise<CollectionModel> {
        const collection = await this.getOne(collectionIdOrName, options);
        collection.deleteRule = rule || undefined;
        return this.update(collectionIdOrName, collection, options);
    }

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
    async setRules(
        collectionIdOrName: string,
        rules: {
            listRule?: string | null;
            viewRule?: string | null;
            createRule?: string | null;
            updateRule?: string | null;
            deleteRule?: string | null;
        },
        options?: CommonOptions,
    ): Promise<CollectionModel> {
        const collection = await this.getOne(collectionIdOrName, options);
        
        if (rules.listRule !== undefined) {
            collection.listRule = rules.listRule || undefined;
        }
        if (rules.viewRule !== undefined) {
            collection.viewRule = rules.viewRule || undefined;
        }
        if (rules.createRule !== undefined) {
            collection.createRule = rules.createRule || undefined;
        }
        if (rules.updateRule !== undefined) {
            collection.updateRule = rules.updateRule || undefined;
        }
        if (rules.deleteRule !== undefined) {
            collection.deleteRule = rules.deleteRule || undefined;
        }
        
        return this.update(collectionIdOrName, collection, options);
    }

    /**
     * Gets all API rules for the collection.
     * 
     * @param collectionIdOrName - Collection id or name
     * @param options - Optional request options
     * @returns Object containing all rules (listRule, viewRule, createRule, updateRule, deleteRule)
     * @throws {ClientResponseError}
     */
    async getRules(
        collectionIdOrName: string,
        options?: CommonOptions,
    ): Promise<{
        listRule?: string;
        viewRule?: string;
        createRule?: string;
        updateRule?: string;
        deleteRule?: string;
    }> {
        const collection = await this.getOne(collectionIdOrName, options);
        return {
            listRule: collection.listRule || undefined,
            viewRule: collection.viewRule || undefined,
            createRule: collection.createRule || undefined,
            updateRule: collection.updateRule || undefined,
            deleteRule: collection.deleteRule || undefined,
        };
    }

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
    async setManageRule(
        collectionIdOrName: string,
        rule: string | null,
        options?: CommonOptions,
    ): Promise<CollectionModel> {
        const collection = await this.getOne(collectionIdOrName, options);
        
        if (collection.type !== "auth") {
            throw new Error("ManageRule is only available for auth collections");
        }
        
        // AuthCollectionModel has manageRule as a direct property
        const authCollection = collection as any;
        authCollection.manageRule = rule || undefined;
        
        return this.update(collectionIdOrName, collection, options);
    }

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
    async setAuthRule(
        collectionIdOrName: string,
        rule: string | null,
        options?: CommonOptions,
    ): Promise<CollectionModel> {
        const collection = await this.getOne(collectionIdOrName, options);
        
        if (collection.type !== "auth") {
            throw new Error("AuthRule is only available for auth collections");
        }
        
        // AuthCollectionModel has authRule as a direct property
        const authCollection = collection as any;
        authCollection.authRule = rule || undefined;
        
        return this.update(collectionIdOrName, collection, options);
    }

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
    async getSchema(
        collectionIdOrName: string,
        options?: CommonOptions,
    ): Promise<CollectionSchemaInfo> {
        options = Object.assign(
            {
                method: "GET",
            },
            options,
        );

        return this.client.send<CollectionSchemaInfo>(
            this.baseCrudPath + "/" + encodeURIComponent(collectionIdOrName) + "/schema",
            options,
        );
    }

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
    async getAllSchemas(
        options?: CommonOptions,
    ): Promise<{ collections: Array<CollectionSchemaInfo> }> {
        options = Object.assign(
            {
                method: "GET",
            },
            options,
        );

        return this.client.send<{ collections: Array<CollectionSchemaInfo> }>(
            this.baseCrudPath + "/schemas",
            options,
        );
    }

    // -------------------------------------------------------------------
    // OAuth2 Configuration Methods
    // -------------------------------------------------------------------

    /**
     * Enables OAuth2 authentication for an auth collection.
     * 
     * @param collectionIdOrName - Auth collection id or name
     * @param options - Optional request options
     * @returns Updated collection model
     * @throws {ClientResponseError} if collection is not an auth collection
     */
    async enableOAuth2(
        collectionIdOrName: string,
        options?: CommonOptions,
    ): Promise<CollectionModel> {
        const collection = await this.getOne(collectionIdOrName, options);
        
        if (collection.type !== "auth") {
            throw new Error("OAuth2 is only available for auth collections");
        }
        
        const authCollection = collection as any;
        if (!authCollection.oauth2) {
            authCollection.oauth2 = { enabled: true, mappedFields: {}, providers: [] };
        } else {
            authCollection.oauth2.enabled = true;
        }
        
        return this.update(collectionIdOrName, collection, options);
    }

    /**
     * Disables OAuth2 authentication for an auth collection.
     * 
     * @param collectionIdOrName - Auth collection id or name
     * @param options - Optional request options
     * @returns Updated collection model
     * @throws {ClientResponseError} if collection is not an auth collection
     */
    async disableOAuth2(
        collectionIdOrName: string,
        options?: CommonOptions,
    ): Promise<CollectionModel> {
        const collection = await this.getOne(collectionIdOrName, options);
        
        if (collection.type !== "auth") {
            throw new Error("OAuth2 is only available for auth collections");
        }
        
        const authCollection = collection as any;
        if (authCollection.oauth2) {
            authCollection.oauth2.enabled = false;
        }
        
        return this.update(collectionIdOrName, collection, options);
    }

    /**
     * Gets the OAuth2 configuration for an auth collection.
     * 
     * @param collectionIdOrName - Auth collection id or name
     * @param options - Optional request options
     * @returns OAuth2 configuration object
     * @throws {ClientResponseError} if collection is not an auth collection
     */
    async getOAuth2Config(
        collectionIdOrName: string,
        options?: CommonOptions,
    ): Promise<{ enabled: boolean; mappedFields: { [key: string]: string }; providers: Array<any> }> {
        const collection = await this.getOne(collectionIdOrName, options);
        
        if (collection.type !== "auth") {
            throw new Error("OAuth2 is only available for auth collections");
        }
        
        const authCollection = collection as any;
        return {
            enabled: authCollection.oauth2?.enabled ?? false,
            mappedFields: authCollection.oauth2?.mappedFields ?? {},
            providers: authCollection.oauth2?.providers ?? [],
        };
    }

    /**
     * Sets the OAuth2 mapped fields for an auth collection.
     * 
     * Mapped fields define how OAuth2 provider user data maps to collection fields.
     * For example: { "name": "name", "email": "email", "avatarUrl": "avatar" }
     * 
     * @param collectionIdOrName - Auth collection id or name
     * @param mappedFields - Object mapping OAuth2 fields to collection fields
     * @param options - Optional request options
     * @returns Updated collection model
     * @throws {ClientResponseError} if collection is not an auth collection
     */
    async setOAuth2MappedFields(
        collectionIdOrName: string,
        mappedFields: { [key: string]: string },
        options?: CommonOptions,
    ): Promise<CollectionModel> {
        const collection = await this.getOne(collectionIdOrName, options);
        
        if (collection.type !== "auth") {
            throw new Error("OAuth2 is only available for auth collections");
        }
        
        const authCollection = collection as any;
        if (!authCollection.oauth2) {
            authCollection.oauth2 = { enabled: false, mappedFields: {}, providers: [] };
        }
        authCollection.oauth2.mappedFields = mappedFields;
        
        return this.update(collectionIdOrName, collection, options);
    }

    /**
     * Adds a new OAuth2 provider to an auth collection.
     * 
     * Before using this method, you need to:
     * 1. Create an OAuth2 app in the provider's dashboard
     * 2. Get the Client ID and Client Secret
     * 3. Register a redirect URL (typically: https://yourdomain.com/api/oauth2-redirect)
     * 
     * Supported provider names include: "google", "github", "gitlab", "discord", 
     * "facebook", "microsoft", "apple", "twitter", "spotify", "kakao", "twitch", 
     * "strava", "vk", "yandex", "patreon", "linkedin", "instagram", "vimeo", 
     * "digitalocean", "bitbucket", "dropbox", "planningcenter", "notion", "linear", 
     * "oidc", "oidc2", "oidc3", and more.
     * 
     * @param collectionIdOrName - Auth collection id or name
     * @param provider - OAuth2 provider configuration
     * @param options - Optional request options
     * @returns Updated collection model
     * @throws {ClientResponseError} if collection is not an auth collection or provider is invalid
     */
    async addOAuth2Provider(
        collectionIdOrName: string,
        provider: {
            name: string;
            clientId: string;
            clientSecret: string;
            authURL: string;
            tokenURL: string;
            userInfoURL: string;
            displayName?: string;
            pkce?: boolean;
            extra?: { [key: string]: any };
        },
        options?: CommonOptions,
    ): Promise<CollectionModel> {
        const collection = await this.getOne(collectionIdOrName, options);
        
        if (collection.type !== "auth") {
            throw new Error("OAuth2 is only available for auth collections");
        }
        
        const authCollection = collection as any;
        if (!authCollection.oauth2) {
            authCollection.oauth2 = { enabled: false, mappedFields: {}, providers: [] };
        }
        
        // Check if provider with this name already exists
        const existingProvider = authCollection.oauth2.providers.find(
            (p: any) => p.name === provider.name
        );
        if (existingProvider) {
            throw new Error(`OAuth2 provider with name "${provider.name}" already exists`);
        }
        
        // Add the new provider
        authCollection.oauth2.providers.push({
            name: provider.name,
            clientId: provider.clientId,
            clientSecret: provider.clientSecret,
            authURL: provider.authURL,
            tokenURL: provider.tokenURL,
            userInfoURL: provider.userInfoURL,
            displayName: provider.displayName || provider.name,
            pkce: provider.pkce,
            extra: provider.extra,
        });
        
        return this.update(collectionIdOrName, collection, options);
    }

    /**
     * Updates an existing OAuth2 provider in an auth collection.
     * 
     * @param collectionIdOrName - Auth collection id or name
     * @param providerName - Name of the provider to update
     * @param updates - Partial provider configuration to update
     * @param options - Optional request options
     * @returns Updated collection model
     * @throws {ClientResponseError} if collection is not an auth collection or provider not found
     */
    async updateOAuth2Provider(
        collectionIdOrName: string,
        providerName: string,
        updates: Partial<{
            clientId: string;
            clientSecret: string;
            authURL: string;
            tokenURL: string;
            userInfoURL: string;
            displayName: string;
            pkce: boolean;
            extra: { [key: string]: any };
        }>,
        options?: CommonOptions,
    ): Promise<CollectionModel> {
        const collection = await this.getOne(collectionIdOrName, options);
        
        if (collection.type !== "auth") {
            throw new Error("OAuth2 is only available for auth collections");
        }
        
        const authCollection = collection as any;
        if (!authCollection.oauth2) {
            throw new Error("OAuth2 is not configured for this collection");
        }
        
        const providerIndex = authCollection.oauth2.providers.findIndex(
            (p: any) => p.name === providerName
        );
        if (providerIndex === -1) {
            throw new Error(`OAuth2 provider with name "${providerName}" not found`);
        }
        
        // Update the provider
        const provider = authCollection.oauth2.providers[providerIndex];
        Object.assign(provider, updates);
        authCollection.oauth2.providers[providerIndex] = provider;
        
        return this.update(collectionIdOrName, collection, options);
    }

    /**
     * Removes an OAuth2 provider from an auth collection.
     * 
     * @param collectionIdOrName - Auth collection id or name
     * @param providerName - Name of the provider to remove
     * @param options - Optional request options
     * @returns Updated collection model
     * @throws {ClientResponseError} if collection is not an auth collection or provider not found
     */
    async removeOAuth2Provider(
        collectionIdOrName: string,
        providerName: string,
        options?: CommonOptions,
    ): Promise<CollectionModel> {
        const collection = await this.getOne(collectionIdOrName, options);
        
        if (collection.type !== "auth") {
            throw new Error("OAuth2 is only available for auth collections");
        }
        
        const authCollection = collection as any;
        if (!authCollection.oauth2) {
            throw new Error("OAuth2 is not configured for this collection");
        }
        
        const providerIndex = authCollection.oauth2.providers.findIndex(
            (p: any) => p.name === providerName
        );
        if (providerIndex === -1) {
            throw new Error(`OAuth2 provider with name "${providerName}" not found`);
        }
        
        // Remove the provider
        authCollection.oauth2.providers.splice(providerIndex, 1);
        
        return this.update(collectionIdOrName, collection, options);
    }
}
