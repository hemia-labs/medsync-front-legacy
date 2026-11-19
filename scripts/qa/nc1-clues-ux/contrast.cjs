async function contrast(locator) {
  return locator.evaluate(el => {
    const rgba = x => { const v = (x.match(/[\d.]+/g) || []).map(Number); return [v[0] || 0, v[1] || 0, v[2] || 0, v.length > 3 ? v[3] : 1]; };
    let target = el.parentElement, bg = [255, 255, 255, 1];
    while (target) { const c = rgba(getComputedStyle(target).backgroundColor); if (c[3] > 0) { bg = c; break; } target = target.parentElement; }
    const own = rgba(getComputedStyle(el).backgroundColor);
    const blend = (top, base, a) => [0, 1, 2].map(i => top[i] * a + base[i] * (1 - a));
    let base = own[3] > 0 ? blend(own, bg, own[3]) : bg.slice(0, 3);
    const before = getComputedStyle(el, '::before'), overlay = rgba(before.backgroundColor), alpha = Number(before.opacity) * overlay[3];
    if (alpha > 0) base = blend(overlay, base, alpha);
    const fg = rgba(getComputedStyle(el).color);
    const lum = c => c.slice(0, 3).map(v => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }).reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
    const a = lum(fg), b = lum(base);
    return { ratio: Math.round((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) * 100) / 100, fg: getComputedStyle(el).color, bg: 'rgb(' + base.map(Math.round).join(',') + ')', fontSize: getComputedStyle(el).fontSize };
  });
}
module.exports = contrast;
