# P0 hardening

This document records the security/build hardening applied to the `security/p0-hardening` branch.

- Firestore ownership is immutable during updates.
- Candidate and expense writes are owner/admin scoped.
- Settings and admin records are restricted.
- Storage access is owner scoped through `ownerUid` metadata.
- Release signing requires production GitHub Secrets.
- CI regenerates the Gradle wrapper from the trusted Gradle 8.13 distribution before building.

Passport OCR fallback remains a separate change because a Gemini secret must never be embedded in the Android client.
