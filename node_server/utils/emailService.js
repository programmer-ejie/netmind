const nodemailer = require("nodemailer");
const dns = require("dns");
const { google } = require("googleapis");
const { getGoogleRedirectUri } = require("./googleOAuthConfig");

dns.setDefaultResultOrder?.("ipv4first");

const EMAIL_TRANSPORT_VERSION = "gmail-smtp-ipv4-v3";
const DEFAULT_EMAIL_HOST = "smtp.gmail.com";
const BREVO_EMAIL_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

let transporter;
let transporterPromise;
let transporterKey;

async function createTransporter(config) {
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASS?.trim();

  if (!user || !pass) {
    throw new Error("EMAIL_USER and EMAIL_PASS must be set in .env");
  }

  const key = getTransportKey(config);

  if (transporter && transporterKey === key) {
    return transporter;
  }

  if (transporterPromise && transporterKey === key) {
    return transporterPromise;
  }

  closeTransporter();
  transporterKey = key;
  transporterPromise = createTransporterInternal(user, pass, config)
    .catch((error) => {
      resetTransporter(key);
      throw error;
    });

  return transporterPromise;
}

function getSenderEmail() {
  return process.env.EMAIL_USER?.trim();
}

function getFromAddress() {
  return process.env.EMAIL_FROM?.trim() || `"NetMind" <${getSenderEmail()}>`;
}

async function sendEmail({ to, subject, text, html }) {
  const provider = getEmailProvider();
  const candidates = getTransportCandidates();
  const attempts = [];
  let lastError;

  if (canUseBrevo() && provider !== "smtp" && provider !== "gmail") {
    try {
      return await sendViaBrevo({ to, subject, text, html });
    } catch (error) {
      lastError = error;
      lastError.brevoApi = {
        message: error?.message,
        status: error?.status,
        response: error?.response,
      };

      if (provider === "brevo") {
        throw lastError;
      }

      console.warn("[email:brevo:fallback]", {
        reason: error?.message,
        status: error?.status,
      });
    }
  }

  if (provider === "brevo") {
    throw new Error("BREVO_API_KEY must be set when EMAIL_PROVIDER=brevo.");
  }

  if (hasSmtpConfig() && process.env.EMAIL_SMTP_DISABLED !== "true" && provider !== "brevo" && provider !== "gmail") {
    for (const [index, config] of candidates.entries()) {
      const key = getTransportKey(config);

      try {
        const transporter = await createTransporter(config);
        return await transporter.sendMail({
          from: getFromAddress(),
          to,
          subject,
          text,
          html,
        });
      } catch (error) {
        lastError = error;
        attempts.push({
          host: config.host,
          port: config.port,
          secure: config.secure,
          code: error?.code,
          command: error?.command,
          message: error?.message,
        });
        resetTransporter(key);

        if (!shouldTryNextTransport(error) || index === candidates.length - 1) {
          break;
        }

        console.warn("[email:transport:fallback]", {
          from: `${config.host}:${config.port}`,
          to: `${candidates[index + 1].host}:${candidates[index + 1].port}`,
          reason: error?.message,
          code: error?.code,
        });
      }
    }
  }

  if (lastError) {
    lastError.smtpAttempts = attempts;
  }

  if (canUseGmailApiFallback() && provider !== "smtp") {
    try {
      console.warn("[email:gmail-api:fallback]", {
        reason: lastError?.message || "SMTP is not configured",
      });
      return await sendViaGmailApi({ to, subject, text, html });
    } catch (gmailError) {
      if (!lastError) {
        throw gmailError;
      }

      lastError.gmailApi = {
        message: gmailError?.message,
        code: gmailError?.code,
        status: gmailError?.status,
      };
    }
  }

  if (lastError) {
    lastError.smtpAttempts = attempts;
    throw lastError;
  }

  throw new Error(
    "Email sender is not configured. Set BREVO_API_KEY, EMAIL_USER/EMAIL_PASS for SMTP, or Google OAuth values for Gmail API."
  );
}

async function createTransporterInternal(user, pass, config) {
  const { host: smtpHost, port, secure } = config;
  const forceIpv4 = process.env.EMAIL_FORCE_IPV4 !== "false";
  const resolvedHost = forceIpv4
    ? await resolveIpv4Host(smtpHost)
    : smtpHost;

  console.log(`[email:transport] ${EMAIL_TRANSPORT_VERSION}`, {
    host: smtpHost,
    resolvedHost,
    port,
    secure,
    family: 4,
  });

  transporter = nodemailer.createTransport({
    host: resolvedHost,
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
    tls: {
      servername: smtpHost,
    },
    auth: {
      user,
      pass,
    },
  });

  return transporter;
}

function getTransportCandidates() {
  const host = process.env.EMAIL_HOST?.trim() || DEFAULT_EMAIL_HOST;
  const configuredPort = process.env.EMAIL_PORT?.trim()
    ? Number(process.env.EMAIL_PORT.trim())
    : undefined;
  const configuredSecure = process.env.EMAIL_SECURE?.trim()
    ? process.env.EMAIL_SECURE.trim().toLowerCase() === "true"
    : undefined;

  if (configuredPort) {
    return [
      {
        host,
        port: configuredPort,
        secure: configuredSecure ?? configuredPort === 465,
      },
    ];
  }

  if (host.toLowerCase() === DEFAULT_EMAIL_HOST) {
    return [
      { host, port: 465, secure: true },
      { host, port: 587, secure: false },
    ];
  }

  return [
    {
      host,
      port: 465,
      secure: configuredSecure ?? true,
    },
  ];
}

