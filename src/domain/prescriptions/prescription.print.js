const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const pick = (...values) => values.find((value) => value !== undefined && value !== null && value !== '') || '';

const templateOptions = (snapshot) => {
    let value = snapshot;
    if(typeof value === 'string') {
        try { value = JSON.parse(value); } catch (_) { value = null; }
    }
    const saved = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const visible = key => ![false, 0, '0', 'false'].includes(saved[key]);
    const opacity = Number(saved.background_opacity);
    return {
        showUniversity: visible('show_university'), showSpecialty: visible('show_specialty'), showFooter: visible('show_footer_note'),
        // Missing legacy preferences retain the previous visible content/both
        // images. Never replace a saved false flag with today's configuration.
        mode: ['header','background'].includes(saved.template_mode) ? saved.template_mode : 'legacy',
        backgroundOpacity: saved.background_opacity !== null && saved.background_opacity !== '' && Number.isFinite(opacity)
            ? Math.min(1, Math.max(0, opacity)) : 0.12
    };
};

const imageTag = (src, className, alt) => {
    if(!src) {
        return '';
    }

    return `<img class="${className}" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" />`;
};

export const buildPrescriptionPrintHtml = (prescription, config = {}) => {
    if (!prescription || prescription.status !== 'issued') return '';
    const options = templateOptions(prescription.template_snapshot);
    const doctorName = pick(prescription.doctor_name_snapshot, prescription.doctor_name, config.doctor_name, 'Doctor emisor');
    const professionalLicense = pick(prescription.professional_license_snapshot, config.professional_license);
    const university = pick(prescription.university_snapshot, config.university);
    const specialty = pick(prescription.specialty_snapshot, config.specialty);
    const specialtyLicense = pick(prescription.specialty_license_snapshot, config.specialty_license);
    const professionalPhone = pick(prescription.professional_phone_snapshot);
    const clinicName = pick(prescription.clinic_name_snapshot, config.clinic_name);
    const clinicAddress = pick(prescription.clinic_address_snapshot, config.clinic_address);
    const clinicPhone = pick(prescription.clinic_phone_snapshot, config.clinic_phone);
    const signature = pick(prescription.signature_snapshot, config.signature_image);
    const headerImage = options.mode === 'background' ? '' : pick(prescription.header_image_snapshot, config.header_image);
    const backgroundImage = options.mode === 'header' ? '' : pick(prescription.background_image_snapshot, config.background_image);
    const footerNote = pick(prescription.footer_note_snapshot, config.footer_note);
    const patientName = pick(prescription.patient_name, 'Paciente');
    const patientMeta = [
        prescription.patient_age ? `${prescription.patient_age} anios` : '',
        prescription.patient_birthday ? `Nacimiento: ${prescription.patient_birthday}` : '',
        prescription.patient_sex ? `Sexo: ${prescription.patient_sex}` : ''
    ].filter(Boolean).join(' | ');

    const items = (prescription.items || []).map((item, index) => `
        <section class="medicine">
            <h3>${index + 1}. ${escapeHtml(item.generic_name)}</h3>
            ${item.commercial_name ? `<p><strong>Comercial:</strong> ${escapeHtml(item.commercial_name)}</p>` : ''}
            <p>
                ${item.presentation ? `<strong>Presentacion:</strong> ${escapeHtml(item.presentation)} ` : ''}
                ${item.concentration ? `<strong>Concentracion:</strong> ${escapeHtml(item.concentration)} ` : ''}
                ${item.pharmaceutical_form ? `<strong>Forma:</strong> ${escapeHtml(item.pharmaceutical_form)}` : ''}
            </p>
            <p><strong>Dosis:</strong> ${escapeHtml(item.dose)} | <strong>Via:</strong> ${escapeHtml(item.administration_route)} | <strong>Frecuencia:</strong> ${escapeHtml(item.frequency)} | <strong>Duracion:</strong> ${escapeHtml(item.duration)}</p>
            ${item.quantity ? `<p><strong>Cantidad:</strong> ${escapeHtml(item.quantity)}</p>` : ''}
            ${item.indications ? `<p class="indications">${escapeHtml(item.indications)}</p>` : ''}
        </section>
    `).join('');

    const overlay = Number((1 - options.backgroundOpacity).toFixed(2));
    const backgroundStyle = backgroundImage ? `background-image: linear-gradient(rgba(255,255,255,${overlay}), rgba(255,255,255,${overlay})), url('${escapeHtml(backgroundImage)}');` : '';

    return `
<!doctype html>
<html>
<head>
    <meta charset="utf-8" />
    <title>${escapeHtml(prescription.folio || 'Receta medica')}</title>
    <style>
        @page { size: letter; margin: 15mm; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #1f2937; font-family: Arial, Helvetica, sans-serif; background: #f3f7f9; }
        .sheet { width: 216mm; min-height: 279mm; margin: 0 auto; padding: 18mm; background: #fff; ${backgroundStyle} background-size: cover; background-position: center; }
        .top-image { width: 100%; max-height: 70px; object-fit: contain; object-position: left center; margin-bottom: 16px; }
        .header { display: flex; justify-content: space-between; gap: 20px; border-bottom: 2px solid #cceff6; padding-bottom: 14px; }
        .doctor h1 { margin: 0; font-size: 22px; color: #155e75; }
        .doctor p, .clinic p, .patient p, .meta p { margin: 3px 0; font-size: 12px; }
        .clinic { text-align: right; max-width: 42%; }
        .meta-grid { display: grid; grid-template-columns: 1fr auto; gap: 18px; margin: 18px 0; padding: 12px; border: 1px solid #dce8ee; background: #f8fcfd; }
        .label { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: #0e7490; font-weight: bold; margin-bottom: 4px; }
        .section-title { color: #155e75; font-size: 14px; letter-spacing: .08em; text-transform: uppercase; border-bottom: 1px solid #dce8ee; padding-bottom: 6px; margin-top: 20px; }
        .medicine { padding: 12px 0; border-bottom: 1px solid #edf2f5; page-break-inside: avoid; }
        .medicine h3 { margin: 0 0 6px; font-size: 16px; color: #111827; }
        .medicine p { margin: 4px 0; font-size: 12px; line-height: 1.45; }
        .indications { padding: 8px 10px; background: #f8fafc; border-left: 3px solid #22a6c7; white-space: pre-wrap; overflow-wrap: anywhere; }
        .notes { margin-top: 18px; padding: 12px; background: #f8fafc; border: 1px solid #e5edf2; font-size: 12px; }
        .signature { margin-top: 42px; text-align: center; width: 260px; margin-left: auto; }
        .signature img { max-height: 80px; max-width: 240px; object-fit: contain; }
        .signature-line { border-top: 1px solid #64748b; padding-top: 6px; font-size: 12px; }
        .footer { margin-top: 28px; font-size: 10px; color: #64748b; text-align: center; }
        @media print {
            body { background: #fff; }
            .sheet { margin: 0; box-shadow: none; }
        }
    </style>
</head>
<body>
    <main class="sheet">
        ${imageTag(headerImage, 'top-image', 'Cabecera')}
        <header class="header">
            <div class="doctor">
                <div class="label">Receta medica</div>
                <h1>${escapeHtml(doctorName)}</h1>
                ${options.showSpecialty && specialty ? `<p>${escapeHtml(specialty)}</p>` : ''}
                ${professionalLicense ? `<p>Cedula profesional: ${escapeHtml(professionalLicense)}</p>` : ''}
                ${options.showSpecialty && specialtyLicense ? `<p>Cedula especialidad: ${escapeHtml(specialtyLicense)}</p>` : ''}
                ${options.showUniversity && university ? `<p>${escapeHtml(university)}</p>` : ''}
                ${professionalPhone ? `<p>Tel. profesional: ${escapeHtml(professionalPhone)}</p>` : ''}
            </div>
            <div class="clinic">
                ${clinicName ? `<p><strong>${escapeHtml(clinicName)}</strong></p>` : ''}
                ${clinicAddress ? `<p>${escapeHtml(clinicAddress)}</p>` : ''}
                ${clinicPhone ? `<p>Tel. ${escapeHtml(clinicPhone)}</p>` : ''}
            </div>
        </header>

        <section class="meta-grid">
            <div class="patient">
                <div class="label">Paciente</div>
                <p><strong>${escapeHtml(patientName)}</strong></p>
                ${patientMeta ? `<p>${escapeHtml(patientMeta)}</p>` : ''}
                ${prescription.diagnosis ? `<p><strong>Diagnostico:</strong> ${escapeHtml(prescription.diagnosis)}</p>` : ''}
            </div>
            <div class="meta">
                <div class="label">Folio</div>
                <p><strong>${escapeHtml(prescription.folio)}</strong></p>
                <p>${escapeHtml(prescription.issue_date || '')}</p>
            </div>
        </section>

        <h2 class="section-title">Prescripcion</h2>
        ${items || '<p>Sin medicamentos capturados.</p>'}

        ${prescription.notes ? `<div class="notes"><strong>Notas:</strong><br>${escapeHtml(prescription.notes)}</div>` : ''}

        <section class="signature">
            ${imageTag(signature, 'signature-image', 'Firma')}
            <div class="signature-line">${escapeHtml(doctorName)}</div>
        </section>

        ${options.showFooter && footerNote ? `<footer class="footer">${escapeHtml(footerNote)}</footer>` : ''}
    </main>
</body>
</html>`;
};

