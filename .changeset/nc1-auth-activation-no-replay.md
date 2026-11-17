---
"hmdentalassistant_front": patch
---

NC1-AUTH-ACTIVATION-NO-REPLAY: account activation calls (status, plans, welcome acknowledgement, email code send/confirm, email change) no longer resend themselves after a 401. The session is recovered once with the shared action and the original call still fails with a clear message; repeating it takes another explicit action. Answers of an earlier authorization context are discarded before CSRF recovery. A 401 on the email-code send no longer starts the resend cooldown, since nothing was sent.
