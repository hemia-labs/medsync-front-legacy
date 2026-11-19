function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function treatmentPlanPrintHtml({
  businessName, logo, patientName, title, closed, start, end, diagnosis, treatments,
  showStatus, showCosts, budget, consent, example = false
}) {
  const dateCell = value => escapeHtml(value).replace(/\//g, '/<wbr>');
  const headings = ['Tratamiento y dientes', ...(showStatus ? ['Estado'] : []), 'Inicio / fin estimados', ...(showCosts ? ['Costo'] : [])];
  const rows = treatments.map(item => `<tr>
    <td><strong>${escapeHtml(item.name || 'Sin nombre')}</strong>
      ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
      <p>${escapeHtml(item.teeth || 'Sin dientes específicos')}</p></td>
    ${showStatus ? `<td class="status">${escapeHtml(item.status)}</td>` : ''}
    <td>${dateCell(item.start)}<br>${dateCell(item.end)}</td>
    ${showCosts ? `<td class="amount">${escapeHtml(item.cost)}</td>` : ''}
  </tr>`).join('');

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Plan de tratamiento</title><style>
    body{font:14px Arial,sans-serif;color:#203349;margin:32px;line-height:1.5}
    h1{font-size:25px;margin:6px 0 12px}
    .brand{font-weight:bold;color:#147e9c;display:flex;align-items:center;gap:16px;overflow-wrap:anywhere}
    .brand img{width:120px;height:70px;object-fit:contain;flex:0 0 120px}
    .meta{border-top:2px solid #147e9c;padding-top:16px}
    table{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:20px}
    th,td{text-align:left;vertical-align:top;border-bottom:1px solid #cad5df;padding:10px;overflow-wrap:anywhere}
    th{background:#eef3f6;font-size:12px}
    th:first-child{width:48%}
    td p{margin:5px 0;white-space:pre-wrap}
    tr{break-inside:avoid}
    thead{display:table-header-group}
    .amount{text-align:right;white-space:nowrap}
    .status{white-space:nowrap}
    .summary{font-weight:bold;text-align:right}
    footer{border-top:1px solid #cad5df;margin-top:24px;padding-top:12px;font-size:11px;color:#52657b}
    @media screen and (max-width:480px){body{margin:12px;font-size:13px}
    table{table-layout:auto}
    th,td{padding:5px 3px}
    th:first-child{width:auto}
    h1{font-size:20px}}
    @media screen and (max-width:300px){body{margin:8px;font-size:12px}th{font-size:11px}th,td{padding:5px 2px}}
    @page{size:A4;margin:16mm}
    @media print{body{margin:0}}
    </style></head><body>
    <div class="brand">${logo ? `<img src="${escapeHtml(logo)}" alt="Logo del consultorio">` : ''}<span>${escapeHtml(businessName)}</span></div><h1>${escapeHtml(title || 'Plan de tratamiento')}</h1>
    <p class="meta"><strong>Paciente:</strong> ${escapeHtml(patientName || 'No especificado')}<br>
      <strong>Plan:</strong> ${closed ? 'Cerrado' : 'Activo'} · <strong>Inicio:</strong> ${escapeHtml(start)}
      ${closed ? ` · <strong>Cierre:</strong> ${escapeHtml(end)}` : ''}</p>
    ${diagnosis ? `<p><strong>Diagnóstico:</strong> ${escapeHtml(diagnosis)}</p>` : ''}
    <table><thead><tr>${headings.map(label => `<th>${label}</th>`).join('')}</tr></thead>
      <tbody>${rows || `<tr><td colspan="${headings.length}">Sin tratamientos registrados.</td></tr>`}</tbody></table>
    ${showCosts ? `<p class="summary">Presupuesto: ${escapeHtml(budget)}</p>
      <p>Incluye todos los tratamientos, también los cancelados. No representa saldo por cobrar.</p>` : ''}
    ${consent ? '<p>Hay un consentimiento registrado. El documento firmado conserva su propio contenido y se consulta por separado; esta impresión no lo sustituye.</p>' : ''}
    <footer>${example ? 'Ejemplo ilustrativo.' : `Documento informativo del plan guardado. No incluye notas internas ni firmas.<br>Impreso el ${escapeHtml(new Date().toLocaleDateString('es-MX'))}`}</footer>
    </body></html>`;
}

module.exports = { treatmentPlanPrintHtml };
