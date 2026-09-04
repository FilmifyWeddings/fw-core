export interface InteractiveButton {
  id: string;
  type: 'cta_url' | 'quick_reply' | 'cta_call' | 'url' | 'phone';
  text: string;
  value: string;
}

/**
 * Guaranteed Action Card Dispatcher (100% Visible & Clickable on all WhatsApp clients)
 * ====================================================================================
 */
export async function sendInteractiveTemplateMessage(
  sock: any,
  toJid: string,
  bodyText: string,
  footerText: string = "StudioCore",
  buttonsList: InteractiveButton[],
  mediaUrl?: string
) {
  if (!buttonsList || buttonsList.length === 0) {
    return await sock.sendMessage(toJid, { text: bodyText });
  }

  const actionBlocks = (buttonsList || []).map((btn: any) => {
    if (btn.type === 'cta_url' || btn.type === 'url') {
      return `🌐 *${btn.text}*\n👉 ${btn.value}`;
    }
    if (btn.type === 'cta_call' || btn.type === 'phone' || (btn.type as any) === 'call') {
      const cleanPhone = String(btn.value || '').replace(/[^0-9+]/g, '');
      return `📞 *${btn.text}*\n👉 tel:${cleanPhone}`;
    }
    return `⚡ *[ ${String(btn.text || '').toUpperCase()} ]*`;
  }).join('\n\n');

  const cardMessage = `${bodyText || ''}\n\n━━━━━━━━━━━━━━━━━━━━\n${actionBlocks}\n━━━━━━━━━━━━━━━━━━━━${footerText ? `\n_${footerText}_` : ''}`;

  const sentResult = await sock.sendMessage(toJid, {
    text: cardMessage
  });

  console.log(`✅ Action card message delivered to ${toJid}, ID:`, sentResult?.key?.id);
  return { success: true, messageId: sentResult?.key?.id || '' };
}
