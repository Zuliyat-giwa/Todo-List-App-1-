import { templates } from './templates';

const order = {
  orderNumber: 'MZ-1', customerName: '<script>x</script>', email: 'a@b.co', subtotalMinor: 1000000, discountMinor: 0, shippingMinor: 350000, taxMinor: 0, totalMinor: 1350000,
  items: [{ productName: 'Abaya <b>', quantity: 1, unitMinor: 1000000, size: 'M', color: 'Black' }],
};

describe('email templates', () => {
  it('escapes user-controlled values', () => {
    const html = templates.orderConfirmation({ ...order, customerName: 'Eve <script>alert(1)</script>' }).html;
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
  it('includes the order number, items and tracking link', () => {
    const m = templates.orderConfirmation(order);
    expect(m.subject).toContain('MZ-1');
    expect(m.html).toContain('/order/MZ-1');
    expect(m.html).toContain('Abaya');
  });
  it('shows tracking details when shipped', () => {
    expect(templates.shipped({ ...order, trackingNumber: 'DHL1', carrier: 'DHL' }).html).toContain('DHL1');
  });
  it('renders every transactional template with a subject', () => {
    const all = [templates.welcome('A'), templates.verifyEmail('A', 'http://x'), templates.passwordReset('A', 'http://x'), templates.orderConfirmation(order), templates.paymentConfirmation(order),
      templates.orderProcessing(order), templates.shipped(order), templates.delivered(order), templates.cancelled(order), templates.refunded(order), templates.newsletter()];
    for (const m of all) { expect(m.subject.length).toBeGreaterThan(3); expect(m.html).toContain('Modeza'); }
  });
});
