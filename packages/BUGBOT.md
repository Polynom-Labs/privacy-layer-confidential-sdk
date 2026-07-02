# Bugbot Review Instructions

When reviewing changes under `packages/**`, check whether the design patterns from `.cursor/rules/design-patterns.mdc` are being applied where they fit the changed SDK code.

Pay special attention to the composition pattern. Always flag the need for composition when a touched folder shows one or more of these signals:

- The folder is accumulating too many files around one capability and the behavior would be clearer as composed adapters or smaller collaborators.
- One file is imported by many unrelated files and is becoming a coordination point instead of a focused dependency.
- Many files in the folder share a similar filename prefix, suggesting that one concept is spreading across sibling modules instead of being assembled through explicit parts.

Composition findings should explain which behavior should be extracted into interchangeable dependencies and how the public client or operation should assemble those dependencies. Prefer composition over inheritance, large orchestration classes, and repeated direct network or storage calls in clients.

Also check for the other available patterns when appropriate:

- Observer: staged operation execution should emit stable progress events instead of exposing low-level network details.
- Visitor: operation-specific validation or transformation should use dedicated handlers rather than repeated `switch` or `if` branches by operation kind.
- Factory: configured clients should be created through validation and assembly helpers callers do not need to repeat.
- Abstract factory: browser and Node entrypoints should share orchestration while using environment-specific asset loading or adapter creation.
