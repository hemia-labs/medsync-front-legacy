---
"hmdentalassistant_front": patch
---

NC1-AUTH-ACTIVATION-NO-REPLAY: account activation calls (status, plans, welcome acknowledgement, email code send/confirm, email change) no longer resend themselves after a 401. The session is recovered once with the shared action and the original call still fails with a clear message; repeating it takes another explicit action. Answers of an earlier authorization context are discarded before CSRF recovery. A 401 on the email-code send no longer starts the resend cooldown, since nothing was sent.

Recovery is classified from what the shared session check actually did (applied, ended, or discarded because the authorization changed meanwhile), so a store that is still anonymous right after signup reports uncertainty on network/5xx instead of "session ended", and a late answer during hydration never counts as a recovered session. A delay announced with a 401 (Retry-After) is kept.
