# Spec-kit skill snapshot — 1.0.0 (baseline of the 1.0 line)

Verbatim copies of the `SKILL.md` files that **spec-kit 1.0.0** installs for the Claude Code integration, captured on 2026-09-02 from a pristine install of the `v1.0.0` git tag (skills mode, script type `ps`, bundled git extension 1.0.0). They exist so `/uroboros:compat` can show an exact diff of what a later spec-kit release changed, touchpoint by touchpoint. They are **not** used at runtime by the pipeline and must not be edited.

- Source: [github/spec-kit](https://github.com/github/spec-kit), © GitHub, licensed under the MIT License. Redistributed here under the same license; see the upstream repository for the license text.
- `speckit-specify`, `-clarify`, `-plan`, `-tasks`, `-analyze`, `-implement`, `-converge`: core skills. `speckit-git-feature`: installed by the bundled **git extension 1.0.0**.
- Line endings: stored with LF. 1.0.0 writes the git-extension skills with CRLF on Windows; that file was normalized to LF before hashing. The repo's `.gitattributes` keeps every file LF on every platform so `hashes.json` stays valid; `/uroboros:compat` diffs with `--ignore-cr-at-eol` regardless.
- `hashes.json`: SHA-256 of each file in this directory, as stored.
- One snapshot per major.minor line, always from the `x.y.0` tag; patches are never snapshotted.

Script paths inside the skills (`.specify/scripts/powershell/…`) are resolved at install time; a project initialized with `--script sh` differs only there.

To take the snapshot of a new line `<x.y.0>` (reproducible, no project of yours involved), from the plugin repo root:

```
uvx --from "git+https://github.com/github/spec-kit.git@v<x.y.0>" specify init /tmp/sk --integration claude --script ps --ignore-agent-tools --non-interactive --extension git
mkdir -p references/spec-kit-snapshot/<x.y.0>
for s in speckit-specify speckit-clarify speckit-plan speckit-tasks speckit-analyze speckit-implement speckit-git-feature speckit-converge; do
  mkdir -p references/spec-kit-snapshot/<x.y.0>/$s
  node -e 'const fs=require("fs");fs.writeFileSync(process.argv[2],fs.readFileSync(process.argv[1],"utf8").replace(/\r\n/g,"\n"))' "/tmp/sk/.claude/skills/$s/SKILL.md" "references/spec-kit-snapshot/<x.y.0>/$s/SKILL.md"
done
node -e 'const fs=require("fs"),c=require("crypto"),d=process.argv[1],o={};for(const s of fs.readdirSync(d).sort()){const f=d+"/"+s+"/SKILL.md";if(fs.existsSync(f))o[s+"/SKILL.md"]=c.createHash("sha256").update(fs.readFileSync(f)).digest("hex")}fs.writeFileSync(d+"/hashes.json",JSON.stringify(o,null,2)+"\n")' references/spec-kit-snapshot/<x.y.0>
```

(`--non-interactive` exists from 1.0.0; `--extension` at `init` from 0.16.0 — for older tags run `specify extension add git` inside the project instead.) Then point `baseline` and `snapshot` in `references/spec-kit-compat.json` at the new directory and copy this NOTICE next to it.
