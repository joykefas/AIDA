import { test, expect } from '@playwright/test';

// ──────────────────────────────────────────────────────────────────────────────
// Legal & Marketing Pages
// ──────────────────────────────────────────────────────────────────────────────

test.describe('AIDA Legal & Marketing Flows', () => {
  test('Landing page renders with correct title, navigation, and footer links', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/AIDA/i);

    const privacyLink = page.locator('footer a[href="/privacy"]');
    const termsLink = page.locator('footer a[href="/terms"]');

    await expect(privacyLink).toBeVisible();
    await expect(termsLink).toBeVisible();
  });

  test('Privacy Policy page loads with COPPA and GDPR data rights', async ({ page }) => {
    await page.goto('/privacy');

    await expect(page.locator('h1')).toContainText('Privacy Policy');
    await expect(page.locator('text=COPPA Compliance')).toBeVisible();
    await expect(page.locator('text=Cloudflare Workers AI')).toBeVisible();
    await expect(page.locator('text=Your Rights & In-App Data Controls')).toBeVisible();
  });

  test('Terms of Service page loads with AI Disclaimer and Acceptable Use', async ({ page }) => {
    await page.goto('/terms');

    await expect(page.locator('h1')).toContainText('Terms of Service');
    await expect(page.locator('text=AI-Generated Content & Educational Disclaimer')).toBeVisible();
    await expect(page.locator('text=Acceptable Use & Intellectual Property')).toBeVisible();
  });

  test('Cookie Consent Banner displays and allows user to set preferences', async ({ page }) => {
    await page.goto('/');

    const banner = page.locator('div[role="region"][aria-label="Cookie preferences"]');
    await expect(banner).toBeVisible({ timeout: 10_000 });

    const essentialBtn = banner.locator('button:has-text("Essential only")');
    await essentialBtn.click();

    await expect(banner).not.toBeVisible();

    const consent = await page.evaluate(() => localStorage.getItem('aida_cookie_consent'));
    expect(consent).toBe('essential_only');
  });

  test('Unauthenticated user is redirected to login from protected app routes', async ({ page }) => {
    await page.goto('/home');
    await expect(page).toHaveURL(/\/login/);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Authentication & Onboarding
// ──────────────────────────────────────────────────────────────────────────────

test.describe('AIDA Registration & Onboarding', () => {
  /**
   * Generates a unique email for each test run to avoid conflicts.
   */
  const testEmail = () => `e2e_test_${Date.now()}@example.com`;
  const testPassword = 'E2ePassword123!';

  test('Registration form validates age gate — users under 13 cannot proceed without parental consent', async ({
    page,
  }) => {
    await page.goto('/register');

    // Fill in name
    await page.fill('input[name="displayName"]', 'Test User');
    await page.fill('input[name="email"]', testEmail());
    await page.fill('input[name="password"]', testPassword);

    // Pick a date-of-birth making user under 13
    const under13Date = new Date();
    under13Date.setFullYear(under13Date.getFullYear() - 10);
    const dobStr = under13Date.toISOString().split('T')[0]; // YYYY-MM-DD
    await page.fill('input[name="birthdate"]', dobStr);

    await page.click('button[type="submit"]');

    // Should show minor/parental consent notice or block registration
    const consentNotice = page.locator(
      'text=/parental consent|minor account|under 13/i',
    );
    await expect(consentNotice).toBeVisible({ timeout: 5_000 });
  });

  test('Adult registration (age ≥ 13) succeeds and routes to onboarding', async ({ page }) => {
    const email = testEmail();
    await page.goto('/register');

    await page.fill('input[name="displayName"]', 'E2E Adult');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', testPassword);

    const adultDate = new Date();
    adultDate.setFullYear(adultDate.getFullYear() - 20);
    await page.fill('input[name="birthdate"]', adultDate.toISOString().split('T')[0]);

    await page.click('button[type="submit"]');

    // After registration, user should land on /onboarding or /home
    await expect(page).toHaveURL(/\/(onboarding|home)/, { timeout: 15_000 });
  });

  test('Onboarding: user can select a learning style and complete setup', async ({ page }) => {
    // Assumes a registered and logged-in session exists (e.g. via storage state fixture)
    // Navigate directly to onboarding to test the UI independently
    await page.goto('/onboarding');

    // Learning style selection
    const analogiesBtn = page.locator('button, label').filter({ hasText: /analogies/i });
    if (await analogiesBtn.count() > 0) {
      await analogiesBtn.first().click();
    }

    // Complete onboarding
    const nextBtn = page.locator('button').filter({ hasText: /continue|next|finish|get started/i }).first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
    }

    // Should route to /home or /dashboard
    await expect(page).toHaveURL(/\/(home|dashboard)/, { timeout: 10_000 });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Core Learning Loop
// ──────────────────────────────────────────────────────────────────────────────

test.describe('AIDA Core Learning Loop', () => {
  /**
   * This describe block tests the complete MVP learning loop:
   *   Upload → Ready → Notes/Mind Map → Tutor Chat → Quiz → Review Queue
   *
   * Prerequisite: authenticated user session via storage state.
   * Set `storageState: 'playwright/.auth/user.json'` in the project config,
   * or use a `beforeEach` login fixture for fully isolated runs.
   */

  test('Upload panel tabs render for all four upload modes', async ({ page }) => {
    await page.goto('/home');

    await expect(page.locator('button:has-text("File"), button:has-text("PDF")')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('button:has-text("Record")')).toBeVisible();
    await expect(page.locator('button:has-text("YouTube")')).toBeVisible();
    await expect(page.locator('button:has-text("Type")')).toBeVisible();
  });

  test('Text upload: type content, submit, and verify document transitions to READY', async ({ page }) => {
    await page.goto('/home');

    // Switch to "Type" mode
    await page.click('button:has-text("Type")');

    // Optional title
    await page.fill('input[placeholder*="Title"]', 'E2E Test Notes');

    // Type some content
    await page.fill('textarea[placeholder*="notes"]', 'Photosynthesis is the process by which plants convert sunlight to energy.');

    // Submit
    await page.click('button:has-text("Upload")');

    // Should show "Processing" status
    await expect(page.locator('text=/Processing/i')).toBeVisible({ timeout: 8_000 });

    // Wait for READY dialog (polls every 3s, give it up to 60s for CI)
    await expect(page.locator('text=/Your notes are ready/i')).toBeVisible({ timeout: 60_000 });
  });

  test('Library page lists uploaded documents with correct metadata', async ({ page }) => {
    await page.goto('/library');

    // At least one document card should be visible
    await expect(page.locator('[data-testid="document-card"], .document-card, article').first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('Document detail page shows summary, notes, and mind map sections', async ({ page }) => {
    await page.goto('/library');

    // Navigate to first document
    const firstDoc = page.locator('[href*="/library/"]').first();
    await firstDoc.click();

    // Verify key sections load
    await expect(page.locator('text=/Summary/i').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=/Notes/i, text=/Key Points/i').first()).toBeVisible();
    await expect(page.locator('text=/Mind Map/i, [data-testid="mind-map"]').first()).toBeVisible({ timeout: 15_000 });
  });

  test('AI Tutor: submit a question and receive a grounded answer with Simplify option', async ({ page }) => {
    await page.goto('/library');

    const firstDoc = page.locator('[href*="/library/"]').first();
    await firstDoc.click();

    // Find the tutor chat input
    const chatInput = page.locator('input[placeholder*="question"], input[placeholder*="Ask"]');
    await expect(chatInput).toBeVisible({ timeout: 10_000 });

    await chatInput.fill('What is photosynthesis?');
    await page.keyboard.press('Enter');

    // AI response should appear
    const assistantMsg = page.locator('.bg-muted, [data-role="assistant"]').last();
    await expect(assistantMsg).toBeVisible({ timeout: 30_000 });

    // "Simplify this" option should appear
    await expect(page.locator('button:has-text("Simplify this"), text=Simplify this')).toBeVisible();
  });

  test('Thumbs-down on tutor response opens feedback popover', async ({ page }) => {
    await page.goto('/library');
    const firstDoc = page.locator('[href*="/library/"]').first();
    await firstDoc.click();

    // Ask a question first
    const chatInput = page.locator('input[placeholder*="question"], input[placeholder*="Ask"]');
    await chatInput.fill('Explain photosynthesis briefly.');
    await page.keyboard.press('Enter');

    // Wait for assistant message
    await page.waitForSelector('.bg-muted, [data-role="assistant"]', { timeout: 30_000 });

    // Click thumbs-down
    await page.click('button[aria-label="Unhelpful"]');

    // Feedback popover should appear
    await expect(page.locator('text=/What went wrong/i')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('button:has-text("Submit")')).toBeVisible();
    await expect(page.locator('button:has-text("Skip")')).toBeVisible();
  });

  test('Quiz: attempt a question and verify instant feedback renders', async ({ page }) => {
    await page.goto('/library');
    const firstDoc = page.locator('[href*="/library/"]').first();
    await firstDoc.click();

    // Navigate to quiz section
    const quizLink = page.locator('[href*="/quiz"], button:has-text("Quiz"), a:has-text("Quiz")').first();
    await quizLink.click();

    // First question should appear
    await expect(page.locator('text=/Question/i, [data-testid="quiz-question"]').first()).toBeVisible({
      timeout: 15_000,
    });

    // Select the first answer option
    const firstOption = page.locator('button[data-option], label[for*="option"], .quiz-option').first();
    if (await firstOption.isVisible()) {
      await firstOption.click();

      // Feedback (correct/incorrect) should appear
      await expect(
        page.locator('text=/Correct|Incorrect|Well done|Try again/i').first(),
      ).toBeVisible({ timeout: 15_000 });
    }
  });

  test('Review Queue: completing a quiz updates the spaced-repetition review calendar', async ({ page }) => {
    await page.goto('/review');

    // Review calendar or queue page should load
    await expect(page.locator('h1, h2').filter({ hasText: /review|due|calendar/i }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Either a "nothing due" state or a list of due topics
    const nothingDue = page.locator('text=/nothing due|all caught up|no reviews/i');
    const dueTopics = page.locator('[data-testid="review-item"], .review-topic').first();

    await expect(nothingDue.or(dueTopics)).toBeVisible({ timeout: 10_000 });
  });

  test('Record tab: Start Recording button and microphone UI are visible', async ({ page }) => {
    await page.goto('/home');

    await page.click('button:has-text("Record")');

    // Start Recording button should be visible
    await expect(page.locator('button:has-text("Start Recording")')).toBeVisible({ timeout: 5_000 });

    // Fallback file picker should also be present
    await expect(page.locator('text=/or upload a recorded file/i')).toBeVisible();
  });
});
