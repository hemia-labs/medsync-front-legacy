// Exercise the existing production sidebar/mobile select as well as the reviewed QA shell.
async function selectSection(page, name) {
    const escaped = name === 'Información del consultorio' ? 'Informaci[oó]n del consultorio' : name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const mobile = page.getByLabel('Apartado', { exact: true });
    if (await mobile.isVisible()) {
        await mobile.click();
        await page.getByRole('option', { name: new RegExp(escaped) }).click();
        return;
    }
    const toggle = page.getByRole('button', { name: 'Apartados de configuración', exact: true });
    if (await toggle.isVisible()) await toggle.click();
    await page.getByRole('navigation', { name: 'Apartados de configuración', exact: true })
        .getByRole('button', { name: new RegExp('^' + escaped + '(?:$|\\s)') }).click();
}
module.exports = { selectSection };
