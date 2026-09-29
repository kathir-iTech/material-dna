import { materialRecords } from "@/data/demo";
import { fuzzTokens } from "../normalization";

// ---------------------------------------------------------------------------
// Real TF-IDF over the demo corpus. Pure TypeScript, no external dependency.
//
// IDF is computed ONCE from the corpus in src/data/demo.ts at module init
// (build/init time) and reused for every candidate pair. It is never rebuilt
// per request.
//
//   tf(t, d)  = raw term frequency of t in document d
//   idf(t)    = ln((N + 1) / (df(t) + 1)) + 1     (smoothed; scikit-learn style)
//   score     = 100 * cosine(tf-idf(a), tf-idf(b))
//
// The smoothed IDF is strictly decreasing in document frequency, so a term
// present in every document receives the minimum possible weight (1) while a
// term present in a single document receives ln((N + 1) / 2) + 1 — that
// ordering is what makes this a genuine corpus-statistical signal rather than
// a relabelled token-overlap count.
// ---------------------------------------------------------------------------

export interface IdfIndex {
  /** term -> inverse document frequency */
  idf: Map<string, number>;
  /** number of documents the index was built from */
  docCount: number;
  /** weight given to a term that never occurs in the corpus */
  unseenIdf: number;
}

/** Document frequency: how many documents contain each term (once per doc). */
export function documentFrequency(docs: string[]): Map<string, number> {
  const df = new Map<string, number>();
  for (const doc of docs) {
    for (const term of new Set(fuzzTokens(doc))) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }
  return df;
}

/** Build the IDF table for a document collection. */
export function buildIdf(docs: string[]): IdfIndex {
  const docCount = Math.max(docs.length, 1);
  const df = documentFrequency(docs);
  const idf = new Map<string, number>();
  for (const [term, count] of df) {
    idf.set(term, Math.log((docCount + 1) / (count + 1)) + 1);
  }
  return {
    idf,
    docCount,
    unseenIdf: Math.log((docCount + 1) / 1) + 1,
  };
}

/**
 * IDF index over the real demo corpus (src/data/demo.ts), built once when this
 * module is first loaded.
 */
export const CORPUS_IDF: IdfIndex = buildIdf(
  materialRecords.map((r) => r.normalizedDescription)
);

interface WeightedVector {
  weights: Map<string, number>;
  norm: number;
}

function tfidfVector(index: IdfIndex, text: string): WeightedVector {
  const tf = new Map<string, number>();
  for (const term of fuzzTokens(text)) {
    tf.set(term, (tf.get(term) ?? 0) + 1);
  }
  const weights = new Map<string, number>();
  let sumSquares = 0;
  for (const [term, count] of tf) {
    const weight = count * (index.idf.get(term) ?? index.unseenIdf);
    weights.set(term, weight);
    sumSquares += weight * weight;
  }
  return { weights, norm: Math.sqrt(sumSquares) };
}

/** Cosine similarity of the two TF-IDF vectors, expressed on a 0-100 scale. */
export function tfidfSimilarity(index: IdfIndex, a: string, b: string): number {
  const va = tfidfVector(index, a);
  const vb = tfidfVector(index, b);
  if (va.norm === 0 || vb.norm === 0) return 0;
  let dot = 0;
  for (const [term, weight] of va.weights) {
    const other = vb.weights.get(term);
    if (other !== undefined) dot += weight * other;
  }
  const cosine = dot / (va.norm * vb.norm);
  return Math.max(0, Math.min(100, Math.round(cosine * 100)));
}
