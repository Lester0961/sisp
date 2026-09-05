# SISP recovery copy

This directory is a non-destructive recovery copy created from local Git
object `0a569712e6e80edfd92df976de6c3f708cf41842` (parent:
`6cdfd1b07ed70aac4839b26f84993686048c2b72`). The original working tree was
not changed.

## Restored source

- `sisp-frontend/app`: 32 source files, including the ARIA landing page,
  authentication, protected portal routes, and live-agent route.
- `sisp-backend/src`: 84 source files, including authentication, document
  requests, chat, grades, and live-agent services.
- `sisp-ml/app`: 28 source files from the preserved base tree.

## Preserved compiled evidence

`recovered-runtime/` contains copies of the generated outputs that survived
the source omission:

- Backend `dist` output, including the 20-message daily chat quota and
  document quantity logic.
- Python bytecode for the LLM router/providers, language detection, scope,
  moderation, localized messages, and chat routes.
- The local vector index and classifier model files.

The Python bytecode was compiled from modules such as
`app/services/llm/router.py`, `language_service.py`, `moderation_service.py`,
`scope_service.py`, and `localized_messages.py`; their `.py` sources are not
present in the original working tree or ZIP. The recovery copy now contains
reconstructed equivalents for those advisory modules and a regenerated
`app/data/moderation/moderation_terms.json` from the supplied lexicon. Backend
source maps omit `sourcesContent`, so the copied compiled files remain evidence
and a runtime reference rather than a verbatim TypeScript source backup.

The recovered backend/frontend source also restores document multi-select with
quantities, the 20-message daily quota, local demo password fallback,
language-selection UI, and live-agent session wiring.

## Safety

Do not run `git clean`, `git gc`, reset, or publish the original checkout until
this copy has been reviewed. No environment files or virtual environments were
copied into this recovery directory.
