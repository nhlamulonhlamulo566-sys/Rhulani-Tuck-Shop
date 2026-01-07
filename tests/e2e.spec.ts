import { test, expect } from '@playwright/test';

const routes = ['/', '/pos', '/dashboard', '/products', '/sales', '/settings'];

for (const route of routes) {
  test(`route ${route} loads`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(400);
  });
}
