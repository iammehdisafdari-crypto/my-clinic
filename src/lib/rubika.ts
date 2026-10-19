export async function openRubikaAndCopyMessage(message: string): Promise<boolean> {
  // Rubika does not expose a documented web share URL for opening a chat with
  // prefilled text, so open its web client and copy the prepared message.
  window.open("https://web.rubika.ir", "_blank", "noopener,noreferrer");

  try {
    await navigator.clipboard.writeText(message);
    return true;
  } catch {
    return false;
  }
}
