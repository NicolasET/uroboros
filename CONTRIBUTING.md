# Contributing

Issues and PRs welcome. Ground rules:

1. **The zero-inference invariant is non-negotiable.** Any change that lets an agent silently assume a product/design decision will be rejected — that is the failure mode this project exists to eliminate.
2. **Instructions live at the point of use.** If you add behavior to a phase, put the instruction where the orchestrator executes it, not in an appendix section (distant instructions get skipped under auto-advance momentum).
3. Keep the reviewer read-only and the output contracts (`LOOP-REVIEW-FINDINGS`, `IMPLEMENTER-REPORT`) stable — the orchestrator parses them.
4. Test a change with a real spec-kit repo before opening the PR, and note in the PR which phase(s) you exercised.
5. **Model guides** (`references/model-guides/<family>-<version>.md`) are one file per exact release, distilled from that release's published guidance: frontmatter with `family`, `version`, `model_id`, `source` and `retrieved`, then `## Orchestrator`, `## Reviewer` and `## Implementer` sections. Carry only what the source says for that release — no guidance inferred to apply to other models — and nothing that overrides the Hard rules, the Question protocol, or the output contracts.