function hasSmtpConfig() {
  return Boolean(process.env.EMAIL_USER?.trim() && process.env.EMAIL_PASS?.trim());
}

function getEmailProvider() {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();

  if (["auto", "brevo", "smtp", "gmail"].includes(provider)) {
    return provider;
  }

  return "auto";
}

function canUseBrevo() {
  return Boolean(process.env.BREVO_API_KEY?.trim());
}

async function sendViaBrevo({ to, subject, text, html }) {
  if (typeof fetch !== "function") {
    throw new Error("Brevo email requires Node.js fetch support. Use Node.js 18 or newer.");
  }

  const sender = getBrevoSender();
  const response = await fetch(BREVO_EMAIL_ENDPOINT, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": process.env.BREVO_API_KEY.trim(),
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  const bodyText = await response.text();
  const body = parseJson(bodyText) || bodyText;

  if (!response.ok) {
    const error = new Error(
      typeof body === "object" && body?.message
        ? body.message
        : `Brevo email request failed with status ${response.status}`
    );
    error.status = response.status;
    error.response = body;
    throw error;
  }

  console.log("[email:brevo:sent]", {
    to,
    messageId: typeof body === "object" ? body?.messageId : undefined,
  });

  return body;
}

function getBrevoSender() {
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim()
    || parseEmailAddress(process.env.EMAIL_FROM)?.email
    || getSenderEmail();

  if (!senderEmail) {
    throw new Error("BREVO_SENDER_EMAIL, EMAIL_FROM, or EMAIL_USER must be set for Brevo email.");
  }

  return {
    email: senderEmail,
    name: process.env.BREVO_SENDER_NAME?.trim()
      || parseEmailAddress(process.env.EMAIL_FROM)?.name
      || "NetMind",
  };
}

function parseEmailAddress(value) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  const match = trimmed.match(/^(.*?)<([^<>]+)>$/);

  if (match) {
    return {
      name: match[1].trim().replace(/^"|"$/g, ""),
      email: match[2].trim(),
    };
  }

  return { email: trimmed };
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function canUseGmailApiFallback() {
  if (process.env.EMAIL_GMAIL_API_FALLBACK === "false") {
    return false;
  }

  return Boolean(
    getSenderEmail()
    && process.env.GOOGLE_CLIENT_ID?.trim()
    && process.env.GOOGLE_CLIENT_SECRET?.trim()
    && getGoogleEmailRefreshToken()
  );
}

function getGoogleEmailRefreshToken() {
  return process.env.GOOGLE_EMAIL_REFRESH_TOKEN?.trim()
    || process.env.GOOGLE_REFRESH_TOKEN?.trim();
}

async function sendViaGmailApi({ to, subject, text, html }) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID.trim(),
    process.env.GOOGLE_CLIENT_SECRET.trim(),
    getGoogleRedirectUri()
  );

  oauth2Client.setCredentials({
    refresh_token: getGoogleEmailRefreshToken(),
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const raw = buildGmailRawMessage({
    from: getFromAddress(),
    to,
    subject,
    text,
    html,
  });

  return gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
}

function buildGmailRawMessage({ from, to, subject, text, html }) {
  const boundary = `netmind_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const lines = [
    `From: ${sanitizeHeaderValue(from)}`,
    `To: ${sanitizeHeaderValue(to)}`,
    `Subject: ${encodeMimeHeader(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    text || "",
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    html || "",
    "",
    `--${boundary}--`,
  ];

  return Buffer.from(lines.join("\r\n"), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function sanitizeHeaderValue(value) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim();
}

function encodeMimeHeader(value) {
  const sanitized = sanitizeHeaderValue(value);

  if (/^[\x20-\x7E]*$/.test(sanitized)) {
    return sanitized;
  }

  return `=?UTF-8?B?${Buffer.from(sanitized, "utf8").toString("base64")}?=`;
}

async function resolveIpv4Host(host) {
  try {
    return (await dns.promises.resolve4(host))[0];
  } catch (error) {
    console.warn("[email:dns:fallback]", {
      host,
      code: error?.code,
      message: error?.message,
    });

    return host;
  }
}

function getTransportKey(config) {
  return `${config.host}:${config.port}:${config.secure}`;
}

function shouldTryNextTransport(error) {
  return error?.code === "ETIMEDOUT" || error?.command === "CONN";
}

function closeTransporter() {
  if (transporter?.close) {
    transporter.close();
  }
}

function resetTransporter(key) {
  if (!key || transporterKey === key) {
    closeTransporter();
    transporter = undefined;
    transporterPromise = undefined;
    transporterKey = undefined;
  }
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

  await sendEmail({
    to,
    subject,
    text,
    html,
  });
}

async function sendPasswordResetCodeEmail({ to, name, code }) {
  const safeName = escapeHtml(name || "NetMind user");
  const safeCode = escapeHtml(code);

  await sendEmail({
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
