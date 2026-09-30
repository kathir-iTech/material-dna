import { materialRecords } from "@/data/demo";
import { clusterRecords, type ClusteringResult } from "./matching/clustering";

// Memoized corpus clustering pass — mirrors dataset-stats.ts (own module to
// keep the data/demo <-> matcher import graph acyclic). The full pass is
// O(n²) over the 98-record corpus; computed once per process.

let cache: ClusteringResult | null = null;

export function corpusClusters(): ClusteringResult {
  if (!cache) cache = clusterRecords(materialRecords);
  return cache;
}
