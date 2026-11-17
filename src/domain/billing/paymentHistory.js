const statuses = { paid: 'Pagado', partially_refunded: 'Devolución parcial', refunded: 'Devuelto', reversed: 'Revertido' };
const decimal = value => typeof value === 'string' && /^\d+(?:\.\d{1,2})?$/.test(value) && Number.isFinite(Number(value));
const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const text = value => typeof value === 'string' && Boolean(value.trim());

export function paymentStatusLabel(status) { return statuses[status] || 'Estado por confirmar'; }

export function paymentHistoryPage(page, organizationId) {
  if (!organizationId || !page || !Array.isArray(page.items) || page.items.length > 25
    || !(page.nextCursor === null || typeof page.nextCursor === 'string' && page.nextCursor.length <= 2048 && /^[A-Za-z0-9_-]+$/.test(page.nextCursor))) return null;
  if (!page.items.every(item => item && item.organizationId === organizationId && item.productCode === 'medsync' && item.provider === 'paypal'
    && text(item.id) && text(item.subscriptionId) && Object.prototype.hasOwnProperty.call(statuses, item.status)
    && decimal(item.amount) && Number(item.amount) > 0 && /^[A-Z]{3}$/.test(item.currency)
    && (item.paidAt === null || date(item.paidAt)) && date(item.createdAt)
    && (item.reference === null || text(item.reference)) && (item.description === undefined || typeof item.description === 'string')
    && (item.refundedAmount === undefined || decimal(item.refundedAmount)))) return null;
  return { items: page.items, nextCursor: page.nextCursor };
}
