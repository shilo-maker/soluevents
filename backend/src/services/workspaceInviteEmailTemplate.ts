function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

interface WorkspaceInviteEmailData {
  recipientName: string
  workspaceName: string
  role: string
  inviterName: string
  acceptUrl: string
  declineUrl: string
}

export function buildWorkspaceInviteEmailHtml(data: WorkspaceInviteEmailData): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937; background: #f9fafb;">
  <div style="text-align: center; padding: 24px 0;">
    <h1 style="font-size: 24px; color: #7c3aed; margin: 0;">SoluPlan</h1>
  </div>

  <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 32px;">
    <p style="font-size: 16px; margin: 0 0 8px;">Hi ${escapeHtml(data.recipientName)},</p>
    <p style="font-size: 16px; margin: 0 0 24px;">${escapeHtml(data.inviterName)} has invited you to join a workspace:</p>

    <div style="background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <h2 style="font-size: 20px; margin: 0 0 12px; color: #1f2937;">${escapeHtml(data.workspaceName)}</h2>
      <p style="font-size: 14px; color: #4b5563; margin: 0;">
        <strong>Role:</strong> ${escapeHtml(data.role)}
      </p>
    </div>

    <div style="text-align: center;">
      <a href="${escapeHtml(data.acceptUrl)}"
         style="display: inline-block; background: #16a34a; color: #ffffff; font-weight: 600;
                padding: 12px 32px; border-radius: 10px; text-decoration: none; font-size: 16px;
                margin-right: 12px;">
        Accept
      </a>
      <a href="${escapeHtml(data.declineUrl)}"
         style="display: inline-block; background: #dc2626; color: #ffffff; font-weight: 600;
                padding: 12px 32px; border-radius: 10px; text-decoration: none; font-size: 16px;">
        Decline
      </a>
    </div>
  </div>

  <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 24px;">
    This invitation was sent via SoluPlan. If you received this in error, you can safely ignore it.
  </p>
</body>
</html>`
}
