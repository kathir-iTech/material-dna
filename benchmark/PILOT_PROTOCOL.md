# Independent engineering validation gate

The submitted benchmark and `review-first-results.json` are regression evidence. Additional specification checks were developed after inspecting errors on the same 200 synthetic pairs. Zero false MATCH outcomes there does not establish generalisation or certify safety.

Before claiming production accuracy or treating a recommendation as an authorised merge:

1. Obtain permission to use a de-identified material-master extract. Keep confidential source data outside the repository. Record the source, sampling procedure, material families and time period.
2. Freeze the engine and rules before opening evaluation labels. Split by source and material family, and prevent the same material identity or description variants from appearing across tuning and evaluation sets.
3. Have two engineering reviewers label identity independently, with standards references and a short rationale. Use an explicit uncertain category. Adjudicate disagreements; report agreement and excluded/uncertain counts.
4. Run the submitted configuration and the new policy on the same held-out candidate sets. Test retrieval separately from pairwise classification; a pairwise benchmark cannot establish full-catalogue retrieval recall.
5. Report accepted-match precision, false MATCH counts, automatic true-match coverage, abstention, false vetoes, per-family errors, latency and human-review workload. Preserve all denominators. F1 over decided pairs must be named as such.
6. Analyse clustered uncertainty: related descriptions and variants are not independent observations. Use an appropriate grouped confidence interval or resampling procedure.
7. Agree on release gates with the engineering owner, rather than choosing targets after seeing results. The system remains advisory until the owner approves the evidence and operational controls.

For context, even an independent representative sample with 0 errors among 47 accepted recommendations would have a one-sided exact 95% binomial upper bound on error rate of about 6.2%. Zero errors among 299 independent accepted recommendations would be needed for the analogous bound to fall below 1%. The current synthetic, development-inspected cases do not meet those sampling assumptions.

Use `expert-review-template.csv` as an annotation contract. It intentionally contains no prefilled descriptions, suggested labels or invented expert approvals. Allowed labels: MATCH, NON_MATCH and UNSURE. The original benchmark harness accepts binary labels only; adjudicate or separately account for UNSURE cases before converting a dataset for that harness.

Operational gates remain separate: authenticated reviewers, enforced permissions, shared persistent state, durable audit retention, rollback rules, standards governance, a tested ERP connector and deployment verification. Browser-local review history is useful for a demonstration and is not a substitute for those controls.
