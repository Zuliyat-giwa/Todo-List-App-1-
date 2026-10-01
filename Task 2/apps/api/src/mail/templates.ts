import { config } from '../common/config';
import { ngn } from '../common/util';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function layout(title: string, bodyHtml: string, cta?: { label: string; href: string }) {
  return `<!doctype html><html><body style="margin:0;background:#f6f1ec;font-family:Helvetica,Arial,sans-serif;color:#1f1a17">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="padding:24px 32px;border-bottom:1px solid #eee4dc"><span style="font-family:Georgia,serif;font-size:26px;font-weight:bold">Modeza<span style="color:#d9591b">.</span></span></td></tr>
<tr><td style="padding:32px">
<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 16px">${esc(title)}</h1>
${bodyHtml}
${cta ? `<p style="margin:28px 0 0"><a href="${esc(cta.href)}" style="background:#1f1a17;color:#fff;text-decoration:none;padding:13px 26px;border-radius:999px;font-size:14px;display:inline-block">${esc(cta.label)}</a></p>` : ''}
</td></tr>
<tr><td style="padding:20px 32px;background:#faf6f2;font-size:12px;color:#7a6f67">Modeza - Modest fashion &amp; Islamic lifestyle. If you did not expect this email you can safely ignore it.</td></tr>
</table></td></tr></table></body></html>`;
}

const p = (s: string) => `<p style="font-size:15px;line-height:1.6;margin:0 0 12px">${s}</p>`;

export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  email: string;
  items: { productName: string; size?: string | null; color?: string | null; quantity: number; unitMinor: number }[];
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
  trackingNumber?: string | null;
  carrier?: string | null;
}

function orderTable(o: OrderEmailData) {
  const rows = o.items
    .map(
      (i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #f0e8e1;font-size:14px">${esc(i.productName)}
<div style="color:#7a6f67;font-size:12px">${[i.size, i.color].filter(Boolean).map(esc).join(' / ')} x ${i.quantity}</div></td>
<td align="right" style="padding:8px 0;border-bottom:1px solid #f0e8e1;font-size:14px">${ngn(i.unitMinor * i.quantity)}</td></tr>`,
    )
    .join('');
  const line = (l: string, v: string, bold = false) =>
    `<tr><td style="padding:4px 0;font-size:14px;${bold ? 'font-weight:bold' : 'color:#7a6f67'}">${l}</td><td align="right" style="padding:4px 0;font-size:14px;${bold ? 'font-weight:bold' : ''}">${v}</td></tr>`;
  return `<table width="100%" cellpadding="0" cellspacing="0">${rows}
${line('Subtotal', ngn(o.subtotalMinor))}
${o.discountMinor ? line('Discount', '-' + ngn(o.discountMinor)) : ''}
${line('Shipping', ngn(o.shippingMinor))}
${o.taxMinor ? line('Tax', ngn(o.taxMinor)) : ''}
${line('Total', ngn(o.totalMinor), true)}</table>`;
}

const orderUrl = (o: OrderEmailData) =>
  `${config.webUrl}/order/${encodeURIComponent(o.orderNumber)}?email=${encodeURIComponent(o.email)}`;

export const templates = {
  welcome: (name: string) => ({
    subject: 'Welcome to Modeza',
    html: layout(`Welcome, ${name}`, p('Your account is ready. Discover timeless modest fashion, fragrances, books and more.'), {
      label: 'Start shopping',
      href: config.webUrl,
    }),
  }),
  verifyEmail: (name: string, link: string) => ({
    subject: 'Verify your email address',
    html: layout('Verify your email', p(`Hi ${esc(name)}, please confirm your email address to secure your account. This link expires in 24 hours.`), {
      label: 'Verify email',
      href: link,
    }),
  }),
  passwordReset: (name: string, link: string) => ({
    subject: 'Reset your password',
    html: layout('Reset your password', p(`Hi ${esc(name)}, we received a request to reset your password. This link expires in 1 hour. If this was not you, ignore this email.`), {
      label: 'Choose a new password',
      href: link,
    }),
  }),
  orderConfirmation: (o: OrderEmailData) => ({
    subject: `Order ${o.orderNumber} confirmed`,
    html: layout(`Thank you, ${o.customerName}`, p(`We received your order <strong>${esc(o.orderNumber)}</strong>.`) + orderTable(o), {
      label: 'Track your order',
      href: orderUrl(o),
    }),
  }),
  paymentConfirmation: (o: OrderEmailData) => ({
    subject: `Payment received for ${o.orderNumber}`,
    html: layout('Payment received', p(`Your payment of <strong>${ngn(o.totalMinor)}</strong> for order ${esc(o.orderNumber)} was successful.`), {
      label: 'View order',
      href: orderUrl(o),
    }),
  }),
  orderProcessing: (o: OrderEmailData) => ({
    subject: `We are preparing order ${o.orderNumber}`,
    html: layout('Your order is being prepared', p(`Order ${esc(o.orderNumber)} is now being packed with care.`), { label: 'View order', href: orderUrl(o) }),
  }),
  shipped: (o: OrderEmailData) => ({
    subject: `Order ${o.orderNumber} has shipped`,
    html: layout(
      'Your order is on its way',
      p(`Order ${esc(o.orderNumber)} has shipped.`) +
        (o.trackingNumber ? p(`Carrier: ${esc(o.carrier || 'Courier')}<br>Tracking number: <strong>${esc(o.trackingNumber)}</strong>`) : ''),
      { label: 'Track order', href: orderUrl(o) },
    ),
  }),
  delivered: (o: OrderEmailData) => ({
    subject: `Order ${o.orderNumber} delivered`,
    html: layout('Delivered', p(`Order ${esc(o.orderNumber)} has been delivered. We hope you love it - a review helps others shop with confidence.`), {
      label: 'View order',
      href: orderUrl(o),
    }),
  }),
  cancelled: (o: OrderEmailData) => ({
    subject: `Order ${o.orderNumber} cancelled`,
    html: layout('Order cancelled', p(`Order ${esc(o.orderNumber)} has been cancelled. If you paid, any refund will be confirmed in a separate email.`)),
  }),
  refunded: (o: OrderEmailData) => ({
    subject: `Refund issued for ${o.orderNumber}`,
    html: layout('Refund issued', p(`A refund of <strong>${ngn(o.totalMinor)}</strong> for order ${esc(o.orderNumber)} has been issued to your original payment method. It may take several business days to appear.`)),
  }),
  newsletter: () => ({
    subject: 'You are subscribed to Modeza updates',
    html: layout('You are subscribed', p('Thanks for joining. You will be the first to hear about new arrivals, Ramadan and Eid collections and exclusive offers.')),
  }),
};
