const { test, expect } = require('@playwright/test');
const jwt = require('jsonwebtoken');

const TEST_SECRET = 'test-secret-for-e2e-tests';

function generateToken(payload) {
  return jwt.sign(
    Object.assign(
      { email: 'test@example.com', name: 'Test User', picture: 'https://example.com/pic.jpg' },
      payload || {}
    ),
    TEST_SECRET,
    { algorithm: 'HS256', expiresIn: '24h' }
  );
}

// ── Logged Out State ────────────────────────────────────────────────────────

test.describe('Auth UI - Logged Out', () => {
  test('should show Sign In button', async ({ page }) => {
    await page.goto('/');
    const signInBtn = page.locator('.auth__btn--google');
    await expect(signInBtn).toBeVisible();
    await expect(signInBtn).toHaveText('Sign in with Google');
  });

  test('should not show Upload Game button', async ({ page }) => {
    await page.goto('/');
    // Wait for auth check to complete
    await page.waitForTimeout(500);
    await expect(page.locator('.auth__btn--upload')).not.toBeVisible();
  });

  test('should not show profile info', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    await expect(page.locator('.auth__username')).not.toBeVisible();
    await expect(page.locator('.auth__avatar')).not.toBeVisible();
  });

  test('Sign In button should navigate to /auth/google', async ({ page }) => {
    await page.goto('/');
    const signInBtn = page.locator('.auth__btn--google');
    await expect(signInBtn).toBeVisible();

    const [request] = await Promise.all([
      page.waitForRequest(req => req.url().includes('/auth/google')),
      signInBtn.click(),
    ]);
    expect(request.url()).toContain('/auth/google');
  });
});

// ── Logged In State ─────────────────────────────────────────────────────────

test.describe('Auth UI - Logged In', () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([{
      name: 'token',
      value: generateToken(),
      domain: 'localhost',
      path: '/',
    }]);
  });

  test('should show user profile name', async ({ page }) => {
    await page.goto('/');
    const username = page.locator('.auth__username');
    await expect(username).toBeVisible();
    await expect(username).toHaveText('Test User');
  });

  test('should show Upload Game button', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.auth__btn--upload')).toBeVisible();
    await expect(page.locator('.auth__btn--upload')).toHaveText('Upload Game');
  });

  test('should show Logout button', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.auth__btn--logout')).toBeVisible();
    await expect(page.locator('.auth__btn--logout')).toHaveText('Logout');
  });

  test('Upload button should open upload modal', async ({ page }) => {
    await page.goto('/');
    await page.locator('.auth__btn--upload').click();
    await expect(page.locator('.upload-modal__overlay')).toBeVisible();
    await expect(page.locator('.upload-modal__title')).toHaveText('Upload Game');
  });

  test('Logout should clear session and show Sign In button', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.auth__username')).toBeVisible();
    await page.locator('.auth__btn--logout').click();
    // After logout, Sign In button should appear
    await expect(page.locator('.auth__btn--google')).toBeVisible();
    // Profile should disappear
    await expect(page.locator('.auth__username')).not.toBeVisible();
  });
});

// ── Toast Notifications ─────────────────────────────────────────────────────

test.describe('Auth UI - Toast Notifications', () => {
  test('should show success toast on ?login=success', async ({ page, context }) => {
    // Set cookie so auth check succeeds and we get the full UI
    await context.addCookies([{
      name: 'token',
      value: generateToken(),
      domain: 'localhost',
      path: '/',
    }]);
    await page.goto('/?login=success');
    const toast = page.locator('.auth__toast--success');
    await expect(toast).toBeVisible({ timeout: 5000 });
    await expect(toast).toContainText('Welcome');
  });

  test('should show error toast on ?login=failed', async ({ page }) => {
    await page.goto('/?login=failed');
    const toast = page.locator('.auth__toast--error');
    await expect(toast).toBeVisible({ timeout: 5000 });
    await expect(toast).toContainText('Login failed');
  });

  test('should show error toast on ?login=csrf_error', async ({ page }) => {
    await page.goto('/?login=csrf_error');
    const toast = page.locator('.auth__toast--error');
    await expect(toast).toBeVisible({ timeout: 5000 });
    await expect(toast).toContainText('CSRF');
  });
});
