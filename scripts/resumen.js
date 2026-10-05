// Genera un resumen en Markdown de la ejecución (para el «Job summary» de GitHub Actions).
// Uso: node scripts/resumen.js test-results/results.json >> "$GITHUB_STEP_SUMMARY"
const fs = require('fs');

const file = process.argv[2] || 'test-results/results.json';
if (!fs.existsSync(file)) {
  console.log('No se encontró el reporte JSON de Playwright.');
  process.exit(0);
}
const rep = JSON.parse(fs.readFileSync(file, 'utf8'));

const filas = [];
const recorrer = (suite, ruta = []) => {
  const nombre = suite.title && !suite.title.endsWith('.js') ? [...ruta, suite.title] : ruta;
  for (const spec of suite.specs || []) {
    for (const t of spec.tests || []) {
      const ultimo = t.results[t.results.length - 1] || {};
      let estado;
      if (t.status === 'skipped') estado = 'Omitido';
      else if (t.expectedStatus === 'failed' && t.status === 'expected') estado = 'Falla esperada (defecto conocido)';
      else if (t.status === 'expected') estado = 'Aprobado';
      else if (t.status === 'flaky') estado = 'Inestable';
      else estado = 'Fallido';
      const motivo = (t.annotations || []).map((a) => a.description).filter(Boolean).join('; ');
      filas.push({ proyecto: t.projectName, titulo: spec.title, estado, ms: ultimo.duration || 0, motivo });
    }
  }
  for (const s of suite.suites || []) recorrer(s, nombre);
};
for (const s of rep.suites || []) recorrer(s);

const cuenta = (pred) => filas.filter(pred).length;
const casos = filas.filter((f) => f.proyecto !== 'setup');
console.log('## Resultado de la suite E2E - Locative (Grupo 8)\n');
console.log(`Fecha: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC. Escritura habilitada: ${process.env.PERMITIR_ESCRITURA === '1' ? 'sí' : 'no'}\n`);
console.log('| Aprobados | Fallas esperadas | Fallidos | Omitidos | Total |');
console.log('|---|---|---|---|---|');
console.log(`| ${cuenta((f) => f.proyecto !== 'setup' && f.estado === 'Aprobado')} | ${cuenta((f) => f.estado.startsWith('Falla esperada'))} | ${cuenta((f) => f.estado === 'Fallido')} | ${cuenta((f) => f.proyecto !== 'setup' && f.estado === 'Omitido')} | ${casos.length} |\n`);
console.log('| Navegador | Caso | Estado | Duración | Observación |');
console.log('|---|---|---|---|---|');
for (const f of filas) {
  console.log(`| ${f.proyecto} | ${f.titulo.replace(/\|/g, '/')} | ${f.estado} | ${(f.ms / 1000).toFixed(1)} s | ${f.motivo.replace(/\|/g, '/')} |`);
}
