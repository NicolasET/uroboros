# Loop Report — make the delta legible

Output a **Loop Report** designed to be the user's review surface, since they did not watch each phase:

- Branch name and the path to `loop-state.md`.
- Per phase: inferences caught, questions answered, risks accepted, gate result.
- **The delta, in plain language:** for each phase, the files changed and a human-readable summary of *what substantively changed and why* — not just "updated spec.md". For implement, include `git diff --stat` plus a plain-English walkthrough of what the code now does differently.
- **Candidate rules to encode (the loop improving the loop):** scan the run's findings and deviations in `loop-state.md` for **recurring classes** — the same kind of inference or defect flagged across multiple phases or rounds (e.g. non-measurable criteria appearing three times, the same missing-scope pattern, a convention the implementer kept violating). For each recurring class, propose one concrete rule and where to encode it — the project constitution, `CLAUDE.md`, or a skill — so future runs stop producing that class of finding at the source. Propose only; the user decides what to adopt. One-off findings are not candidates.
- The full DECISION LOG (every question and the user's answer).
- An explicit list of what is **left uncommitted** for the user to commit per their GitFlow.

Do not commit anything. The point is that the user can read this report and the diff and actually understand what the loop built.
