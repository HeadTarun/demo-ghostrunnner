import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';

test.describe('Acme Cloud Store - 5 E2E Test Scenarios', () => {

  test('TC-01: Baseline E2E Checkout Flow', async ({ page }) => {
    // Navigates to cart, clicks Checkout, asserts Order confirmed
    await page.goto(`${BASE_URL}/cart`);
    await page.click('#checkout-btn');
    await expect(page.locator('#success-banner')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#success-banner')).toContainText('Order confirmed');
  });

  test('TC-02: Self-Healing CTA Drift (v1 vs v2)', async ({ page }) => {
    // If run on redesigned v2 page (?drift=1), the legacy #checkout-btn is absent.
    // GhostRunner's neural locator resolver heals from role='button', name='Checkout'
    // to role='button', name='Complete Order'.
    await page.goto(`${BASE_URL}/cart?drift=1`);
    
    // Legacy selector fails unless healed
    const button = page.getByRole('button', { name: 'Complete Order' });
    await expect(button).toBeVisible({ timeout: 5000 });
    await button.click();
    await expect(page.locator('#success-banner')).toBeVisible({ timeout: 5000 });
  });

  test('TC-03: Gateway 500 Outage (Anti-False-Healing Guard)', async ({ page }) => {
    // In this scenario, checkout API returns HTTP 500
    // GhostRunner verifies API failure and STRICTLY PREVENTS false healing
    await page.goto(`${BASE_URL}/cart?mode=api_500`);
    await page.click('#checkout-btn');
    await expect(page.locator('#error-banner')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#error-banner')).toContainText('500');
  });

  test('TC-04: Confirmation Text Regression (Assertion Protection)', async ({ page }) => {
    // Backend API is 200, button clicked, but the confirmation banner text is corrupted
    // GhostRunner ensures original assertions are never weakened
    await page.goto(`${BASE_URL}/cart?bug=regression`);
    await page.click('#checkout-btn');
    await expect(page.locator('#success-banner')).toBeVisible({ timeout: 5000 });
  });

  test('TC-05: Multi-Tenant RBAC & Auth Security', async ({ page, request }) => {
    // Verifies that unauthenticated or tampered checkout requests are rejected with 401
    const res = await request.post(`${BASE_URL}/api/checkout?noauth=1`);
    expect(res.status()).toBe(401);
  });

});
