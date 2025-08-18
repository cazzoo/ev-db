export const sendContributionRejectionEmail = async (
  toEmail: string,
  vehicleData: { make?: string; model?: string; year?: number },
  rejectionComment: string
): Promise<void> => {
  // Minimal dev stub: in production, integrate with a real email provider (e.g., Resend, SendGrid, SES)
  const subject = `Your vehicle contribution was rejected`;
  const title = `${vehicleData?.year ?? ''} ${vehicleData?.make ?? ''} ${vehicleData?.model ?? ''}`.trim();
  const body = `Hello,\n\nYour contribution for ${title || 'a vehicle'} was reviewed and rejected by our moderators.\n\nReason:\n${rejectionComment}\n\nYou can review the feedback and resubmit after making changes.\n\nRegards,\nEV DB Team`;

  // Log to console as a placeholder
  console.log(`[EMAIL:DEV] To: ${toEmail}\nSubject: ${subject}\n${body}`);
};

