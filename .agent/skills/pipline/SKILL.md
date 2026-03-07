---
name: pipeline
description: Runs the full BA → DEV → QC pipeline for any feature or fix in the TFT Coaching project. Use this skill when the user requests analysis, implementation, or testing of a task. Reads README.md and project_structure.md first, then executes each stage with mandatory PM Gate reviews before advancing.
---

# Pipeline Orchestrator

## Global Rules
- Always read `README.md` and `project_structure.md` first
- Do **NOT** create new files by default
- Every step must include: **Analysis**, **Assumptions**, **Plan**
- Always check and update the Roadmap in `README.md`

---

## STEP 0 — Context
- Read `README.md`
- Read `project_structure.md`
- Identify current roadmap progress

---

## STEP 1 — BA (Business Analysis)
- Analysis
- Assumptions
- Plan
- Acceptance Criteria
- Risks

### PM Gate 1 — Verify BA
Decision: **APPROVE / REVISE**

---

## STEP 2 — DEV (Development)
- Analysis
- Assumptions
- Plan
- Implement minimal changes

### PM Gate 2 — Verify DEV
Decision: **APPROVE / REVISE**

---

## STEP 3 — QC (Quality Control)
- Analysis
- Assumptions
- Plan
- Test scenarios
- Regression risks

### PM Gate 3 — Verify QC
Decision: **APPROVE / REVISE**