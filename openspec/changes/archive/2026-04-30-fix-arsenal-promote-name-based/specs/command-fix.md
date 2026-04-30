## No New Requirements

This change modifies the command interface of `oxn arsenal promote` without changing system requirements.

**Change:**
- Argument `path` → `name`
- Uses `loadStandardByName` instead of `loadStandardByPath`
- No new capabilities introduced