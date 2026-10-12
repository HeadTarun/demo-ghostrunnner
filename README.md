# Acme Cloud Store — Demo Target Application

This repository represents the application owned by the demo user (**Elena Rostova** / `Krishna-aids/Demo`), connected to **GhostRunner**.

## 🚀 Scenarios Supported

1. **TC-01: Baseline E2E Checkout Flow**
   - Clean checkout navigation and order confirmation.
2. **TC-02: Self-Healing CTA Drift (Pull Request #42)**
   - UI redesign updates CTA button from `Checkout` (`#checkout-btn`) to `Complete Order` (`#complete-order-btn`).
   - GhostRunner detects locator drift, auto-repairs, runs in sandbox, and bumps version from `v1 -> v2`.
3. **TC-03: Gateway 500 Outage (Anti-False-Healing)**
   - API returns HTTP 500. GhostRunner enforces strict policy: **NEVER auto-heal backend failures**.
4. **TC-04: Confirmation Text Regression**
   - API returns 200, but message text is corrupted. GhostRunner preserves assertions.
5. **TC-05: Multi-Tenant RBAC & Auth Security**
   - Unauthenticated requests are rejected with 401.

## 🛠 Local Run

```bash
npm install
npm start
# In another terminal:
npm test
```
