import { CrudService } from "@/services/CrudService";
import { CollectionModel, CollectionField } from "@/tools/dtos";
import { CommonOptions } from "@/tools/options";

export class CollectionService extends CrudService<CollectionModel> {
    /**
     * @inheritdoc
     */
    get baseCrudPath(): string {
        return "/api/collections";
    }

    /**
     * Imports the provided collections.
     *
     * If `deleteMissing` is `true`, all local collections and their fields,
     * that are not present in the imported configuration, WILL BE DELETED
     * (including their related records data)!
     *
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
     * Removes a field from the collection.
     * 
     * @param collectionIdOrName - Collection id or name
     * @param fieldName - Name of the field to remove
     * @param options - Optional request options
     * @returns Updated collection model
     * @throws {ClientResponseError}
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
     * Removes an index from the collection.
     * 
     * @param collectionIdOrName - Collection id or name
     * @param columns - Array of column names that identify the index to remove
     * @param options - Optional request options
     * @returns Updated collection model
     * @throws {ClientResponseError}
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
        const columnsStrWithBackticks = columns.map(col => `\`${col}\``).join(", ");
        const columnsStr = columns.join(", ");
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
    // Access Rights Management Helpers
    // -------------------------------------------------------------------

    /**
     * Sets the list rule (read/list access rule) for the collection.
     * 
     * @param collectionIdOrName - Collection id or name
     * @param rule - Rule expression (use null or empty string to remove)
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
     * @param collectionIdOrName - Collection id or name
     * @param rule - Rule expression (use null or empty string to remove)
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
     * @param collectionIdOrName - Collection id or name
     * @param rule - Rule expression (use null or empty string to remove)
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
     * @param collectionIdOrName - Collection id or name
     * @param rule - Rule expression (use null or empty string to remove)
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
     * @param collectionIdOrName - Collection id or name
     * @param rule - Rule expression (use null or empty string to remove)
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
}
