import type { MigrationResolveResult } from "@/types/domain";
import type { BatchResolveInput } from "./batch";
import { MAX_RESOLVE_CHUNK_ROWS } from "./limits";
interface ChunkResult {
  results: MigrationResolveResult[];
  versions: { engine: string; parser: string; constraints: string };
}
/** Stage every validated chunk before changing the saved batch; failure is atomic. */
export async function resolveInChunks(
  inputs: BatchResolveInput[],
  send: (rows: BatchResolveInput[]) => Promise<ChunkResult>,
  progress: (completed: number) => void,
): Promise<ChunkResult> {
  const results: MigrationResolveResult[] = [];
  let versions: ChunkResult["versions"] | null = null;
  for (let start = 0; start < inputs.length; start += MAX_RESOLVE_CHUNK_ROWS) {
    const chunk = inputs.slice(start, start + MAX_RESOLVE_CHUNK_ROWS),
      response = await send(chunk);
    const ids = new Set(chunk.map((r) => r.rowId));
    if (
      response.results.length !== chunk.length ||
      new Set(response.results.map((r) => r.rowId)).size !== ids.size ||
      response.results.some((r) => !ids.has(r.rowId))
    )
      throw new Error(
        "The server returned an incomplete chunk. No batch decisions were applied; retry resolution.",
      );
    if (
      versions &&
      JSON.stringify(versions) !== JSON.stringify(response.versions)
    )
      throw new Error(
        "The engine changed during processing. No batch decisions were applied; retry with a consistent configuration.",
      );
    versions = response.versions;
    results.push(...response.results);
    progress(results.length);
  }
  if (!versions) throw new Error("The batch contains no rows to resolve.");
  return { results, versions };
}
