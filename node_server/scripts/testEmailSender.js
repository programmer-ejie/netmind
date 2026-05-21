require("dotenv").config({ quiet: true });
const { sendPasswordResetCodeEmail } = require("../utils/emailService");

async function main() {
  const to = process.env.EMAIL_TEST_TO || process.env.EMAIL_USER;

  if (!to) {
    console.error("Missing EMAIL_TEST_TO or EMAIL_USER.");
    process.exit(1);
  }

  const startedAt = Date.now();
  await sendPasswordResetCodeEmail({
    to,
    name: "NetMind Email Test",
    code: "123456",
  });

  console.log(`Email test sent to ${to} in ${Date.now() - startedAt}ms.`);
}

main().catch((error) => {
  console.error("Email test failed.");
  console.error(`Message: ${error.message}`);
  if (error.code) console.error(`Code: ${error.code}`);
  if (error.command) console.error(`Command: ${error.command}`);
  if (error.responseCode) console.error(`Response code: ${error.responseCode}`);
  if (error.smtpAttempts) console.error(`SMTP attempts: ${JSON.stringify(error.smtpAttempts)}`);
  if (error.gmailApi) console.error(`Gmail API: ${JSON.stringify(error.gmailApi)}`);
  process.exit(1);
});
