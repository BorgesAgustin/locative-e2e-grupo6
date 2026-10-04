// @ts-check
// Inicia sesión una vez por rol y guarda la sesión (storageState) para el resto de la suite.
const fs = require('fs');
const path = require('path');
const { test: setup, expect } = require('@playwright/test');
const { ROLES, authFile } = require('./helpers');

for (const [rol, cuenta] of Object.entries(ROLES)) {
  setup(`iniciar sesión como ${rol}`, async ({ page }) => {
    setup.skip(!cuenta.password, `Falta el secreto ${rol.toUpperCase()}_PASSWORD`);
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(cuenta.email);
    await page.locator('input[type="password"]').fill(cuenta.password);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page).toHaveURL(new RegExp(cuenta.home + '$'), { timeout: 20_000 });
    fs.mkdirSync(path.dirname(authFile(rol)), { recursive: true });
    await page.context().storageState({ path: authFile(rol) });
  });
}
