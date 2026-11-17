---
"hmdentalassistant_front": patch
---

NC1-AUTH-401-AMB: a business 401 without a terminal or recoverable code no longer closes a valid session. The client starts at most one shared `auth/session` revalidation per authorization context (user, session, business, role, permissions and revision), keeps the capture, rejects the original request and never resends it. Known codes keep their paths; network/5xx answers report uncertainty without revoking; late answers from a previous context are ignored; a confirmed session is not re-checked for 10 s within the same context.

Auth-control requests (`api/auth/*`) now record the authorization context that sent them; an answer that arrives after that context changed (logout/login, business, role or permissions) is rejected as `AUTH_CONTEXT_CHANGED` before any cleanup, renewal, CSRF retry or redirect, so a late renewal of a previous session cannot close the current one.
