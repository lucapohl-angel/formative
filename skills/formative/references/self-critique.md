# Automatic self-critique

Before delivering a requirements map, prototype, plan, or revision, review it at least three times with honest self-critique. Keep revising and reviewing until you can deliver something you are truly proud of in the context of the task. Three passes are a minimum, not a stopping rule. Routine interview questions are part of discovery, not separate deliverables requiring a review report.

## Make each pass real

Identify the task's intended result and inspect the current artifact. Actively seek counterexamples to your assumptions, identify consequential gaps, make justified improvements, and verify the result. Use distinct perspectives across passes, for example:

1. **Intent and completeness:** Does it solve the user's actual problem? Trace missing capabilities, dependencies, controls, and unresolved decisions across the agreed scope, including unprototyped areas. Check whether automatic behavior needs a visible toggle or scope indicator.
2. **Counterexamples and consequences:** Try realistic failures, contradictions, edge cases, recovery, access, and changed assumptions. Check whether users can retry without losing work and understand what was saved. For a plan, walk through concrete scenarios and check whether its rules yield coherent outcomes.
3. **Clarity and evidence:** Can someone use or implement this without guessing? Check consistency, acceptance examples, and whether claims match what was actually verified. For prototypes, inspect the render and exercise relevant pointer/keyboard behavior at wide and narrow viewports; distinguish simulation from real backend behavior.

Adapt the checks to the task. A small revision still gets three focused passes; it need not repeat an unrelated whole-product audit. Recheck affected behavior after fixes. If another pass exposes a material problem, keep working; do not stop just because the count reached three.

Three compliments or repeated checklists are not three reviews. Do not invent defects or unnecessary features to demonstrate effort. A pass can conclude no change is justified when evidence supports it. Critique does not grant user approval: new ideas remain proposals, and unclear intent returns to the interview.

## Record and deliver honestly

Record each pass's artifact/revision, finding and consequence, action, and actual verification in `.formative/review-notes.md` or an existing review record. Use ordinary notes for conversation-only work; do not initialize a renderer just to log critique. The main agent owns the checkpoint review record; a restricted worker must not invent file-writing or browser capabilities.

Deliver when the result meets the task's intent and your quality standard, with material concerns resolved or genuinely blocked/user-deferred limits made explicit. Never silently defer required work to claim completion. Report meaningful improvements and remaining limits without claiming unperformed tests or turning subjective pride into evidence.
