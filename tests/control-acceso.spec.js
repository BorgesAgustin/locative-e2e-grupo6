// @ts-check
// Precondición del CU18: «el actor debe estar autenticado y disponer de un rol con permisos de publicación».
const { test, expect } = require('@playwright/test');
const { usarSesion } = require('./helpers');

test.describe('CU18 — precondición: control de acceso al alta', () => {
  test('CP-CU18-06 · sin sesión, el alta redirige a /login', async ({ page }) => {
    await page.goto('/inmobiliaria/propiedades/nueva');
    await expect(page).toHaveURL(/\/login$/);
  });

  for (const rol of ['inquilino', 'propietario']) {
    test.describe(`rol ${rol}`, () => {
      usarSesion(rol);
      test(`CP-CU18-07 · ${rol} recibe «Acceso no autorizado» en el alta`, async ({ page }) => {
        await page.goto('/inmobiliaria/propiedades/nueva');
        await expect(page.getByRole('heading', { name: 'Acceso no autorizado' })).toBeVisible();
        await expect(page.locator('[name="title"]')).toHaveCount(0);
      });
    });
  }
});
