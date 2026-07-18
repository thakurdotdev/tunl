import { Resend } from "resend";
import { createHash } from "node:crypto";
import type { Config } from "../../platform/config.js";

export interface AuthMailer {
  sendVerification(to: string, token: string): Promise<void>;
  sendPasswordReset(to: string, token: string): Promise<void>;
}

export class ResendAuthMailer implements AuthMailer {
  private readonly resend: Resend;
  constructor(private readonly config: Config) {
    this.resend = new Resend(config.RESEND_API_KEY);
  }
  async sendVerification(to: string, token: string) {
    await this.send(to, "Verify your Tunl email", "/verify-email", token, "Verify email");
  }
  async sendPasswordReset(to: string, token: string) {
    await this.send(to, "Reset your Tunl password", "/reset-password", token, "Reset password");
  }
  private async send(to: string, subject: string, path: string, token: string, label: string) {
    const url = new URL(path, this.config.DASHBOARD_URL);
    url.searchParams.set("token", token);
    const { error } = await this.resend.emails.send({
      from: this.config.EMAIL_FROM,
      to: [to],
      subject,
      text: `${label}: ${url.toString()}`,
      html: `<p>Use the link below to ${label.toLowerCase()}.</p><p><a href="${url.toString()}">${label}</a></p><p>This link expires in 24 hours.</p>`,
      headers: {
        "Idempotency-Key": `tunl-${label.toLowerCase().replaceAll(" ", "-")}-${createHash("sha256").update(token).digest("hex")}`,
      },
    });
    if (error) throw new Error(`Resend send failed: ${error.message}`);
  }
}
