import { Resend } from "resend";
import { createHash } from "node:crypto";
import type { Config } from "../../platform/config.js";
import { TOKEN_TTL_MINUTES } from "./auth.service.js";

export interface AuthMailer {
  sendVerification(to: string, token: string, expiryMinutes?: number): Promise<void>;
  sendPasswordReset(to: string, token: string, expiryMinutes?: number): Promise<void>;
}

export class ResendAuthMailer implements AuthMailer {
  private readonly resend: Resend;

  constructor(private readonly config: Config) {
    this.resend = new Resend(config.RESEND_API_KEY);
  }

  async sendVerification(to: string, token: string, expiryMinutes = TOKEN_TTL_MINUTES) {
    await this.send({
      to,
      subject: "Verify your Tunl account",
      path: "/verify-email",
      token,
      title: "Verify your email address",
      description: "Click the button below to verify your email address and activate your Tunl account.",
      actionLabel: "Verify Email",
      expiryMinutes,
    });
  }

  async sendPasswordReset(to: string, token: string, expiryMinutes = TOKEN_TTL_MINUTES) {
    await this.send({
      to,
      subject: "Reset your Tunl password",
      path: "/reset-password",
      token,
      title: "Reset your password",
      description: "We received a request to reset your password. Click the button below to choose a new password.",
      actionLabel: "Reset Password",
      expiryMinutes,
    });
  }

  private async send(opts: {
    to: string;
    subject: string;
    path: string;
    token: string;
    title: string;
    description: string;
    actionLabel: string;
    expiryMinutes: number;
  }) {
    const url = new URL(opts.path, this.config.DASHBOARD_URL);
    url.searchParams.set("token", opts.token);

    const html = buildEmailHtml({
      title: opts.title,
      description: opts.description,
      actionUrl: url.toString(),
      actionLabel: opts.actionLabel,
      expiryMinutes: opts.expiryMinutes,
    });

    const text = `${opts.title}\n\n${opts.description}\n\n${opts.actionLabel}: ${url.toString()}\n\nThis link will expire in ${opts.expiryMinutes} minutes. If you did not request this, please ignore this email.`;

    const { error } = await this.resend.emails.send({
      from: this.config.EMAIL_FROM,
      to: [opts.to],
      subject: opts.subject,
      text,
      html,
      headers: {
        "Idempotency-Key": `tunl-${opts.actionLabel.toLowerCase().replaceAll(" ", "-")}-${createHash("sha256").update(opts.token).digest("hex")}`,
      },
    });

    if (error) throw new Error(`Resend send failed: ${error.message}`);
  }
}

function buildEmailHtml(opts: {
  title: string;
  description: string;
  actionUrl: string;
  actionLabel: string;
  expiryMinutes: number;
}): string {
  const { title, description, actionUrl, actionLabel, expiryMinutes } = opts;
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fafafa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 460px; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; padding: 36px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);">
          <tr>
            <td style="padding-bottom: 24px;">
              <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 20px; font-weight: 700; tracking: -0.05em; color: #09090b;">tunl</span>
            </td>
          </tr>
          <tr>
            <td style="font-size: 20px; font-weight: 600; color: #09090b; padding-bottom: 12px; letter-spacing: -0.02em;">
              ${title}
            </td>
          </tr>
          <tr>
            <td style="font-size: 14px; line-height: 1.6; color: #52525b; padding-bottom: 28px;">
              ${description}
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 28px;">
              <a href="${actionUrl}" target="_blank" style="display: inline-block; background-color: #09090b; color: #ffffff; font-size: 14px; font-weight: 500; text-decoration: none; padding: 10px 20px; border-radius: 6px; border: 1px solid #09090b;">
                ${actionLabel}
              </a>
            </td>
          </tr>
          <tr>
            <td style="font-size: 13px; line-height: 1.5; color: #71717a; border-top: 1px solid #f4f4f5; padding-top: 20px;">
              This link will expire in <strong style="color: #09090b;">${expiryMinutes} minutes</strong>. If you did not request this email, no action is required and you can safely ignore it.
            </td>
          </tr>
        </table>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 460px; padding-top: 24px;">
          <tr>
            <td align="center" style="font-size: 12px; color: #a1a1aa;">
              &copy; ${year} tunl. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
