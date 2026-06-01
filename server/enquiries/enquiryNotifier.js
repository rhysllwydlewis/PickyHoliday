export async function notifyEnquiry(record, env = process.env) {
  const notifyEmail = env.ENQUIRY_NOTIFY_EMAIL;
  const hasResendKey = Boolean(env.RESEND_API_KEY);

  if (!notifyEmail || !hasResendKey) {
    return {
      ok: true,
      mode: 'noop',
      message: 'Notification skipped. ENQUIRY_NOTIFY_EMAIL and RESEND_API_KEY are not configured.',
    };
  }

  // Future PR: connect a real email provider here once sender/domain details are confirmed.
  console.info('[enquiry-notifier]', {
    enquiryId: record.id,
    destination: record.destination,
    notifyEmail,
    mode: 'scaffold-only',
  });

  return {
    ok: true,
    mode: 'scaffold-only',
    message: 'Notification scaffold reached. No email provider has been connected in this PR.',
  };
}
