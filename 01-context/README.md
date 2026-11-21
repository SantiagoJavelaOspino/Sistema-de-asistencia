# 01 — Context

## Purpose

This section explains why the **SENA Academic Attendance System** exists, who it
serves, where its boundaries lie, and defines the canonical Ubiquitous Language.

## Documents

| Document | Answers | Priority |
|---|---|---|
| [overview.md](./overview.md) | What does this system do, for whom, and why? | ⭐ |
| [scope.md](./scope.md) | What is explicitly in-scope and out-of-scope? | ⭐ |
| [glossary.md](./glossary.md) | What is the shared Ubiquitous Language? | ⭐ |

## Bounded contexts summary

The system operates across three primary contexts:
1. **Attendance Core:** Real-time QR rotation, delay calculation, and presence validation.
2. **Academic & Identity:** Fichas, apprentice enrollments, instructor assignments, and auth.
3. **Justifications & Academic Control:** 3-business-day excuse filing, dual approval, and audit trails.

---

**Related:** [`00-team-practices/README.md`](../00-team-practices/README.md) · [`overview.md`](./overview.md)
