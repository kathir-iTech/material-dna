import type { MaterialRecord } from "@/types/domain";
import { computeCandidateEvaluation, decide } from "./index";
import { criticalConflicts } from "../constraints";
import { CONFIG } from "../config";

// ---------------------------------------------------------------------------
// N-source clustering — constraint-aware MVP.
//
// Connected components over decide()=MATCH pairs, refusing to merge across
// any pair carrying an engineering-critical conflict: a veto SPLIT a component
// instead of being merged through. This is the clustering half of the
// resolution pipeline (propose -> govern -> resolve):
//
//   1. evaluatePair   — score + decide one unordered pair, canonically
//                       oriented (lower record id is "left") so the result is
//                       order-independent.
//   2. buildComponents — union-find over MATCH edges with a cross-component
//                       veto guard; edges are processed deterministically
//                       (finalScore desc, then pair key) so the refusal set
//                       is stable.
//   3. clusterRecords  — full corpus pass: MATCH edges + veto pairs in, clusters,
//                       singletons, held-out proposals and refusals out.
//
// Scope claim (keep exact): this is a constraint-aware MVP over the existing
// demo corpus (98 records). It is NOT production N-source resolution at
// 50+ CPSE scale — no blocking/streaming, no incremental re-clustering, no
// cross-organization governance, no human-in-the-loop promotion workflow.
//
// Honest invariant, verified by tests/clustering.test.ts: on the current
// corpus the merge guard refuses nothing (0 refusals) because decide()
// already vetoes every breaker pair at the edge level — no decide()=MATCH
// edge ever crosses a critical conflict. The guard is the backstop that keeps
// that true if thresholds or tables change; vetoedProposals is where the
// corpus actually shows the split-at-the-veto behaviour (pairs the similarity
// layer would happily chain together).
// ---------------------------------------------------------------------------

export interface PairEvaluation {
  left: string;
  right: string;
  similarity: number;
  finalScore: number;
  decision: "MATCH" | "DO_NOT_MERGE" | "REVIEW" | "NO_MATCH";
  criticalRules: string[];
}

export interface MatchEdge {
  left: string;
  right: string;
  finalScore: number;
}

export interface VetoedProposal {
  left: string;
  right: string;
  similarity: number;
  finalScore: number;
  rules: string[];
}

export interface MergeRefusal {
  edge: MatchEdge;
  blockedBy: { left: string; right: string; rules: string[] };
}

export interface Cluster {
  id: string;
  members: string[];
}

/**
 * What similarity-only clustering would have produced on the same corpus:
 * transitive closure over every pair with semantic similarity >=
 * MATCH_THRESHOLD, decisions and vetoes ignored. `poisoned` counts the
 * multi-member components that would contain an engineering-critical
 * conflict — the honest contrast number for the constraint-aware result.
 */
export interface NaiveClosureStats {
  edges: number;
  multiClusters: number;
  poisoned: number;
}

export interface ClusteringResult {
  clusters: Cluster[];
  singletons: string[];
  matchEdges: MatchEdge[];
  vetoedProposals: VetoedProposal[];
  mergeRefusals: MergeRefusal[];
  naiveClosure: NaiveClosureStats;
}

