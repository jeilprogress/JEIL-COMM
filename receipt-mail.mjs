import { randomUUID } from 'node:crypto';

const sender = 'jlmigorii@gmail.com';
const tracker = 'https://jeilprogress.github.io/JEIL-COMM/';

export function receiptMessage(email, code) {
  const link = tracker + '?code=' + encodeURIComponent(code);
  const message = 'I’ve personally received your social media AU commission. Keep this code to check its progress.';
  const plain = ['Commission received', message, 'Tracking code: ' + code, link, 'Thanks,\nJeil'].join('\r\n\r\n');
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#ededed;color:#111;font:16px Arial,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="16" style="background:#ededed"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #111;text-align:left">
<tr><td style="background:#111;color:#fff;padding:20px 28px;font-size:12px;font-weight:bold;letter-spacing:3px">JEIL COMM. / COMMISSION STUDIO</td></tr>
<tr><td style="padding:32px 28px">
<p style="margin:0;font-size:11px;font-weight:bold;letter-spacing:2px">COMMISSION RECEIPT</p>
<h1 style="margin:12px 0;font:italic 42px Georgia,serif">Commission received.</h1>
<p style="margin:0 0 26px;line-height:1.6">${message}</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="18" style="background:#f5f5f5;border:1px dashed #111"><tr><td>
<div style="font-size:11px;font-weight:bold;letter-spacing:2px">YOUR TRACKING CODE</div>
<div style="margin-top:8px;font:bold 30px Courier New,monospace">${code}</div>
</td></tr></table>
<p style="margin:24px 0 12px"><a href="${link}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 20px;font-weight:bold">Open tracker &rarr;</a></p>
<p style="font-size:13px;line-height:1.5;color:#444">Your code is filled in on the tracker. Tap Copy code to save it.</p>
<p style="margin:25px 0 0;font:italic 20px Georgia,serif">Thanks,<br>Jeil</p>
</td></tr><tr><td style="padding:17px 28px;border-top:1px solid #111;font-size:12px;color:#444">Questions about your commission? Just reply to this email.</td></tr>
</table></td></tr></table></body></html>`;
  const boundary = 'receipt-' + randomUUID();
  const part = (type, content) => [
    '--' + boundary, 'Content-Type: ' + type + '; charset=UTF-8',
    'Content-Transfer-Encoding: base64', '',
    Buffer.from(content).toString('base64').match(/.{1,76}/g).join('\r\n')
  ];
  return Buffer.from([
    'From: Jeil Comm. <' + sender + '>', 'To: ' + email, 'Subject: Commission received | ' + code,
    'MIME-Version: 1.0', 'Content-Type: multipart/alternative; boundary="' + boundary + '"', '',
    ...part('text/plain', plain), ...part('text/html', html), '--' + boundary + '--', ''
  ].join('\r\n')).toString('base64url');
}

export const receiptConfigured = () => Boolean(
  process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN
);

export async function sendReceipt(email, code) {
  const token = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    }),
    signal: AbortSignal.timeout(10000)
  }).catch(() => null);
  if (!token?.ok) throw new Error('Gmail authorization failed. Check the sender configuration in Render.');
  const { access_token } = await token.json();
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/' + sender + '/messages/send', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + access_token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: receiptMessage(email, code) }),
    signal: AbortSignal.timeout(10000)
  }).catch(() => null);
  if (!response || response.status >= 500) {
    throw new Error('Gmail did not confirm delivery. Check Sent mail before trying again.');
  }
  if (!response.ok) throw new Error('Gmail rejected the receipt. Check the sender authorization and sending limits.');
}
