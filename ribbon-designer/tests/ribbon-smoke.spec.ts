import { expect, test } from '@playwright/test';

test('迁移版 Ribbon 设计器主流程', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  await expect(page.getByRole('heading', { name: '迁移版 Spike：Puck 外壳 + RGL 槽位' })).toBeVisible();
  await expect(page.getByText('每个子组 6列 x 3行')).toBeVisible();
  await expect(page.getByText('Puck 配置已接入')).toBeVisible();
  await expect(page.getByText('Ribbon 命令类')).toBeVisible();

  const firstDrop = page.locator('[data-testid^="next-drop-"]').first();
  await expect(firstDrop).toBeVisible();

  await page
    .getByTestId('next-palette-button-large')
    .dragTo(firstDrop, { targetPosition: { x: 176, y: 48 } });

  const addedButton = page.locator('[data-testid^="next-control-button_"]').last();
  await expect(addedButton).toBeVisible();
  await expect(addedButton).toHaveCSS('width', '64px');
  await expect(addedButton).toHaveCSS('height', '96px');

  await addedButton.click();
  await page.getByLabel('标题').fill('批量导出');
  await expect(page.locator('.next-json')).toContainText('"caption": "批量导出"');
  await expect(page.locator('.next-json')).toContainText('"layout"');
  await expect(page.locator('.next-json')).toContainText('"w": 2');
  await expect(page.locator('.next-json')).toContainText('"h": 3');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /导出 JSON/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.json$/);

  await page.screenshot({ path: 'playwright-next-rgl-smoke.png', fullPage: true });
});