// Preview reuses the exact print markup with synthetic, in-memory data. It
// neither persists nor issues a prescription and runs in a sandboxed iframe.
export const buildPrescriptionPreviewHtml = (config = {}, doctor = {}) => {
    const html = buildPrescriptionPrintHtml({
        status: 'issued', folio: 'Vista previa', patient_name: 'Nombre del paciente de ejemplo',
        doctor_name_snapshot: doctor.professional_name || 'Nombre profesional',
        professional_license_snapshot: doctor.professional_license || 'Sin cédula',
        university_snapshot: doctor.university, specialty_snapshot: doctor.specialty,
        specialty_license_snapshot: doctor.specialty_license, signature_snapshot: doctor.signature_image,
        template_snapshot: {...config},
        items: [{generic_name:'Medicamento de ejemplo',dose:'Dosis',administration_route:'Vía',frequency:'Frecuencia',duration:'Duración'}]
    }, config);
    return html.replace('</style>', `
        body { background: #f8fafc; }
        .sheet { width: 100%; max-width: 816px; min-height: 560px; padding: 24px; }
        .header { flex-wrap: wrap; } .clinic { max-width: 100%; }
        @media (max-width: 450px) { .sheet { padding: 16px; } .header, .meta-grid { display: block; } .clinic { text-align: left; margin-top: 12px; } .meta { margin-top: 12px; } .signature { max-width: 100%; } }
    </style>`);
};

export const openPrescriptionPrintWindow = (prescription, config = {}, shouldPrint = true) => {
    if (!prescription || prescription.status !== 'issued') return false;
    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if(!printWindow) {
        return false;
    }

    printWindow.document.open();
    printWindow.document.write(buildPrescriptionPrintHtml(prescription, config));
    printWindow.document.close();

    if(shouldPrint) {
        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
        };
    }

    return true;
};
