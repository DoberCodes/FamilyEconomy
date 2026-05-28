# Firestore Security Rules

This project uses role-based Firestore rules with family-scoped access.

## Rule Goals

1. Users can only edit their own profile under `users/{uid}`.
2. Family data is visible only to authenticated users in the same `familyId`.
3. Parent role can manage jobs/goals and family settings.
4. Kid role can read family data and claim open jobs only for themselves.

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

Each authenticated user must have:

Path: `users/{uid}`

```json
{
  "displayName": "Alex",
  "email": "alex@example.com",
  "familyId": "family-main",
  "role": "kid"
}
```

Valid roles:
- `parent`
- `kid`

## Job Claim Constraints

Kid updates on `families/{familyId}/jobs/{jobId}` are limited to:
- status transition `open -> claimed`
- `claimedBy == request.auth.uid`
- no mutation of title/points/icon/createdBy

Parent can still override and fully manage jobs.

## Manual Validation Checklist

1. Parent user can create a job.
2. Kid user cannot create a job.
3. Kid user can claim an open job.
4. Kid user cannot edit job title/points.
5. Non-family user cannot read family docs.
6. User cannot read or write another user's `users/{uid}` profile.

## Notes

- These rules match the current app behavior (kid-first mode + parent unlock for protected actions).
- As features expand (loans, investments, approvals), extend rules in small increments and re-test each permission boundary.
