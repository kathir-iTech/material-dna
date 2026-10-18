// Shared hard limits for the bulk migration workflow.
export const MAX_BATCH_ROWS = 1000;
export const MAX_FILE_BYTES = 3 * 1024 * 1024;
export const MAX_DESCRIPTION_LENGTH = 2000;

// Keep CPU-bound serverless requests bounded; files still accept 1,000 rows.
export const MAX_RESOLVE_CHUNK_ROWS = 25;
