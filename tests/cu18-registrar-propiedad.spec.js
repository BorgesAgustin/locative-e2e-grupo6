// @ts-check
// CU18 — Registrar propiedad (RF-1). Especificación: TP2 del Grupo 8, págs. 13-15.
const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { usarSesion, requiereEscritura, tituloQA, F, abrirAlta, completarAlta, mensajeValidacion, authFile, bloquearEscrituras, mensajeError, centrar } = require('./helpers');

const BASE = {
  tipo: 'departamento', operacion: 'alquiler', precio: 250000,
  provincia: 'Misiones', ciudad: 'Posadas', barrio: 'QA6- Centro', direccion: 'QA6- Av. Mitre 1234',
  dormitorios: 2, banos: 1, supTotal: 60, supCubierta: 55, cochera: true,
  descripcion: 'QA6- Propiedad creada por la suite automatizada del Grupo 6. Puede eliminarse.',
};

test.describe('CU18 — Registrar propiedad (actor: Inmobiliaria)', () => {
  usarSesion('inmobiliaria');

  // ───────────── CP-CU18-01 - Flujo básico (caso que pasa) ─────────────
  test('CP-CU18-01 - alta con datos válidos se registra y publica', async ({ page }) => {
    requiereEscritura();
    const titulo = tituloQA('CP-CU18-01');
    await abrirAlta(page);
    await completarAlta(page, { ...BASE, titulo });
    await page.getByRole('button', { name: 'Guardar propiedad' }).click();

    // Poscondición: la propiedad queda registrada y se muestra su detalle.
    await expect(page).toHaveURL(/\/inmobiliaria\/propiedades\/[0-9a-f-]{36}$/);
    const main = page.locator('main');
    await expect(main).toContainText(titulo);
    await expect(main).toContainText(/\$\s?250\.000/);
    await expect(main).toContainText('disponible alquiler', { ignoreCase: true });
    await expect(main).toContainText('60 m²', { ignoreCase: true });

    // Integración con el listado interno y con el portal público (CU1).
    await page.goto('/inmobiliaria/propiedades');
    await expect(page.getByRole('heading', { name: titulo })).toBeVisible();
    await page.goto('/portal');
    await expect(page.getByRole('heading', { name: titulo })).toBeVisible();
  });

  // ───────────── CP-CU18-02 - Extensión 3.b (caso que falla) ─────────────
  test('CP-CU18-02 - campos obligatorios vacíos: no registra nada', async ({ page }) => {
    await abrirAlta(page);
    await page.getByRole('button', { name: 'Guardar propiedad' }).click();
    await expect(page).toHaveURL(/\/propiedades\/nueva$/);
    // Controles que el sistema marca como obligatorios e incompletos.
    const invalidos = await page.locator('main form :invalid').evaluateAll((els) => els.map((e) => e.getAttribute('name')));
    expect(invalidos).toEqual(['title', 'price', 'province', 'address']);
  });

  test('CP-CU18-02 - campos obligatorios vacíos: mensaje según especificación (3.b.1)', async ({ page }) => {
    test.fail(true, 'DEF-CU18-01: el sistema no muestra "Campos obligatorios sin rellenar" ni lista los campos; sólo el globo nativo del navegador en el primer campo');
    await abrirAlta(page);
    await page.getByRole('button', { name: 'Guardar propiedad' }).click();
    await expect(page.getByText('Campos obligatorios sin rellenar')).toBeVisible({ timeout: 3_000 });
  });

  test('CP-CU18-07 - superficie y descripción son obligatorias según el TP2', async ({ page }) => {
    test.fail(true, 'DEF-CU18-02: superficie y descripción figuran como obligatorias en el TP2 pero el sistema las acepta vacías (ni la validación del navegador ni la del código las exige)');
    const intentos = await bloquearEscrituras(page);
    await abrirAlta(page);
    await completarAlta(page, { ...BASE, titulo: 'QA6- sin guardar', supTotal: '', supCubierta: '', descripcion: '' });
    await page.getByRole('button', { name: 'Guardar propiedad' }).click();
    // Si el sistema rechazara los datos, no intentaría guardar. La red de seguridad corta el guardado.
    await expect(mensajeError(page)).toBeVisible();
    await centrar(mensajeError(page));
    expect(intentos, 'el sistema intentó guardar la propiedad sin superficie ni descripción').toEqual([]);
  });

  // ───────────── CP-CU18-03 - Valores límite (sin escritura) ─────────────
  const LIMITES = [
    // [control, valor, ¿válido?, justificación]
    ['precio', '-1', false, 'debajo del mínimo (min=1)'],
    ['precio', '0', false, 'límite inferior - 1'],
    ['precio', '1', true, 'límite inferior'],
    ['precio', '2', true, 'límite inferior + 1'],
    ['precio', '1.5', false, 'no entero (step=1)'],
    ['dormitorios', '-1', false, 'debajo del mínimo (min=0)'],
    ['dormitorios', '0', true, 'límite inferior'],
    ['dormitorios', '1', true, 'límite inferior + 1'],
    ['dormitorios', '1.5', false, 'no entero'],
    ['supTotal', '-0.01', false, 'debajo del mínimo (min=0)'],
    ['supTotal', '0', true, 'límite inferior'],
    ['supTotal', '0.01', true, 'mínima precisión (step=0.01)'],
    ['supTotal', '12.345', false, 'tres decimales'],
  ];
  for (const [campo, valor, valido, motivo] of LIMITES) {
    test(`CP-CU18-03 - ${campo} = ${valor}: ${valido ? 'aceptado' : 'rechazado'} (${motivo})`, async ({ page }) => {
      await abrirAlta(page);
      await page.fill(F[campo], valor);
      const msg = await mensajeValidacion(page, F[campo]);
      if (valido) expect(msg, `se esperaba válido y el navegador dijo: "${msg}"`).toBe('');
      else expect(msg, 'se esperaba un mensaje de validación').not.toBe('');
    });
  }

  // Corregido el 06/10/2026: la versión anterior sólo consultaba la validación nativa del navegador
  // (checkValidity) sin enviar el formulario. El análisis de caja blanca mostró que el sistema valida
  // la superficie al guardar, así que DEF-CU18-04 fue un falso positivo.
  test('CP-CU18-13 - superficie cubierta mayor que la total se rechaza al guardar', async ({ page }) => {
    const intentos = await bloquearEscrituras(page);
    await abrirAlta(page);
    await completarAlta(page, { ...BASE, titulo: 'QA6- sin guardar', supTotal: 100, supCubierta: 250 });
    await page.getByRole('button', { name: 'Guardar propiedad' }).click();
    await expect(mensajeError(page)).toHaveText('La superficie cubierta no puede ser mayor que la superficie total.');
    await centrar(mensajeError(page));
    await expect(page).toHaveURL(/\/propiedades\/nueva$/);
    expect(intentos).toEqual([]);
  });

  // ───────────── CP-CU18-04 - Integración con el panel del propietario ─────────────
  test('CP-CU18-04 - la propiedad asignada aparece en "Mis propiedades" del propietario', async ({ page, browser }) => {
    requiereEscritura();
    test.skip(!fs.existsSync(authFile('propietario')), 'Falta la sesión del propietario');
    const titulo = tituloQA('CP-CU18-04');
    await abrirAlta(page);
    await completarAlta(page, { ...BASE, titulo, tipo: 'casa', precio: 320000, ciudad: 'Oberá', propietario: 'propietario' });
    await page.getByRole('button', { name: 'Guardar propiedad' }).click();
    await expect(page).toHaveURL(/\/inmobiliaria\/propiedades\/[0-9a-f-]{36}$/);
    await expect(page.locator('main')).toContainText(/Propietario:\s*propietario/);

    const ctx = await browser.newContext({ storageState: authFile('propietario') });
    const prop = await ctx.newPage();
    await prop.goto('/propietario/propiedades');
    await expect(prop.locator('main')).toContainText(titulo);
    await prop.screenshot({ path: test.info().outputPath('propietario-mis-propiedades.png'), fullPage: true });
    await ctx.close();
  });

  // ───────────── CP-CU18-05 - Extensión 3.c (cancelar) ─────────────
  test('CP-CU18-05 - cancelar no registra la propiedad y vuelve al listado', async ({ page }) => {
    await page.goto('/inmobiliaria/propiedades');
    const contador = page.getByText(/\d+ de \d+ propiedades/);
    const antes = await contador.textContent();
    await abrirAlta(page);
    await completarAlta(page, { ...BASE, titulo: 'QA6- no debe guardarse' });
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page).toHaveURL(/\/inmobiliaria\/propiedades$/);
    await expect(contador).toHaveText(antes || '');
  });
});
