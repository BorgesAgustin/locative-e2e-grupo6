// @ts-check
const fs = require('fs');
const path = require('path');
const { test } = require('@playwright/test');

/** Roles con cuenta demo provista por el Grupo 8. */
const ROLES = {
  inmobiliaria: { email: process.env.INMOBILIARIA_EMAIL || 'inmobiliaria1@gmail.com', password: process.env.INMOBILIARIA_PASSWORD, home: '/inmobiliaria' },
  inquilino:    { email: process.env.INQUILINO_EMAIL    || 'inquilino1@gmail.com',    password: process.env.INQUILINO_PASSWORD,    home: '/inquilino' },
  propietario:  { email: process.env.PROPIETARIO_EMAIL  || 'propietario1@gmail.com',  password: process.env.PROPIETARIO_PASSWORD,  home: '/propietario' },
};

const authFile = (rol) => path.join(__dirname, '..', '.auth', `${rol}.json`);

/** Usa la sesión guardada del rol; si no hay credenciales, el caso queda «omitido» y no «fallido». */
function usarSesion(rol) {
  const file = authFile(rol);
  // Se resuelve en tiempo de ejecución: el archivo lo genera el proyecto «setup», que corre antes.
  test.use({ storageState: async ({}, use) => { await use(fs.existsSync(file) ? file : undefined); } });
  test.beforeEach(() => {
    test.skip(!fs.existsSync(file), `Sin sesión de ${rol}: falta el secreto ${rol.toUpperCase()}_PASSWORD`);
  });
}

/** Los casos que crean datos en el sistema del Grupo 8 sólo corren con PERMITIR_ESCRITURA=1. */
const ESCRITURA = process.env.PERMITIR_ESCRITURA === '1';
function requiereEscritura() {
  test.skip(!ESCRITURA, 'Caso con escritura: ejecutar con PERMITIR_ESCRITURA=1 (acordado con el Grupo 8, prefijo QA6-)');
  // Para no duplicar datos, los casos con escritura corren en un único navegador.
  test.skip(test.info().project.name !== 'chromium', 'Caso con escritura: se ejecuta sólo en chromium para no duplicar datos');
}

/** Prefijo y sello para identificar y limpiar los datos de prueba. */
const sello = () => new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
const tituloQA = (cp) => `QA6-AUTO ${cp} ${sello()}`;

/** Selectores del formulario «Nueva propiedad» (atributo name de cada control). */
const F = {
  titulo: '[name="title"]',
  tipo: '[name="property_type"]',
  operacion: '[name="operation_type"]',
  precio: '[name="price"]',
  moneda: '[name="currency"]',
  provincia: '[name="province"]',
  ciudad: '[name="city"]',
  barrio: '[name="neighborhood"]',
  direccion: '[name="address"]',
  dormitorios: '[name="bedrooms"]',
  banos: '[name="bathrooms"]',
  supTotal: '[name="total_area"]',
  supCubierta: '[name="covered_area"]',
  cochera: '[name="has_garage"]',
  patio: '[name="has_yard"]',
  descripcion: '[name="description"]',
  propietario: '[name="owner_id"]',
};

/** Abre el alta y espera a que el formulario esté listo. */
async function abrirAlta(page) {
  await page.goto('/inmobiliaria/propiedades/nueva');
  await page.locator(F.titulo).waitFor();
}

/** Completa el formulario con los datos del caso. */
async function completarAlta(page, d) {
  await page.fill(F.titulo, d.titulo);
  if (d.tipo) await page.selectOption(F.tipo, d.tipo);
  if (d.operacion) await page.selectOption(F.operacion, d.operacion);
  await page.fill(F.precio, String(d.precio));
  await page.selectOption(F.provincia, { label: d.provincia });
  // La lista de ciudades se carga recién al elegir la provincia.
  await page.locator(`${F.ciudad} option`, { hasText: d.ciudad }).waitFor({ state: 'attached' });
  await page.selectOption(F.ciudad, { label: d.ciudad });
  if (d.barrio) await page.fill(F.barrio, d.barrio);
  await page.fill(F.direccion, d.direccion);
  if (d.dormitorios !== undefined) await page.fill(F.dormitorios, String(d.dormitorios));
  if (d.banos !== undefined) await page.fill(F.banos, String(d.banos));
  if (d.supTotal !== undefined) await page.fill(F.supTotal, String(d.supTotal));
  if (d.supCubierta !== undefined) await page.fill(F.supCubierta, String(d.supCubierta));
  if (d.cochera) await page.check(F.cochera);
  if (d.patio) await page.check(F.patio);
  if (d.descripcion) await page.fill(F.descripcion, d.descripcion);
  if (d.propietario) await page.selectOption(F.propietario, { label: d.propietario });
}

/** Estado de validación nativa (HTML5) de un control: '' si es válido, o el mensaje del navegador. */
const mensajeValidacion = (page, sel) => page.locator(sel).evaluate((e) => e.validationMessage);
const formularioValido = (page) => page.locator('main form').evaluate((f) => f.checkValidity());

module.exports = { ROLES, authFile, usarSesion, requiereEscritura, ESCRITURA, tituloQA, F, abrirAlta, completarAlta, mensajeValidacion, formularioValido };
