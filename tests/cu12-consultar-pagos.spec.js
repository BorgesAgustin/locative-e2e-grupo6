// @ts-check
// CU12 — Consultar estado de pagos (RF-4). Especificación: TP2 del Grupo 8, págs. 16-17.
// El Grupo 8 confirmó que el CU12 no se implementó. Estos casos dejan constancia automática
// del estado: el día que se implemente, los marcados con test.fail() empezarán a «pasar»
// y Playwright avisará que la expectativa cambió.
const { test, expect } = require('@playwright/test');
const { usarSesion } = require('./helpers');

test.describe('CU12 — Consultar estado de pagos (actor: Inquilino)', () => {
  usarSesion('inquilino');

  test('CP-CU12-00 · precondición: el inquilino tiene un contrato activo', async ({ page }) => {
    await page.goto('/inquilino');
    await expect(page.locator('main')).toContainText('Contrato activo');
  });

  test('CP-CU12-01 · «Mis pagos» muestra la lista cronológica de pagos (paso 3)', async ({ page }) => {
    test.fail(true, 'CU12 no implementado: /inquilino/pagos muestra «Próximamente»');
    await page.goto('/inquilino/pagos');
    for (const col of ['Monto', 'Vencimiento', 'Estado']) {
      await expect(page.getByRole('columnheader', { name: col })).toBeVisible({ timeout: 3_000 });
    }
  });

  test('CP-CU12-01 · evidencia: «Mis pagos» y «Mi contrato» están marcados como «Próximamente»', async ({ page }) => {
    for (const ruta of ['/inquilino/pagos', '/inquilino/contrato']) {
      await page.goto(ruta);
      await expect(page.locator('main')).toContainText('PRÓXIMAMENTE', { ignoreCase: true });
      await page.screenshot({ path: test.info().outputPath(`${ruta.replace(/\//g, '_')}.png`) });
    }
  });
});

test.describe('CU12 — Consultar estado de pagos (actor: Propietario)', () => {
  usarSesion('propietario');
  test('CP-CU12-02 · la sección «Pagos» del propietario existe pero sin datos', async ({ page }) => {
    await page.goto('/propietario/pagos');
    await expect(page.locator('main')).toContainText('No hay pagos pendientes');
  });
});