function pairKey(a: string, b: string): string {
  return a <= b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Evaluate one unordered pair with a canonical orientation (lower record id
 * acts as the left/source record) so decisions do not depend on argument or
 * array order.
 */
export function evaluatePair(a: MaterialRecord, b: MaterialRecord): PairEvaluation {
  const [left, right] = a.id <= b.id ? [a, b] : [b, a];
  const evaluation = computeCandidateEvaluation(
    left.dna,
    right.dna,
    left.rawDescription,
    right.rawDescription
  );
  const decisionInfo = decide(evaluation, evaluation.constraints, left.dna);
  return {
    left: left.id,
    right: right.id,
    similarity: evaluation.semanticSimilarity,
    finalScore: evaluation.finalScore,
    decision: decisionInfo.decision,
    criticalRules: criticalConflicts(evaluation.constraints).map((c) => c.rule),
  };
}

interface UnionFind {
  parent: Map<string, string>;
  members: Map<string, string[]>;
}

function ufFind(uf: UnionFind, x: string): string {
  let root = x;
  while (uf.parent.get(root) !== root) root = uf.parent.get(root) as string;
  // Path compression.
  let cur = x;
  while (uf.parent.get(cur) !== root) {
    const next = uf.parent.get(cur) as string;
    uf.parent.set(cur, root);
    cur = next;
  }
  return root;
}

/**
 * Union-find over MATCH edges with the cross-component veto guard.
 *
 * `vetoPairs` maps canonical pair key -> critical rule names for every pair
 * carrying an engineering-critical conflict. Before merging the components
 * that hold the two endpoints of an edge, every cross pair between the
 * components is checked; any veto refuses the merge (recorded once per edge).
 * Singletons are never veto-checked — a lone record cannot conflict.
 *
 * Both inputs are sorted before processing so refusals (and therefore final
 * clusters) are deterministic.
 */
export function buildComponents(
  nodeIds: string[],
  matchEdges: MatchEdge[],
  vetoPairs: Map<string, string[]>
): { clusters: Cluster[]; singletons: string[]; refusals: MergeRefusal[] } {
  const uf: UnionFind = { parent: new Map(), members: new Map() };
  for (const id of nodeIds) {
    uf.parent.set(id, id);
    uf.members.set(id, [id]);
  }

  const orderedEdges = [...matchEdges].sort(
    (a, b) => b.finalScore - a.finalScore || pairKey(a.left, a.right).localeCompare(pairKey(b.left, b.right))
  );

  const refusals: MergeRefusal[] = [];
  for (const edge of orderedEdges) {
    const rootA = ufFind(uf, edge.left);
    const rootB = ufFind(uf, edge.right);
    if (rootA === rootB) continue;

    const membersA = uf.members.get(rootA) as string[];
    const membersB = uf.members.get(rootB) as string[];

    let blocked: MergeRefusal | null = null;
    for (const x of membersA) {
      for (const y of membersB) {
        const rules = vetoPairs.get(pairKey(x, y));
        if (rules) {
          blocked = { edge, blockedBy: { left: x, right: y, rules } };
          break;
        }
      }
      if (blocked) break;
    }
    if (blocked) {
      refusals.push(blocked);
      continue;
    }

    // Merge B into A deterministically: smaller first-member id stays root.
    const [keepRoot, dropRoot] =
      (membersA[0] as string) <= (membersB[0] as string) ? [rootA, rootB] : [rootB, rootA];
    const keepMembers = uf.members.get(keepRoot) as string[];
    const dropMembers = uf.members.get(dropRoot) as string[];
    keepMembers.push(...dropMembers);
    keepMembers.sort();
    uf.members.set(keepRoot, keepMembers);
    uf.parent.set(dropRoot, keepRoot);
    uf.members.delete(dropRoot);
  }

  const multiMember = [...uf.members.values()].filter((m) => m.length >= 2);
  multiMember.sort(
    (a, b) => b.length - a.length || (a[0] as string).localeCompare(b[0] as string)
  );
  const clusters: Cluster[] = multiMember.map((members, i) => ({
    id: `CL-${String(i + 1).padStart(2, "0")}`,
    members,
  }));
  const singletons = [...uf.members.values()]
    .filter((m) => m.length === 1)
    .map((m) => m[0] as string)
    .sort();

  return { clusters, singletons, refusals };
}

/**
 * Full clustering pass over a record corpus.
 *
 * Edges  = pairs decide() decides MATCH.
 * Vetoed = pairs with semantic similarity >= MATCH_THRESHOLD carrying at
 *          least one engineering-critical conflict — the "looks like a match
 *          to similarity, held out by the constraints" set (the
 *          transitivity-breaker triples are built from these).
 */
export function clusterRecords(records: MaterialRecord[]): ClusteringResult {
  const nodeIds: string[] = records.map((r) => r.id).sort();
  const matchEdges: MatchEdge[] = [];
  const vetoPairs = new Map<string, string[]>();
  const vetoedProposals: VetoedProposal[] = [];

  // Naive similarity closure runs in the same pass (decisions ignored).
  const naiveParent = records.map((_, i) => i);
  const naiveFind = (x: number): number =>
    naiveParent[x] === x ? x : (naiveParent[x] = naiveFind(naiveParent[x] as number));
  let naiveEdgeCount = 0;

  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const pair = evaluatePair(records[i] as MaterialRecord, records[j] as MaterialRecord);
      const key = pairKey(pair.left, pair.right);
      if (pair.criticalRules.length > 0) vetoPairs.set(key, pair.criticalRules);
      if (pair.decision === "MATCH") {
        matchEdges.push({ left: pair.left, right: pair.right, finalScore: pair.finalScore });
      }
      if (pair.similarity >= CONFIG.MATCH_THRESHOLD && pair.criticalRules.length > 0) {
        vetoedProposals.push({
          left: pair.left,
          right: pair.right,
          similarity: pair.similarity,
          finalScore: pair.finalScore,
          rules: pair.criticalRules,
        });
      }
      if (pair.similarity >= CONFIG.MATCH_THRESHOLD) {
        naiveEdgeCount++;
        const a = naiveFind(i);
        const b = naiveFind(j);
        if (a !== b) naiveParent[a] = b;
      }
    }
  }

  // Naive closure stats: multi-member components and how many of them are
  // poisoned (contain at least one engineering-critical conflict internally).
  const naiveGroups = new Map<number, number[]>();
  for (let i = 0; i < records.length; i++) {
    const root = naiveFind(i);
    const group = naiveGroups.get(root);
    if (group) group.push(i);
    else naiveGroups.set(root, [i]);
  }
  let naiveMultiClusters = 0;
  let naivePoisoned = 0;
  for (const group of naiveGroups.values()) {
    if (group.length < 2) continue;
    naiveMultiClusters++;
    let poisoned = false;
    for (const ia of group) {
      for (const ib of group) {
        if (ia >= ib) continue;
        const a = (records[ia] as MaterialRecord).id;
        const b = (records[ib] as MaterialRecord).id;
        if (vetoPairs.has(pairKey(a, b))) {
          poisoned = true;
          break;
        }
      }
      if (poisoned) break;
    }
    if (poisoned) naivePoisoned++;
  }

  matchEdges.sort(
    (a, b) => b.finalScore - a.finalScore || pairKey(a.left, a.right).localeCompare(pairKey(b.left, b.right))
  );
  vetoedProposals.sort(
    (a, b) =>
      b.similarity - a.similarity ||
      pairKey(a.left, a.right).localeCompare(pairKey(b.left, b.right))
  );

  const { clusters, singletons, refusals } = buildComponents(nodeIds, matchEdges, vetoPairs);

  return {
    clusters,
    singletons,
    matchEdges,
    vetoedProposals,
    mergeRefusals: refusals,
    naiveClosure: {
      edges: naiveEdgeCount,
      multiClusters: naiveMultiClusters,
      poisoned: naivePoisoned,
    },
  };
}
