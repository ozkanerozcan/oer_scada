# Auto-Documentation Rule

## Objective

The Agent MUST keep `.agent/skills/` and `.agent/rules/` synchronized with the **actual code** after every change — proactively, without being asked.

> **This rule has zero exceptions.** If a prompt results in any architectural, schema, UI pattern, or behavior change, the corresponding file MUST be updated in the same task execution.

---

## Trigger Map — What Change Updates Which File

| Code Change | File to Update |
|-------------|----------------|
| DB schema (new table, column, relation) | `skills/database-operations.md` |
| Modbus polling logic, buffer parsing, group engine | `skills/modbus-communication.md` |
| Tag / Group frontend page or data model | `skills/tag-management.md` |
| Device management page or API | `skills/device-management.md` |
| Modal design, button layout, loading states, icon usage | `skills/ui-components.md` + `rules/code-style.md` |
| New API endpoint added | `rules/architecture-rules.md` |
| New Zustand store pattern, store method | `rules/architecture-rules.md` + `rules/code-style.md` |
| New forbidden practice discovered | `rules/code-style.md` (Yasak bölümü) |
| Alarm thresholds, role boundaries, business logic | `rules/business-rules.md` |

---

## How to Update

1. At the END of an EXECUTION task (before `notify_user`), check the trigger map above
2. For each matching row, use `write_to_file` (overwrite=true) or `replace_file_content` to update the corresponding file
3. Updates must describe the **current behavior**, not aspirational/future behavior
4. Remove outdated content that no longer applies

---

## Prohibited

- Updating docs ONLY when the user explicitly asks
- Writing "theoretical" patterns that don't match the real code
- Keeping old schema descriptions (e.g., `deviceId` on tags) after a redesign
- Skipping documentation because the change "seemed small"
