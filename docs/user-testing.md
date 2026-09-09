# Usability testing plan — Campus Connect V2

Covers the "test the platform with real users" half of Objective 4. A moderated,
task-based usability test with the target audience (Kenyan Gen Z who want to earn
from or hire a skill / item), followed by a short questionnaire focused on trust —
the central claim of this project.

## Participants

- **6–8 people**, recruited from the same pool used in the preliminary investigation
  (§3.1.1): students and young freelancers already offering tutoring, photography,
  design or equipment for hire, plus a few who mainly want to *hire*.
- Mix of "provider-minded" and "client-minded" participants (roughly half each).
- Each session is **~30–40 minutes**, one participant at a time, screen shared or
  in person on a phone.
- 6 participants typically surface the large majority of usability problems; run a
  second round of 4–6 after fixing the first round's issues.

## Setup

- Test build: the deployed stack (or `deploy/docker-compose.yml` on a laptop with a
  throwaway Supabase project). `MPESA_MODE=mock` so no real money moves and the
  escrow flow completes in seconds; the moderator explains this stands in for a
  real M-Pesa STK Push.
- Two pre-made accounts so a participant can play both sides of a transaction, plus
  a seeded set of listings to browse.
- Record the screen and audio **with consent** (see below). Note task success,
  time, wrong turns, and anything the participant says out loud.

### Consent (Kenya Data Protection Act, 2019 — cited in §1.3)

Before starting, read and get verbal agreement:

> "I'll ask you to use a test version of an app and think aloud. I'll record the
> screen and what you say, only for improving the app. No real money or real M-Pesa
> is involved. Your name won't appear in any report. You can stop at any time.
> Do you agree to take part and be recorded?"

Use test phone numbers, not the participant's real one, wherever possible.

## Tasks (think-aloud)

The moderator gives a scenario, not instructions. Don't help unless the participant
is fully stuck for ~2 minutes.

| # | Scenario | What we're checking |
| --- | --- | --- |
| 1 | "You want to start offering your services here. Set yourself up." | Register → SMS OTP → verify; is the OTP step understood? |
| 2 | "Add a profile photo, a short bio, and your Instagram." | Profile editing, social links, avatar upload |
| 3 | "Post a listing for something you'd actually offer, with at least one photo." | Create-listing flow, category picker, the photo/video step after create |
| 4 | "Set up encrypted chat so buyers can message you." | The key-setup step on Profile — is the E2EE explanation clear or scary? |
| 5 | "Now switch hats — you need to hire someone for [their own category]. Find a good option." | Browse, category chips, price/location filters, reading a listing |
| 6 | "Message that provider a question before you commit." | Starting a chat from a listing; the "encrypted" indicator |
| 7 | "Hire them and pay into escrow." | The fee breakdown (provider fee + platform fee), the M-Pesa prompt, the "Funds Secured" state |
| 8 | "They've delivered. Release the payment." | Finding the order, Approve Delivery, understanding money only moves now |
| 9 | "Leave them a review, then reply to a comment on it." | Review gating (only after a completed order), the threaded reply + like UI, role badges |
| 10 | "You saw a listing that looks like a scam. Do something about it." | Finding Report, choosing a reason, expectation of what happens next |

## Post-test questionnaire

### System Usability Scale (1 = strongly disagree … 5 = strongly agree)

1. I think that I would like to use Campus Connect V2 frequently.
2. I found the system unnecessarily complex.
3. I thought the system was easy to use.
4. I think that I would need support to be able to use this system.
5. I found the various functions in this system were well integrated.
6. I thought there was too much inconsistency in this system.
7. I would imagine that most people would learn to use this system very quickly.
8. I found the system very cumbersome to use.
9. I felt very confident using the system.
10. I needed to learn a lot of things before I could get going with this system.

*(Score: for odd items subtract 1; for even items 5 minus the response; sum × 2.5 → 0–100.)*

### Trust-specific items (1–5)

11. I would feel safe paying for a gig through the escrow instead of paying the
    person directly.
12. The fee breakdown before paying was clear.
13. I understood that my money is only released when I approve delivery.
14. I would trust the reviews on a provider's profile.
15. Knowing chat is end-to-end encrypted makes me more comfortable sharing details.
16. I would know how to report a bad listing or user.

### Open questions

- What, if anything, made you hesitate during the payment step?
- Was there any moment you weren't sure what would happen next?
- Would you use this instead of arranging a gig over WhatsApp/Instagram? Why / why not?

## Reporting

For each round, produce a short findings table: issue, task(s) affected, severity
(blocker / major / minor / cosmetic), how many participants hit it, and a proposed
fix. Feed blockers and majors back into the backlog before round two. Summarise the
SUS score and the trust-item averages, and pull 3–5 representative quotes.
