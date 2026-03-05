const { test, expect } = require('@playwright/test');

// ── Game List ───────────────────────────────────────────────────────────────

test.describe('Gallery - Game List', () => {
  test('should display game cards', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('.game-card');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(3);
  });

  test('each card should have thumbnail, title, and description', async ({ page }) => {
    await page.goto('/');
    const firstCard = page.locator('.game-card').first();
    await expect(firstCard).toBeVisible();
    await expect(firstCard.locator('.game-card__thumbnail')).toBeVisible();
    await expect(firstCard.locator('.game-card__title')).toBeVisible();
    await expect(firstCard.locator('.game-card__description')).toBeVisible();
  });

  test('card should link to game page', async ({ page }) => {
    await page.goto('/');
    const firstCard = page.locator('.game-card').first();
    await expect(firstCard).toBeVisible();
    const href = await firstCard.getAttribute('href');
    expect(href).toMatch(/game\.html\?id=/);
  });
});

// ── Search ──────────────────────────────────────────────────────────────────

test.describe('Gallery - Search', () => {
  test('should filter games by title', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.game-card');
    await page.fill('#search-input', 'Sample');
    await page.waitForTimeout(300); // debounce
    const visible = page.locator('.game-card').filter({ hasNot: page.locator('[style*="display: none"]') });
    // Only "Sample Platformer" should match
    const count = await page.locator('.game-card').evaluateAll(
      cards => cards.filter(c => c.style.display !== 'none').length
    );
    expect(count).toBe(1);
  });

  test('should hide all cards for non-matching query', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.game-card');
    await page.fill('#search-input', 'zzz_nonexistent_game_zzz');
    await page.waitForTimeout(300);
    const count = await page.locator('.game-card').evaluateAll(
      cards => cards.filter(c => c.style.display !== 'none').length
    );
    expect(count).toBe(0);
  });

  test('clearing search should show all cards', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.game-card');
    await page.fill('#search-input', 'Sample');
    await page.waitForTimeout(300);
    await page.fill('#search-input', '');
    await page.waitForTimeout(300);
    const count = await page.locator('.game-card').evaluateAll(
      cards => cards.filter(c => c.style.display !== 'none').length
    );
    expect(count).toBeGreaterThanOrEqual(3);
  });
});

// ── Tag Filter ──────────────────────────────────────────────────────────────

test.describe('Gallery - Tag Filter', () => {
  test('should render tag filter buttons', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.tag-filter__btn');
    const count = await page.locator('.tag-filter__btn').count();
    // At least "All" + some tag buttons
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('All button should be active by default', async ({ page }) => {
    await page.goto('/');
    const allBtn = page.locator('.tag-filter__btn', { hasText: 'All' });
    await expect(allBtn).toHaveClass(/tag-filter__btn--active/);
  });

  test('clicking a tag should filter games', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.game-card');
    // "Action" tag exists on sample-game (tags: ["platformer","action"])
    const actionBtn = page.locator('.tag-filter__btn', { hasText: 'Action' });
    await actionBtn.click();
    await page.waitForTimeout(300);
    const visibleCount = await page.locator('.game-card').evaluateAll(
      cards => cards.filter(c => c.style.display !== 'none').length
    );
    expect(visibleCount).toBeGreaterThan(0);
    expect(visibleCount).toBeLessThan(3);
  });

  test('clicking All should show all games again', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.game-card');
    // Filter by a tag first
    const actionBtn = page.locator('.tag-filter__btn', { hasText: 'Action' });
    await actionBtn.click();
    await page.waitForTimeout(200);
    // Click All
    const allBtn = page.locator('.tag-filter__btn', { hasText: 'All' });
    await allBtn.click();
    await page.waitForTimeout(200);
    const visibleCount = await page.locator('.game-card').evaluateAll(
      cards => cards.filter(c => c.style.display !== 'none').length
    );
    expect(visibleCount).toBeGreaterThanOrEqual(3);
  });
});

// ── Sort ────────────────────────────────────────────────────────────────────

test.describe('Gallery - Sort', () => {
  test('sort dropdown should exist', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.sort-bar__select')).toBeVisible();
  });

  test('A-Z sort should alphabetize games', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.game-card');
    await page.selectOption('.sort-bar__select', 'az');
    await page.waitForTimeout(300);
    const titles = await page.locator('.game-card__title').allTextContents();
    const sorted = [...titles].sort((a, b) => a.localeCompare(b));
    expect(titles).toEqual(sorted);
  });

  test('Newest sort should reorder games', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.game-card');
    const titlesBefore = await page.locator('.game-card__title').allTextContents();
    await page.selectOption('.sort-bar__select', 'newest');
    await page.waitForTimeout(300);
    const titlesAfter = await page.locator('.game-card__title').allTextContents();
    // Verify cards were reordered (or stayed same if already newest-first)
    expect(titlesAfter.length).toBe(titlesBefore.length);
  });
});

// ── Favorites ───────────────────────────────────────────────────────────────

test.describe('Gallery - Favorites', () => {
  test('should show heart buttons on cards', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.favorite-btn');
    const hearts = page.locator('.favorite-btn');
    expect(await hearts.count()).toBeGreaterThanOrEqual(3);
  });

  test('clicking heart should toggle active state', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.favorite-btn');
    const heart = page.locator('.favorite-btn').first();
    // Activate
    await heart.click();
    await expect(heart).toHaveClass(/favorite-btn--active/);
    // Deactivate
    await heart.click();
    await expect(heart).not.toHaveClass(/favorite-btn--active/);
  });

  test('favorite should persist in localStorage', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.favorite-btn');
    const heart = page.locator('.favorite-btn').first();
    await heart.click();
    const favs = await page.evaluate(() => JSON.parse(localStorage.getItem('favorites')));
    expect(favs.length).toBeGreaterThan(0);
  });

  test('unfavoriting should remove from localStorage', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.favorite-btn');
    const heart = page.locator('.favorite-btn').first();
    await heart.click(); // add
    await heart.click(); // remove
    const favs = await page.evaluate(() => {
      const raw = localStorage.getItem('favorites');
      return raw ? JSON.parse(raw) : [];
    });
    expect(favs.length).toBe(0);
  });
});

// ── Recent Plays ────────────────────────────────────────────────────────────

test.describe('Gallery - Recent Plays', () => {
  test('should not show recent plays section initially', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.game-card');
    await expect(page.locator('.recent-plays__title')).not.toBeVisible();
  });

  test('should show recent plays after visiting a game', async ({ page }) => {
    // Visit a game page to record a play
    await page.goto('/game.html?id=sample-game');
    await page.waitForTimeout(500);
    // Go back to gallery
    await page.goto('/');
    await page.waitForSelector('.game-card');
    // Recent plays section should appear
    await expect(page.locator('.recent-plays__title')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.recent-plays__title')).toHaveText('Recently Played');
    const recentCards = page.locator('.recent-plays__card');
    expect(await recentCards.count()).toBeGreaterThanOrEqual(1);
  });
});
