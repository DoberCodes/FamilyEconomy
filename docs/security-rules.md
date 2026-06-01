# Firestore Security Rules

This project uses family-scoped Firestore rules. The current product direction is parent-owned authentication with child sessions/mock kid login inside the parent household.

Credits, balances, rewards, goals, and statements are fictional educational constructs only. Firestore rules should protect family data and parent authority, but the app must not be treated as a banking, payment, payroll, or real-money custody system.

## Rule Goals

1. Users can only edit their own profile under `users/{uid}`.
2. Family data is visible only to authenticated users in the same `familyId`.
3. Parent role can manage household data, child profiles, jobs, goals, rewards, and family settings.
4. Kid role support may remain for future true child-auth flows, but current child sessions are parent-mediated and should not be documented as independent kid accounts by default.

## Rules File

Primary rules are in [firestore.rules](../firestore.rules).

## Deployment

1. Install Firebase CLI:
   - `npm install -g firebase-tools`
2. Log in:
   - `firebase login`
3. Initialize Firestore in this repo (if not initialized yet):
   - `firebase init firestore`
4. Ensure your `firebase.json` points to `firestore.rules`.
5. Deploy rules:
   - `firebase deploy --only firestore:rules`

## Required Profile Document

Each authenticated parent user must have:

Path: `users/{uid}`

```json
{
  "displayName": "Parent",
  "email": "parent@example.com",
  "familyId": "family-main",
  "role": "parent"
}
```

Valid roles:
- `parent`
- `kid` (reserved/supported for future true child-auth flows)

## Child Session Model

- Child profiles are stored under `families/{familyId}/children/{childId}`.
- Kids use a parent-controlled child session/mock login inside the authenticated parent household.
- Child session codes protect local handoff between family members; they do not create a separate Firebase identity.
- Code that writes to Firestore from a child session should be explicit about whether the write is parent-mediated or requires future true kid-auth rules.

## True Kid-Auth Job Claim Constraints

If true kid-auth accounts are enabled later, kid updates on `families/{familyId}/jobs/{jobId}` are limited to:
- status transition `open -> claimed`
- `claimedBy == request.auth.uid`
- no mutation of title/points/icon/createdBy

Parent can still override and fully manage jobs.

## Manual Validation Checklist

1. Parent user can create a job.
2. Parent user can manage child profiles and household settings.
3. Non-family user cannot read family docs.
4. User cannot read or write another user's `users/{uid}` profile.
5. Reserved true kid-auth rules still deny kids from parent-only writes.
6. Reserved true kid-auth rules still restrict kid job claims to safe status-only transitions.

## Notes

- Current app behavior is parent-authenticated with protected parent controls and local child sessions.
- Do not rely on local child session state as the Firestore security boundary.
- As features expand (family tax, community fund, budgeting, investing simulations, approvals), extend rules in small increments and re-test each permission boundary.
- Keep future investing, allowance, and budgeting features explicitly educational unless a separate product decision and compliance review says otherwise.
