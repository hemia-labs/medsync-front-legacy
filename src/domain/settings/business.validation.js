export function validateBusinessProfile(source = {}) {
    const data = {}, fieldErrors = {};
    const limits = { name: 500, legalName: 500, email: 254, address: 1000, logoUrl: 1000 };
    const labels = { name: 'El nombre comercial', legalName: 'La razón social', email: 'El correo de contacto', phone: 'El teléfono del consultorio', address: 'El domicilio', logoUrl: 'El enlace del logo' };
    Object.keys(labels).forEach(field => {
        data[field] = String(source[field] == null ? '' : source[field]).trim();
        if(['name', 'phone', 'address'].includes(field) && !data[field]) fieldErrors[field] = `${labels[field]} es obligatorio.`;
        else if(limits[field] && data[field].length > limits[field]) fieldErrors[field] = `${labels[field]} no debe superar ${limits[field]} caracteres.`;
    });
    if(data.phone) {
        data.phone = data.phone.replace(/[()\s.-]/g, '');
        if(/^\+52\d{10}$/.test(data.phone)) data.phone = data.phone.slice(3);
        if(!/^\d{10}$/.test(data.phone)) fieldErrors.phone = 'Ingresa un teléfono nacional de 10 dígitos. Puedes usar +52, espacios, guiones o paréntesis.';
    }
    if(data.email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(data.email)) fieldErrors.email = 'Ingresa un correo de contacto válido o deja el campo vacío.';
    if(data.logoUrl) {
        try {
            const url = new URL(data.logoUrl);
            if(!/^https?:$/.test(url.protocol) || !url.hostname || url.username || url.password || /[\s<>"'\\]/.test(data.logoUrl) || Array.from(data.logoUrl).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) throw new Error();
            data.logoUrl = url.href;
        } catch(_) { fieldErrors.logoUrl = 'Usa un enlace completo http:// o https:// para el logo, sin usuario ni contraseña, o deja el campo vacío.'; }
    }
    return { data, fieldErrors, isValid: Object.keys(fieldErrors).length === 0 };
}
