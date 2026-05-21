const nodemailer = require("nodemailer");
const dns = require("dns");

dns.setDefaultResultOrder?.("ipv4first");

const EMAIL_TRANSPORT_VERSION = "gmail-smtp-ipv4-v2";

let transporter;

function createTransporter() {
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASS?.trim();

  if (!user || !pass) {
    throw new Error("EMAIL_USER and EMAIL_PASS must be set in .env");
  }

  if (transporter) {
    return transporter;
  }

  const port = Number(process.env.EMAIL_PORT || 587);
  const secure = String(process.env.EMAIL_SECURE || "").toLowerCase() === "true" || port === 465;
  console.log(`[email:transport] ${EMAIL_TRANSPORT_VERSION}`, {
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port,
    secure,
    family: 4,
  });

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port,
    secure,
    requireTLS: !secure,
    family: 4,
    lookup: (hostname, options, callback) => {
      dns.lookup(hostname, { ...options, family: 4 }, callback);
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT_MS || 30000),
    greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT_MS || 30000),
    socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT_MS || 60000),
    auth: {
      user,
      pass,
    },
  });

  return transporter;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendTemporaryPasswordEmail({ to, name, password }) {
  const transporter = createTransporter();
  const senderEmail = process.env.EMAIL_USER?.trim();
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(to);
  const safePassword = escapeHtml(password);
  const subject = `[NETMIND] Welcome to NetMind!`;
  const text = [
    `[NETMIND] Welcome to NetMind!`,
    "",
    "Your account has been successfully created.",
    "",
    "LOGIN CREDENTIALS",
    "-----------------",
    `Email: ${to}`,
    `Temporary Password: ${password}`,
    "",
    "Please change your temporary password upon first login.",
    "",
    "Need help? support@netmind.com",
    "",
    "NetMind - Smart Volleyball Intelligence",
  ].join("\n");
  const html = `
    <!doctype html>
    <html>
      <body style="margin:0; padding:0; background:#f4f7fb; font-family:Arial, Helvetica, sans-serif; color:#172033;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb; padding:32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px; background:#ffffff; border:1px solid #dce5ef; border-radius:12px; overflow:hidden;">
                <tr>
                  <td style="background:#0ea5b7; padding:24px 32px;">
                    <div style="font-size:22px; line-height:1.2; font-weight:700; color:#ffffff;">NetMind</div>
                    <div style="margin-top:6px; font-size:14px; color:#e8fbff;">Smart Volleyball Intelligence</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <h1 style="margin:0 0 14px; font-size:24px; line-height:1.35; color:#101828;">Welcome to NetMind Volleyball Intelligent Management, ${safeName}</h1>
                    <p style="margin:0 0 24px; font-size:16px; line-height:1.6; color:#475467;">Your account has been successfully created. Use the temporary credentials below to sign in.</p>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #d7e0ea; border-radius:10px; background:#f8fafc;">
                      <tr>
                        <td style="padding:18px 20px; border-bottom:1px solid #d7e0ea;">
                          <div style="font-size:13px; letter-spacing:0.08em; text-transform:uppercase; font-weight:700; color:#0f766e;">Login Credentials</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:20px;">
                          <div style="margin-bottom:14px;">
                            <div style="font-size:13px; font-weight:700; color:#667085;">Email</div>
                            <div style="margin-top:4px; font-size:16px; color:#101828;">${safeEmail}</div>
                          </div>
                          <div>
                            <div style="font-size:13px; font-weight:700; color:#667085;">Temporary Password</div>
                            <div style="margin-top:6px; padding:12px 14px; border-radius:8px; background:#ffffff; border:1px solid #d7e0ea; font-family:Consolas, 'Courier New', monospace; font-size:16px; color:#101828;">${safePassword}</div>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:24px 0 0; padding:14px 16px; border-left:4px solid #f59e0b; background:#fffbeb; color:#7a4b00; font-size:14px; line-height:1.5;">Please change your temporary password upon first login.</p>
                    <p style="margin:24px 0 0; font-size:14px; line-height:1.6; color:#475467;">Need help? Contact <a href="mailto:support@netmind.com" style="color:#0ea5b7; font-weight:700; text-decoration:none;">support@netmind.com</a>.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 32px; border-top:1px solid #e4eaf1; background:#fbfdff; font-size:13px; color:#667085;">
                    NetMind - Smart Volleyball Intelligence
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`;

  await transporter.sendMail({
    from: `"NetMind" <${senderEmail}>`,
    to,
    subject,
    text,
    html,
  });
}

async function sendPasswordResetCodeEmail({ to, name, code }) {
  const transporter = createTransporter();
  const senderEmail = process.env.EMAIL_USER?.trim();
  const safeName = escapeHtml(name || "NetMind user");
  const safeCode = escapeHtml(code);

  await transporter.sendMail({
    from: `"NetMind" <${senderEmail}>`,
    to,
    subject: "[NETMIND] Password confirmation code",
    text: [
      "NetMind password confirmation",
      "",
      `Hello ${name || "NetMind user"},`,
      "",
      `Your confirmation code is ${code}.`,
      "This code expires in 10 minutes.",
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `
      <!doctype html>
      <html>
        <body style="margin:0; padding:0; background:#f4f7fb; font-family:Arial, Helvetica, sans-serif; color:#172033;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb; padding:32px 16px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px; background:#ffffff; border:1px solid #dce5ef; border-radius:12px; overflow:hidden;">
                  <tr>
                    <td style="background:#0ea5b7; padding:22px 28px;">
                      <div style="font-size:22px; line-height:1.2; font-weight:700; color:#ffffff;">NetMind</div>
                      <div style="margin-top:6px; font-size:14px; color:#e8fbff;">Password confirmation</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:30px 28px;">
                      <h1 style="margin:0 0 12px; font-size:22px; color:#101828;">Hello ${safeName}</h1>
                      <p style="margin:0 0 22px; font-size:15px; line-height:1.6; color:#475467;">Use this code to continue changing your NetMind password.</p>
                      <div style="padding:18px; border-radius:10px; background:#f0fbfd; border:1px solid #b9eef5; text-align:center; font-family:Consolas, 'Courier New', monospace; font-size:32px; letter-spacing:0.16em; font-weight:800; color:#0e7490;">${safeCode}</div>
                      <p style="margin:22px 0 0; font-size:14px; color:#667085;">This code expires in 10 minutes. Ignore this email if you did not request a password change.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>`,
  });
}

module.exports = {
  sendTemporaryPasswordEmail,
  sendPasswordResetCodeEmail,
};
