export interface RoleSummary {
  source: 'team' | 'schedule'
  team_name?: string
  role: string
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

interface InvitationEmailData {
  recipientName: string
  eventTitle: string
  eventDate: string
  eventTime: string
  eventLocation: string | null
  roles: RoleSummary[]
  confirmUrl: string
  declineUrl: string
}

export function buildInvitationEmailHtml(data: InvitationEmailData): string {
  const rolesHtml = data.roles
    .map((r) => {
      if (r.source === 'team') {
        return `<li><strong>${escapeHtml(r.team_name || '')}</strong> &mdash; ${escapeHtml(r.role)}</li>`
      }
      return `<li><strong>Program</strong> &mdash; ${escapeHtml(r.role)}</li>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937; background: #f9fafb;">
  <div style="text-align: center; padding: 24px 0;">
    <h1 style="font-size: 24px; color: #7c3aed; margin: 0;">SoluPlan</h1>
  </div>

  <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 32px;">
    <p style="font-size: 16px; margin: 0 0 8px;">Hi ${escapeHtml(data.recipientName)},</p>
    <p style="font-size: 16px; margin: 0 0 24px;">You've been invited to participate in:</p>

    <div style="background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <h2 style="font-size: 20px; margin: 0 0 12px; color: #1f2937;">${escapeHtml(data.eventTitle)}</h2>
      <p style="font-size: 14px; color: #4b5563; margin: 0 0 4px;">
        <strong>Date:</strong> ${escapeHtml(data.eventDate)}
      </p>
      <p style="font-size: 14px; color: #4b5563; margin: 0 0 4px;">
        <strong>Time:</strong> ${escapeHtml(data.eventTime)}
      </p>
      ${data.eventLocation ? `<p style="font-size: 14px; color: #4b5563; margin: 0;"><strong>Location:</strong> ${escapeHtml(data.eventLocation)}</p>` : ''}
    </div>

    <h3 style="font-size: 16px; margin: 0 0 12px; color: #374151;">Your Role(s):</h3>
    <ul style="padding-left: 20px; margin: 0 0 32px; color: #4b5563;">
      ${rolesHtml}
    </ul>

    <div style="text-align: center;">
      <a href="${escapeHtml(data.confirmUrl)}"
         style="display: inline-block; background: #16a34a; color: #ffffff; font-weight: 600;
                padding: 12px 32px; border-radius: 10px; text-decoration: none; font-size: 16px;
                margin-right: 12px;">
        Confirm
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
