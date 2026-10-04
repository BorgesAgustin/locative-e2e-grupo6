// @ts-check
// Configuración de la suite E2E de Locative (Grupo 8) — Equipo de prueba: Grupo 6.
require('dotenv').config();
const { defineConfig, devices } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'https://proyecto-inmobiliario.vercel.app';

module.exports = defineConfig({
  testDir: './tests',
  // El sistema bajo prueba es un despliegue compartido: se ejecuta en serie para no
  // generar carga ni condiciones de carrera sobre los datos de otros grupos.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: BASE_URL,
    locale: 'es-AR',
    viewport: { width: 1280, height: 800 },
    screenshot: 'on',          // evidencia de cada caso para la planilla de ejecuciones
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // 1) Inicio de sesión por rol: guarda la sesión en .auth/<rol>.json
    { name: 'setup', testMatch: /auth\.setup\.js/ },
    // 2) Casos de prueba, en dos navegadores
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.js/,
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 800 } },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.js/,
    },
  ],
});
