const nodemailer = require("nodemailer");

let transporter;

function createTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error("EMAIL_USER and EMAIL_PASS must be set in .env");
  }

  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
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
    from: `"NetMind" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
}

module.exports = {
  sendTemporaryPasswordEmail,
};
