# Test Plan
## 1.1 Scope
What features and components are in scope and which are explicitly out of scope?
| In Scope | Why This Matters |
|---|---|
| abc | def|

| Out of Scope | Why Excluded |
|---|---|
| abc | def|

## 1.2 Quality Goals
## 1.3 Risks and Priorities

| Area | Why it's risky / costly | Priority (H / M / L) |
|---|---|---|
| e.g. Concurrent signups → duplicate emails | Race condition; data corruption | H |
| e.g. Auth token expiry edge cases | Security implications | H |
| e.g. Pagination on long feeds | Cosmetic; recoverable | L |

## 1.4 Strategy

Unit test:
Integration test:

| Component | Test types you'll apply | Framework | Why this fit (one sentence) |
|---|---|---|---|
| _your frontend stack_ | | | |
| _your backend stack_ | | | |
| Database | | | |
| Cross-cutting (concurrency / load — if any) | | | |

## 1.5 Environment and Assumptions

## 1.6 Team Roles

| Member | Owns which test categories / components |
|---|---|
| Zhengyu Dong | |
| Niharika Yalla | |
| Yuxuan Huang | |
| Xinlei Liang | |
| Jennifer Yan | |

# Tests Implemented and Report
## 2.1 Required Minimums

| Category | Required? | Minimum |
|---|---|---|
| **Unit tests** | Required | ≥ 5 tests |
| **Integration tests** | Required | ≥ 3 tests |

## 2.2 Tests by Category

_Last updated: __________ (commit __________)_

| Category | Count | 2+ examples |
|---|---|---|
| Unit | | |
| Integration | | |

## 2.3 Where the Tests live

```
[your tests/ folder structure]
```

Run commands (the TA will copy-paste these on a fresh clone):

```bash
[your run commands]
```

Approximate run-times:

| Category | Time | Where it runs |
|---|---|---|
| Unit | | local + CI |
| Integration | | |
| e2e (if chosen) | | |
| Concurrent (if chosen) | | local only is fine |

## 2.4 Coverage Achieved

_Last updated: __________ (commit __________)_

> Just **report the number**. **50%+ is fine** — you're not chasing 100%. The point is that you measured it (not guessed) and can talk about the gaps.

| Test type | Tool | Coverage % |
|---|---|---|
| Unit | _e.g. Jest --coverage / pytest --cov_ | |
| Integration | | |
| **Combined (overall)** | merged report | |

A few sentences on what's NOT covered and why:

```
[your notes]
```

## 2.5 Plan Versus Implementation

Where did your **Part 1 plan** call for testing that your **implementation didn't (or couldn't) cover**? This is the honest report. We'd rather you say "we planned 12 e2e flows and shipped 2" than silently omit it.

| What the plan called for | What you actually shipped | What blocked you / what you'd add next |
|---|---|---|
| | | |
| | | |

If the plan and implementation match exactly, write "N/A — implemented as planned."

# Reflection
1. What did your tests catch that you missed before? (Concrete bug, please.)
2. What was hardest to test, and why?
3. What test would you add next if you had more time?
4. Where did Claude help — and where did it get things wrong?