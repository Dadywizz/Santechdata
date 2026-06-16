import nodemailer from "nodemailer";
import { logger } from "./logger";

function createTransport() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: (process.env.SMTP_PORT ?? "465") === "465",
    auth: { user, pass },
  });
}

const FROM = () => process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@santechdata.ng";

export async function sendOtpEmail(to: string, otp: string, type: "verify" | "reset") {
  const transport = createTransport();
  if (!transport) {
    logger.warn({ to, otp }, `SMTP not configured — OTP for ${type} (dev log only)`);
    return;
  }

  const subject = type === "verify"
    ? "Verify your SanTech Data account"
    : "Reset your SanTech Data password";

  const action = type === "verify"
    ? "verify your email address"
    : "reset your password";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:12px;border:1px solid #e5e7eb">
      <div style="text-align:center;margin-bottom:28px">
        <span style="font-size:26px;font-weight:700;color:#f97316">SanTech Data</span>
      </div>
      <p style="font-size:15px;color:#374151;margin-bottom:8px">Hello,</p>
      <p style="font-size:15px;color:#374151;margin-bottom:24px">
        Use the code below to ${action}. It expires in <strong>30 minutes</strong>.
      </p>
      <div style="text-align:center;margin:28px 0">
        <span style="display:inline-block;background:#fff7ed;border:2px solid #f97316;border-radius:10px;padding:14px 36px;font-size:36px;font-weight:700;letter-spacing:10px;color:#ea580c;font-family:monospace">
          ${otp}
        </span>
      </div>
      <p style="font-size:13px;color:#6b7280;margin-top:24px">
        If you didn't request this, ignore this email — your account is safe.
      </p>
      <hr style="border:none;border-top:1px solid #f3f4f6;margin:28px 0"/>
      <p style="font-size:12px;color:#9ca3af;text-align:center">SanTech Data · Fast, modern VTU services</p>
    </div>
  `;

  try {
    await transport.sendMail({
      from: `"SanTech Data" <${FROM()}>`,
      to,
      subject,
      html,
      text: `Your SanTech Data OTP: ${otp}. Expires in 30 minutes.`,
    });
    logger.info({ to, type }, "OTP email sent");
  } catch (err) {
    logger.error({ err, to, type }, "Failed to send OTP email");
  }
}
