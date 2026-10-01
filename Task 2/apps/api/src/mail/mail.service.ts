import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderEmailData, templates } from './templates';

type Rendered = { subject: string; html: string };

/**
 * Sends transactional email through the Mailgun HTTP API and records every
 * attempt in EmailLog. Sending never throws into the caller: a mail outage must
 * not fail a checkout. When Mailgun is not configured (local dev) the message
 * is logged as "skipped".
 */
@Injectable()
export class MailService {
  private logger = new Logger('Mail');
  constructor(private prisma: PrismaService) {}

  async send(to: string, template: string, msg: Rendered) {
    const key = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;
    const from = process.env.MAIL_FROM || (domain ? `Modeza <no-reply@${domain}>` : 'Modeza <no-reply@localhost>');
    let status = 'sent';
    let error: string | undefined;
    let messageId: string | undefined;

    if (!key || !domain) {
      status = 'skipped';
      error = 'Mailgun not configured';
      this.logger.warn(`[skipped] ${template} -> ${to}`);
    } else {
      try {
        const base = (process.env.MAILGUN_API_BASE || 'https://api.mailgun.net').replace(/\/$/, '');
        const form = new URLSearchParams({ from, to, subject: msg.subject, html: msg.html });
        const res = await fetch(`${base}/v3/${domain}/messages`, {
          method: 'POST',
          headers: {
            Authorization: 'Basic ' + Buffer.from(`api:${key}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: form,
          signal: AbortSignal.timeout(10_000),
        });
        const json: any = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(`Mailgun ${res.status}: ${json.message || 'request failed'}`);
        messageId = json.id;
      } catch (e: any) {
        status = 'failed';
        error = String(e?.message || e).slice(0, 500);
        this.logger.error(`Failed ${template} -> ${to}: ${error}`);
      }
    }
    try {
      await this.prisma.emailLog.create({ data: { to, template, subject: msg.subject, status, error, messageId } });
    } catch (e) {
      this.logger.error('Could not write EmailLog', e as any);
    }
    return status;
  }

  welcome = (to: string, name: string) => this.send(to, 'welcome', templates.welcome(name));
  verifyEmail = (to: string, name: string, link: string) => this.send(to, 'verify-email', templates.verifyEmail(name, link));
  passwordReset = (to: string, name: string, link: string) => this.send(to, 'password-reset', templates.passwordReset(name, link));
  newsletter = (to: string) => this.send(to, 'newsletter', templates.newsletter());

  order(kind: keyof typeof orderTemplates, data: OrderEmailData) {
    return this.send(data.email, `order-${kind}`, orderTemplates[kind](data));
  }
}

const orderTemplates = {
  confirmation: templates.orderConfirmation,
  payment: templates.paymentConfirmation,
  processing: templates.orderProcessing,
  shipped: templates.shipped,
  delivered: templates.delivered,
  cancelled: templates.cancelled,
  refunded: templates.refunded,
};
