# Google Login Stability Guide

This project must keep Google login stable across local, preview, and production deployments.

## Non-negotiable rules

1. Never hardcode credentials or API keys in code.
2. Keep all Firebase values in environment variables only.
3. Do not change `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` to a Vercel domain.
   It must remain the Firebase auth domain, typically `<project-id>.firebaseapp.com`.
4. Every real app domain must be added to Firebase `Authentication > Settings > Authorized domains`.
   This includes:
   - localhost
   - production `vercel.app` domain
   - any custom domain
   - Chrome extension origin when extension auth is used
5. All web sign-in buttons must call the centralized `signInWithGoogle()` helper from `AuthContext`.
   Do not call `signInWithPopup()` directly from regular page components.
6. Production web login should prefer `signInWithRedirect()`.
   Popup login is only a local-development convenience.
7. Never allow concurrent popup requests.
   UI buttons must disable while `isSigningIn` is true.
8. If popup auth is blocked, fall back to redirect auth rather than silently failing.

## Symptoms and the most likely cause

- Popup opens and closes immediately:
  - duplicate popup requests
  - unauthorized domain
  - popup blocked by browser
- Production redirect login loops or fails:
  - wrong `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - deployed hostname missing from Firebase Authorized domains
- Popup opens, closes, and user stays logged out:
  - `signInWithPopup()` failed before auth state settled
- Login succeeds but profile fails:
  - Firestore permission issue
  - invalid profile write payload

## Deployment checklist

1. Confirm Vercel env vars are set:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
2. Confirm `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` still points to Firebase.
3. Add the exact deployed hostname to Firebase Authorized domains.
4. Test login in:
   - normal browser window
   - incognito window
   - mobile browser if applicable
5. Verify only one popup appears even if login is clicked repeatedly.

## Extension-specific note

The Chrome extension auth flow is the only allowed exception that may use popup auth outside the main web `AuthContext`.
That flow must stay isolated to `src/app/extension-auth/page.tsx`.
