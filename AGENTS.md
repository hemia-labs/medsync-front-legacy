# Frontend Repo Rules

This repo is one of the git roots inside `F:\HemiaAssistantGlobal`.

## Repo Identity

- Path: `F:\HemiaAssistantGlobal\hemia-assistance-front-legacy`.
- Remote: `https://github.com/hemia-labs/medsync-front-legacy.git`.
- The workspace root above this repo is not a git repository.
- Also follow the workspace rules in `..\AGENTS.md` when available.

## Search

- Use `rg`.
- Exclude `node_modules`, `dist`, `build`, `coverage`, logs, and `.git` unless explicitly needed.

## Frontend Practices

- Legacy Vue 2 / Vuetify / Tailwind codebase.
- Do not migrate to Vue 3, Composition API, Pinia, or `<script setup>` unless explicitly requested.
- Follow existing router/store/service/component patterns.
- Read `package.json` before choosing lint/build/test commands.
- For meaningful UI changes, verify desktop and mobile layout.
- Do not print `.env.local` values.

## Docs

- Auth UI work belongs under `..\docs\auth`.
- Dashboard/navigation work belongs under `..\docs\dashboard-ux`.
- Clinical operation UI work belongs under `..\docs\clinical-operations`.
- Document/signature UI work belongs under `..\docs\clinical-documents`.
