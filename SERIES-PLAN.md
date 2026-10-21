# TEMPORARY — release-series plan (delete this file before the 0.19.0 release commit on main)

Status on 2026-10-21, when this session moved to the cloud:
- Published: 0.16.2, 0.17.0, 0.18.0 (tags + GitHub releases). Testbed results committed for 0.16.1, 0.16.2, 0.17.0, 0.18.0 (NicolasET/uroboros-testbed).
- 0.19.0 is implemented in this branch, not released. Testbed history: run 1 failed goal mode (design reviewer over-applied the new evidence rule; fixed in references/reviewer-instructions.md); run 2 passed everything except `--auto` end-to-end (the orchestrator told the implementer to skip the quickstart task; fixed in references/implement-protocol.md step A item 3); run 3 (with both fixes) was cut off by a PC restart during goal mode. The maintainer chose: fix + full testbed of 0.19.0, then continue with 0.20.0–0.22.0.
- Remaining: full testbed of this candidate; if it passes, finish the CHANGELOG 0.19.0 testbed bullet (mention runs 1–2 and the fixes), release 0.19.0 on main WITHOUT this file, then 0.20.0, 0.21.0, 0.22.0 per the plan below.

Process (maintainer's choices for this series): auto-publish each release when it passes; no per-release draft review; full testbed per minor; stop and report in Spanish when a release does not pass. Pass = per mode vs the previous result: ambiguities, hidden tests, runtime ≥; compat covered; eval detection ≥ and false failures not up; cost not +25% in any mode. Bump plugin.json + CHANGELOG heading BEFORE the testbed (the label comes from plugin.json). Testbed: `npm run testbed -- --uroboros ../uroboros` from a sibling checkout of NicolasET/uroboros-testbed (needs Claude Code login for the Agent SDK); results committed there as results/<label>/. Testbed spend so far ~$160 (list price).

---

# Plan — mejoras de orca, hermes-agent, t3code y gentle-ai (0.16.2 → 0.22.0)

## Contexto

Del análisis de los cuatro repos aprobaste el nivel 1 (8 funciones), el nivel 2 (9) y las herramientas del repo (2), más el bug: el reviewer de implement no ve los archivos nuevos (untracked) que crea el implementer. `skills/run/SKILL.md:178` y `references/goal-protocol.md:56` pasan solo `git diff --name-only`; `references/verify-protocol.md:8` sí los incluye.

Leer el plugin completo destapó un segundo hueco, que se cierra en 0.18.0. `speckit-converge` 1.1 añade tareas `unrequested` ("review/justify or remove it"), e `implement-protocol.md:30` dice que las tareas de convergencia "raise no user question". Resultado: hoy el implementer decide solo si conserva o borra código no pedido, una decisión silenciosa que viola la invariante 1.

Una revisión adversarial del primer borrador contra el repo encontró 17 problemas: el reviewer no puede ver diffs, el ciclo de versión rompía la comparación del testbed, `proof` chocaba con 5 reglas, el marker compartido secuestraba runs, y otros. Todos están corregidos aquí.

**Proceso (tus respuestas):**
- Publico cada release sola si pasa sus criterios (abajo).
- Este plan aprobado reemplaza la revisión de borradores por release (AGENTS.md paso 3).
- El testbed corre completo en cada minor.

## Versionado

AGENTS.md: **minor** cuando cambia lo que el plugin hace, pregunta o decide, o un contrato; **patch** para bugs que no cambian el flujo, documentación y herramientas. Tu ejemplo "0.17.1 = punto 4" no aplica, porque el punto 4 cambia comportamiento y por lo tanto es minor. Agrupo por tema y en orden de dependencias:

| Versión | Tema | Contenido |
|---|---|---|
| **0.16.2** (patch) | Bug + herramienta | Fix untracked · `scripts/check-coherence.js` |
| testbed | Control negativo | Review eval v1 · comparación por modo · "No probado por esta corrida" |
| **0.17.0** | El gate mide solo este run | Snapshots + `RUN_DIFF` (N1-8) · baseline del gate (N1-1) · integridad del gate + `weight: proof` (N1-2) · refuter "no causado por este run" + `reason:` (N2) |
| **0.18.0** | Lo pedido, en todas partes, nada más | Cambios no pedidos + tareas `unrequested` (N1-3) · superficies y estados de vuelta (N1-6) · literales verbatim (N1-7) · reuso en plan + `shared_touched` (N2) |
| **0.19.0** | Evidencia, no afirmaciones | Evidencia con fuente (N1-5) · red-first (N2) · chequeo de contrato + una reparación (N2) · refuter "descubrible" (N2) |
| **0.20.0** | El verifier sondea | Probes derivadas del spec (N1-4) · verify eval v2 |
| **0.21.0** | Runs largos que no se pierden | Hook SessionStart `compact` (N2) · resultados viejos al reanudar (N1-8) · base drift (N2) · goal "Stop when" + AC a mitad de run (N2) |
| **0.22.0** | Lo que el proyecto recuerda | Filtros de `decisions.md` y reglas candidatas (N2) · `.uroboros/project-notes.md` (N2) |

Dependencias:
- 0.17.0 crea `BASE TREE`, `RUN_DIFF`, `weight: proof` y `reason:`, que usan las releases siguientes.
- 0.18.0 crea `SURFACES` y `shared_touched`, que usa 0.20.0.

---

## 0.16.2 — patch

1. **Bug.** Definir una vez, en `SKILL.md` paso B, "la lista de archivos cambiados": `git diff --name-only` más `git ls-files --others --exclude-standard`. Referenciarla desde `goal-protocol.md` G4.3 y `verify-protocol.md` V1.2. Hoy hay tres redacciones distintas. 0.17.0 la reemplaza.
2. **`scripts/check-coherence.js`** (Node stdlib, sale ≠0 con la lista de fallas). Reglas derivadas del repo, sin listas copiadas:
   - **Rutas:** existen todas las rutas `${CLAUDE_PLUGIN_ROOT}/…` y `references/…` citadas. Se ignoran las que tienen `<`, `*` o `{` (plantillas como `model-guides/<family>-<version>.md`).
   - **Variantes:** las 5 variantes de cada rol en `agents/` son idénticas salvo `name`, la palabra de esfuerzo en `description` y `effort`.
   - **Enums:** para cada `` `clave: valor` `` citado en `skills/` y `references/`, si la clave existe en una de las cuatro plantillas de reporte con enum `<a | b>`, el valor debe estar en la unión de esos enums. Se ignoran claves que no son de reporte (`status: "active"`, `paused: true`, `plan: …`) y valores entre comillas.
   - **Sintaxis:** todo JSON parsea; `node --check` pasa para cada `hooks/*.js`.
   - **Snapshot de compat:** el `hashes.json` de cada snapshot coincide con el sha256 del contenido LF. `baseline.version`, `baseline.line` y `supported_range` aparecen en `spec-kit-compat.md`.
   - **Versión y flags:** la versión de `plugin.json` es la de la primera sección del `CHANGELOG.md`. Cada flag de la tabla de `SKILL.md` aparece en `argument-hint` y en la tabla del README.
   - **Contra el repo actual:** se corre antes de publicar, y cada falsa alarma se corrige en la regla, no en el repo.
3. **AGENTS.md:** el paso 5 "Always" pasa a ser `node scripts/check-coherence.js`; `scripts/` entra al mapa del repo. CONTRIBUTING ítem 3 lo menciona.

Sin testbed (patch, como 0.16.1). "Pasa" = `check-coherence` en verde (sin falsas alarmas sobre el repo actual) y los tres puntos del bug apuntando a la misma definición; se publica antes del review eval, que necesita el tag `v0.16.2`.

## Testbed — review eval v1 (repo uroboros-testbed)

Modo nuevo `review`, versionado aparte con `REVIEW_EVAL_VERSION`. Mide al reviewer como `verify` mide al verifier.

- **Casos** sobre la implementación de referencia, todos con gate verde:
  - `clean`;
  - `untracked`: violación de contrato solo en un archivo nuevo sin trackear;
  - `skip`: un test existente marcado `.skip`;
  - `suppress`: un `@ts-expect-error` que oculta un bug real;
  - `weakened`: una aserción aflojada;
  - `extra`: un endpoint o campo público que el spec no pide.
- **Cómo:** despacho directo del reviewer, igual que `harness/verify-eval.ts:82-101`. El prompt de step B se construye según el protocolo de la versión medida:
  - <0.16.2: `git diff --name-only`;
  - 0.16.2: más los untracked;
  - ≥0.17.0: `BASE TREE`/`ROUND TREE` y `RUN_DIFF`.

  Reanudar el orquestador real no sirve: el resume re-confirma modelos y corre converge, que reescribe `tasks.md` y re-despacha al implementer. El constructor de prompts por versión queda documentado en el README del testbed.
- **Puntaje** (3 corridas por caso, juez fijado): detección = un finding que describe el defecto sembrado; además, findings en `clean` y repo intacto.
- **`previousResult` por modo** (`harness/report.ts:32-43`): cada modo compara contra la versión anterior que midió ese modo, sin abortar y con la misma versión de escenario o eval. Sin esto, un resultado que solo trae `review` queda como "anterior" de los modos de pipeline.
- **`summary.md`** gana la sección "No probado por esta corrida" (por ejemplo, el navegador: las sesiones no cargan MCP).
- Corre sobre `v0.16.1` y `v0.16.2` (el caso `untracked` debe mostrar el fix). `npm test` del testbed y una corrida real de `--modes review` antes de commitear; harness y resultados se commitean y pushean en el testbed (asunto en el estilo de su historial, p. ej. "Review eval v1; uroboros 0.16.1 and 0.16.2 measured").

## 0.17.0 — El gate mide solo este run

- **Snapshots** (definición única: sección "Working-tree snapshots" en `SKILL.md`, siempre cargado, así que la alcanzan Phase −1, implement, goal y verify).
  - **Un solo comando**, siempre con la herramienta Bash (POSIX, nunca PowerShell):
    ```
    idx="$(git rev-parse --git-path uroboros/snapshot.index)"; mkdir -p "$(dirname "$idx")"
    cp "$(git rev-parse --git-path index)" "$idx" 2>/dev/null || GIT_INDEX_FILE="$idx" git read-tree --empty
    GIT_INDEX_FILE="$idx" git add -A && GIT_INDEX_FILE="$idx" git write-tree
    ```
  - **Garantías:** el índice temporal vive en `.git/`, no en el árbol. No hay commit ni ref, y el índice del usuario no se toca (invariante 3).
  - **Momentos:** `BASE TREE` se registra antes del primer implementer; `ROUND TREE <n>` tras cada despacho del implementer.
  - **Fallbacks:** si falla `write-tree`, se usa la lista de 0.16.2; sin git, la unión de los `files_changed` de los reportes del implementer. Un id que ya no existe (`git cat-file -e`, porque `git gc` poda objetos inalcanzables pasado `gc.pruneExpire`; se verifica contra la doc de git en la sesión) cae al mismo fallback. Todo queda anotado.
  - **README, Configuration:** los archivos no ignorados, incluidos secretos sin `.gitignore`, quedan como objetos en `.git/objects` hasta la poda.
- **`RUN_DIFF`.** El reviewer y el refuter solo tienen Read/Grep/Glob y no pueden correr `git diff`. Por eso el orquestador escribe `git diff <BASE> <ROUND n>` unificado en `$(git rev-parse --git-path uroboros/run.diff)`: fuera del árbol y sin dejar archivos en el proyecto. Les pasa esa ruta como `RUN_DIFF:`, junto con `--stat`. Desde la ronda 2 pasa también el delta `<n-1>..<n>` en un archivo `fold.diff`.
- **Verifier:** `CHANGED_FILES` sale del diff `BASE..ROUND`. V2 compara árbol antes contra árbol después: M/D se pregunta como hoy y A va a `created`.
- **Baseline del gate** (`implement-protocol.md` paso A; en goal, antes de la ronda 1).
  - Se descubren y registran los comandos del gate (como A2) y se corren sobre el árbol intacto. El resultado queda como `GATE BASELINE: <tree> — <pass | fallas por comando/test>`.
  - **Si ya está rojo**, una pregunta (Question protocol). Opciones:
    - *Arreglarlas dentro de esta feature*;
    - *Dejarlas fuera del gate en este run* (cada una `D<n>`; el resto debe pasar);
    - *Detener*.

    Se pregunta también bajo `--only-business`, porque cambia el alcance. Bajo `--auto` se dejan fuera, como `A<n>` marcado `baseline — red`.
  - **Integración:**
    - la regla dura 5 nombra las dos excepciones (`skipped — red` y `baseline — red`);
    - A2 descuenta esas fallas;
    - `reviewer-instructions.md:32` trata ambas como sourced;
    - el ledger de `loop-report.md:19` las ordena así: `skipped — red`, `baseline — red`, `skipped — repeated`, `unverified`.
  - Al reanudar con código ya existente se registra `GATE BASELINE: unavailable`.
- **Integridad del gate.**
  - **Implementer:** nunca pone el gate en verde con supresiones (`@ts-ignore`, `@ts-expect-error`, `eslint-disable`, `noqa`, `type: ignore`…), `.skip`/`.only`, aserciones/snapshots/fixtures borrados o aflojados, config del gate relajada o timeouts más largos. Una aserción cambia solo cuando un FR o una decisión cambia lo que afirma.
  - **Campo nuevo** `gate_touched:` en `IMPLEMENTER-REPORT`: cada test, aserción, config o supresión tocada, con el FR/D/T que lo exige, o `none`. Si la única salida es debilitar el gate, reporta `BLOCKED`.
  - **Reviewer:** busca esos patrones en `RUN_DIFF` y los contrasta con `gate_touched`.
- **`weight: proof`** (solo implement y goal-implement). Es un hueco de evidencia, no una decisión, y tiene un solo arreglo: restaurar un check debilitado o reescribir un test que pasaría sin la feature. La enmienda a `reviewer-instructions.md:13` lo distingue de "mechanical → not a finding". Reglas:
  - el orquestador lo trata como falla de gate (paso D): se arregla vía el implementer, sin refuter y sin pregunta;
  - entra en la excepción de ronda 2 junto al gate fallido;
  - si se repite bajo `--auto`, queda `skipped — red`;
  - con el cap agotado cuenta como gate rojo (sin *Leave them out*; *Decide them now* significa una ronda más de arreglo);
  - si el arreglo necesita una decisión, el implementer reporta `BLOCKED`;
  - el perfil dice que cuenta como bloqueante de merge, para no chocar con la guía de Opus 5.5.
- **Refuter: `reason:` + motivo nuevo.** `LOOP-REFUTER-RESULTS` gana `reason: <decided | unreachable | no-outcome | not-this-run>` en los refutados, para que el orquestador los enrute sin leer texto libre.
  - Motivo nuevo `not-this-run` (implement y goal-implement): el comportamiento ya existía en `BASE TREE` y ningún requisito pide cambiarlo. Se prueba con `RUN_DIFF`.
  - Esos ítems van a la sección del Loop Report "Seen outside this feature", renombrada desde "Seen while verifying…" porque ahora tiene dos fuentes: refuter y verifier.
- **Contrato (aditivo):** `weight: proof`; `gate_touched:`; `reason:`; `RUN_DIFF:`; `loop-state.md` gana `BASE TREE`, `ROUND TREE <n>` y `GATE BASELINE`.

## 0.18.0 — Lo pedido, en todas partes, nada más

- **Cambios no pedidos.**
  - **Perfil implement/goal-implement:** toda conducta visible nueva, o salida o default existente cambiado en `RUN_DIFF`, sin FR/SC/US-AC/tarea/D/S detrás, es un finding `decision`. Opciones: conservarlo / quitarlo. Ignorar en silencio una opción o entrada explícita mientras se reporta éxito siempre es grave.
  - **Converge:** en `implement-protocol.md` (convergence paso 3 y línea 30), las tareas `(unrequested)` se preguntan una a una:
    - *Conservar* escribe una entrada en `## Clarifications` de `spec.md` que cita `D<n>`, porque converge solo lee spec/plan/tasks; si no, re-añadiría la tarea en cada pasada. La tarea se marca hecha.
    - *Quitar* hace que el implementer lo retire.
  - **Compat:** se añade `(unrequested)` a `skill_markers.speckit-converge` (`spec-kit-compat.json`), se actualiza el touchpoint 4 y la fila 1.1.0 de `spec-kit-compat.md:78` (hoy dice "need no adaptation"), y queda como contract change.
- **Superficies y estados de vuelta.**
  - **Intake:** el blind-spot pass (`SKILL.md` paso 2) registra `SURFACES:` (rutas/endpoints, comandos CLI, entradas de UI, jobs, roles, vistas públicas y de admin, docs). Se añade a la lista del borrador (`SKILL.md:129`) y a las copias de Phase 0.5 (`:148`) y G2 (`goal-protocol.md:43`). Las superficies donde no está claro si aplica la feature se preguntan como una regla antes de sus instancias.
  - **Perfil specify:** toda conducta que lleva algo a un estado nuevo (pausar, archivar, ocultar) define cómo se vuelve y cómo se ve. Si falta, es un finding de familia.
  - **Perfiles plan/tasks:** cada superficie tiene tareas o queda fuera de alcance por `D<n>`.
  - **Implement:** la evidencia lista, por FR, las superficies donde se alcanza.
  - **Goal:** `goal.md` gana la sección **Surfaces**.
- **Literales verbatim.**
  - **Dónde viven:** el prompt de specify (paso 6) y `goal.md` ganan la sección **Literals**: mensajes, etiquetas, ejemplos, comandos y números exactos del usuario, en su idioma original, con la instrucción de no traducirlos ni reformularlos.
  - **Reviewer:** en specify, un literal ausente o alterado es un finding `derived_from` de la respuesta de intake (se pliega sin preguntar); en implement, un literal distinto es una desviación.
  - **AGENTS.md:** la regla "Prompts are English" pasa a "…salvo los literales del usuario, que viajan verbatim en su idioma".
- **Reuso en el plan + `shared_touched`.**
  - **Perfil plan:** cada componente nuevo nombra el mecanismo existente que reutiliza. Si duplica uno que el reviewer encuentra con Grep, es un riesgo.
  - **Implementer:** reutiliza el helper existente para estado compartido y respeta sus invariantes.
  - **Campo nuevo** `shared_touched:`: código existente que también usan conductas no pedidas. Lo consumen el risk pass del reviewer y las probes de 0.20.0.
- **Contrato:** `SURFACES`, las secciones `Literals` y `Surfaces`, `shared_touched:` y el marcador de converge.

## 0.19.0 — Evidencia, no afirmaciones

- **Evidencia con fuente.** Cada entrada de `evidence` gana `source: <artifact | gate | implementer>`. `satisfied_by` cita `archivo:línea`, el test por archivo y título, o la línea del gate. En implement y goal-implement, `implementer` como única fuente nunca satisface un criterio. Así queda definido el "evidence block satisfactorio" del paso C.
- **Red-first.**
  - **Implementer:** cuando `tasks.md` (u `goal.md`) incluye un test para un criterio, lo corre antes del código de producción que cubre y captura la línea que falla.
  - **Campo nuevo** `red_first:`: test, comando y línea que falla, o `not captured: <razón>` (por ejemplo, el test se escribió después del código, o los tests son opcionales en spec-kit).
  - **Reviewer:** un test con red-first cuenta como evidencia. Sin red-first, lee la aserción y la cita en `satisfied_by`. Un test que pasaría sin la feature (tautológico, o que no afirma lo que dice el criterio) es `proof`: se reescribe, lo cual siempre es posible. La falta de red-first nunca es un finding por sí sola, para que no haya bucles.
- **Chequeo de contrato + una reparación** (definición única en `SKILL.md`, junto al Model check).
  - **Contrato roto** cuando:
    - falta el bloque o un campo requerido;
    - es `CLEAN` sin evidencia;
    - en implement, la evidencia no cubre cada FR-### y SC-###;
    - en goal y goal-implement, no cubre cada `AC-<n>`;
    - en fases de diseño, el bloque está vacío;
    - hay un `refuted` sin `proof` o sin `reason`.
  - **Reparación:** un solo pedido que nombra solo lo que falta. Va por `SendMessage` al mismo agente si la sesión lo tiene (documentado en sub-agents.md, no para `-p`/SDK); si no, por un despacho nuevo con las mismas entradas más `REPAIR:`.
  - **Si sigue roto:** un despacho nuevo; si también falla, se detiene y se reporta.
- **Refuter, motivo `discoverable`.** El ítem pregunta algo que el repo ya dice, y se cita el archivo. Qué librería existe es un hecho; si usarla sigue siendo una decisión.
  - El hecho se pliega donde apuntaba el finding: en diseño lo edita el orquestador; en implement va por re-despacho del implementer (`SKILL.md:193`). Se registra como `F<n> → discoverable: <archivo>` y la ronda siguiente lo verifica.
  - Regla del reviewer: si un hecho tiene varios candidatos en el código, `options` lista las rutas reales.
- **Contrato:** `source:`, `red_first:`, `REPAIR:` y el valor `discoverable` en `reason:`.

## 0.20.0 — El verifier sondea

- **`verifier-instructions.md`** gana un bloque `probes:` separado de `results`; "never add a scenario" sigue valiendo para `results`.
  - **Casos:** por cada FR-### (en goal, cada AC y restricción) y cada borde, error o entrada inválida que nombra el texto, probes positiva, negativa y de borde. Comparación exacta de status, cuerpo, texto de error y exit code.
  - **Invariantes:** los datos no cambian tras una acción rechazada, y cada ítem de `shared_touched` y cada superficie tocada se comporta igual que en la base.
  - **Base:** el orquestador pasa `BASE_TREE:`; el verifier hace `git archive <tree>` a un directorio temporal fuera del proyecto. La base solo corre si arranca con el comando de run del proyecto sin instalar nada. **No se crean links ni junctions**, para que el borrado posterior del temporal sea seguro. Si no arranca, esas probes quedan `not-run: base not runnable`.
- **`verify-protocol.md` V3:**
  - Una probe cuyo resultado fija el spec y que falla es `fail`: gate, se arregla.
  - Una probe con resultado abierto va a `open:` con lo observado. El orquestador hace una sola pregunta de lista, como la de valores: *Todo queda como está construido* (cada una `D<n>`) / *Cambiar algunas*. Bajo `--auto`, `A<n>`.
  - Una probe que también falla en la base va a `observed`.
- **Testbed:**
  - `harness/verifier.ts:29-50` pasa a leer solo el bloque `results:`, porque si no las probes se contarían como fallas sueltas.
  - Verify eval v2 (`VERIFY_EVAL_VERSION` 2) suma un caso que solo detecta una probe: un borde que fija un FR y que ningún Given/When/Then cubre. Se mide en `v0.19.0` y en el candidato.
- **Contrato:** `probes:` y `open:` en `VERIFIER-REPORT`; `BASE_TREE:` en el despacho.

## 0.21.0 — Runs largos que no se pierden

- **Marker para ambos modos** (`.uroboros/active-run.json`).
  - **Campos nuevos:** `mode: "sdd" | "goal"` y `state_file`. El marker SDD es `{mode, feature, dir, state_file, session_id, status}` y se escribe en Phase 0.5; goal sigue en G2 con sus campos de rondas.
  - **Reglas:**
    - si existe un marker activo de otra sesión, se pregunta antes de pisarlo (*tomarlo*: aquel run deja de mantenerse vivo / *detener*); bajo `--auto` se toma y queda como `A<n>`;
    - un takeover de `--goal` exige `mode: goal`;
    - el resume de Phase −1 en SDD reescribe `session_id`;
    - SDD pone `status` terminal al cerrar o detenerse;
    - la regla "one active goal run per repo" (`goal-protocol.md:9`) pasa a "one active run per repo".
  - **`goal-gate.js`:** bloquea solo si `mode === "goal"`, o si falta `mode` y existe la clave `rounds_max` (markers de antes de 0.21.0). Ante cualquier otra duda, permite el stop.
- **Hook nuevo `hooks/resume-context.js`** (Node stdlib; `SessionStart` con matcher `compact`, verificado en hooks.md). Si el marker está activo y su `session_id` es el de la sesión, emite `hookSpecificOutput.additionalContext` con:
  - la ruta a `skills/run/SKILL.md` (el plugin root sale de `__dirname`);
  - `state_file`;
  - en goal, la ruta a `goal-protocol.md`;
  - la instrucción de releerlos y seguir el resume check.

  Ante cualquier duda no emite nada.
- **Resultados viejos al reanudar.**
  - **Registro:** cada review, gate y verificación guarda el árbol con que corrió, y el último árbol registrado se actualiza tras cada gate y cada verificación.
  - **Despacho abierto:** antes de cada Agent call se escribe `DISPATCH OPEN: <rol> <ronda> <session_id>`, y se borra al leer el reporte. Al reanudar con un despacho abierto:
    - **misma sesión** (relanzamiento del hook o compactación): se sigue esperando la notificación, sin chequeo de árbol;
    - **sesión nueva:** se re-despacha y nunca se asume el resultado.
  - **Si no hay despacho abierto** y el árbol difiere del último registrado: se listan los archivos y se hace la pregunta de V2. Bajo `--auto`, se detiene y reporta.
- **Base drift.**
  - **Registro:** Phase 0.5 y G2 escriben `BASE BRANCH: <nombre> @ <sha>`.
  - **Chequeo:** antes del primer implementer y en cada reanudación, `git log HEAD..<base> --name-only` sobre el ref local, sin fetch.
  - **Si toca archivos del plan o del diff**, se pregunta: *seguir sobre la base actual* / *detener para que actualices la rama tú*. Bajo `--auto`, se sigue y queda como `A<n>`.
  - **Si no toca nada**, queda anotado y se pasa al implementer y al reviewer.
  - Nunca hace pull ni rebase.
- **Goal mode.**
  - **Stop when:** sección nueva en `goal.md` (G1), preguntada en intake (el usuario la dice, o "ninguna"). Bajo `--auto` queda "ninguna" como `A<n>`.
  - **`stop_reached:`:** campo nuevo del `IMPLEMENTER-REPORT` en goal. Detiene el run en todos los modos (`status: "stopped"`) y nunca se resuelve por asunción.
  - **AC a mitad de run:** un criterio nuevo en texto libre de una respuesta se confirma con una pregunta (*añadirlo como criterio* / *no*). Si se acepta, entra como `AC-<n+1>` con `D<n>` y se revisa como fold de `goal.md`.
- **Contrato:** campos del marker, hook nuevo, `DISPATCH OPEN`, `BASE BRANCH`, sección `Stop when` y `stop_reached:`. Casos allow/block probados para ambos hooks:
  - marker goal: bloquea;
  - marker sdd: permite;
  - marker sin `mode` pero con `rounds_max`: bloquea;
  - marker de otra sesión: permite;
  - JSON inválido: permite;
  - compact: inyecta solo al dueño.

## 0.22.0 — Lo que el proyecto recuerda

- **`decisions.md`.** La oferta del Loop Report:
  - **Deduplicación:** no ofrece lo que ya cubre un `S<n>`, y ofrece "reemplazar S3 por…" en vez de añadir una copia.
  - **Retiro:** lista los `S<n>` que este run dejó de lado o contradijo y pregunta si cambiarlos o retirarlos.
  - **Archivo:** los retirados pasan a `## Retired` con el run y la fecha; nunca se borran y el reviewer los ignora.
  - **Sin umbrales inventados.**
- **Reglas candidatas:** una regla general con una frase del porqué, deduplicada contra la constitución o `CLAUDE.md`. Nunca se proponen fallas de entorno, errores transitorios ni callejones sin salida.
- **`.uroboros/project-notes.md`:** solo hechos técnicos (comandos del gate, `VERIFY COMMANDS`, trampas de setup, tests flaky), con el formato `- N<n> <hecho> (visto <feature>, <fecha>; verificado con <cómo>)`.
  - **Uso:** se lee al inicio y A2 lo consulta antes de redescubrir. Cada entrada se re-verifica antes de usarla, y una vieja se corrige o se elimina.
  - **Escritura:** al final del run, sin pregunta, porque son hechos y no decisiones. El Loop Report lista qué añadió, cambió o eliminó, y el archivo queda sin commitear.

---

## Ciclo de cada release

1. **Bump primero:** `plugin.json` y la cabecera `## x.y.z — fecha` del CHANGELOG antes de verificar. Así el testbed etiqueta el candidato como `x.y.z+sha.dirty` y compara bien, y `check-coherence` exige las dos cosas juntas.
2. **Edición** según esta sección del plan.
3. **Barrido:** Grep de cada concepto tocado en todo el repo (prompts, references, agents, README, CONTRIBUTING, CHANGELOG, manifests, compat, hooks). Releer completo cada archivo cambiado. Actualizar el mapa de AGENTS.md y mantener AGENTS.md por debajo de 200 líneas.
4. **Chequeos:** `node scripts/check-coherence.js` en verde. Casos allow/block si cambió un hook.
5. **Minor:** testbed completo desde el Terminal (`run_in_terminal`, cwd uroboros: `Set-Location ..\uroboros-testbed; npm run testbed -- --uroboros ..\uroboros *> runs\<v>.log`), más los evals afectados.
   - No se edita el plugin mientras corre.
   - Si se corta por límite de uso, se re-corren los modos faltantes con `--modes`; nunca se publica algo parcial.
6. **"Pasa"** si, contra el resultado anterior por modo (misma versión de escenario o eval):
   - ambigüedades, tests ocultos y runtime ≥;
   - compat `covered`;
   - detección de los evals ≥ y fallas falsas que no suben;
   - costo que no sube más de 25% en ningún modo.

   Si no pasa, **me detengo y te reporto en español, sin publicar.**
7. **Publicación:**
   - Commit y push de `results/<v>/` en el testbed.
   - CHANGELOG completo: lead en negrita por bullet, "Contract change" cuando aplique y link al resultado.
   - README donde el cambio sea visible.
   - Commit en `main` con el asunto `<resumen> (x.y.z)` y cuerpo en bullets, sin trailers.
   - Push, tag `vX.Y.Z` y su push, `gh release create vX.Y.Z --title "X.Y.Z" --latest` con la sección del CHANGELOG.
   - Arranca la siguiente release.

**Costo estimado** (sin verificar): 6 testbeds completos (~$11–15 y 35–45 min cada uno), más el review eval (cada versión que lo corre) y verify eval v2. En total, unos $100–130 y 6–8 h en secuencia.

## Verificación final

- Tras 0.22.0:
  - `check-coherence` en verde;
  - grep de restos (`git diff --name-only` suelto, el nombre viejo "Seen while verifying", "one active goal run");
  - la serie del testbed 0.16.1 → 0.22.0: calidad sostenida, y la detección del review eval subiendo en 0.16.2, 0.17.0 y 0.18.0 y la del verify eval en 0.20.0.
- Cada release, además, con el criterio de "pasa".
