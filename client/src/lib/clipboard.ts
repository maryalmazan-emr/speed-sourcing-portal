/**
 * Copy text to clipboard with fallback for restricted environments
 * (e.g. iframes without clipboard permissions)
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Validate input
  if (!text || typeof text !== "string") {
    console.error("Invalid text provided to copyToClipboard:", text);
    return false;
  }

  // Guard for non-browser environments
  if (typeof window === "undefined") {
    return false;
  }

  // Try the modern Clipboard API first
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Expected to fail in restricted contexts (iframes, permissions)
    }
  }

  // Fallback for restricted environments
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    textarea.setAttribute("readonly", "");

    document.body.appendChild(textarea);

    textarea.select();
    textarea.setSelectionRange(0, text.length);

    const success = document.execCommand("copy");

    document.body.removeChild(textarea);

    return success;
  } catch (error) {
    console.error("Fallback clipboard copy failed:", error);
    return false;
  }
}