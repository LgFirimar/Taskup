import { useState } from "react";
import { gmailWebUrl } from "../utils";

// The "📩 מייל מקורי" link, used everywhere a card shows an email we don't
// render in full (rule detail, folder viewer, instructions log) — plus a
// "📋" copy-link fallback next to it.
//
// On mobile, tapping the link often hands off to the native Gmail app via
// the OS's universal/app-link mechanism, and that app doesn't reliably land
// on the exact message (it can just open to the inbox instead). But a URL
// that's TYPED or PASTED into the browser's own address bar never triggers
// that hand-off — on both iOS and Android this is deliberate OS behavior:
// only a real tap on a link from within an app counts, manual navigation
// is exempt. So when the direct tap doesn't work, copying the link and
// pasting it into the browser's address bar is a reliable way around it.
export default function OriginalEmailLink({ id, messageId }) {
  const [copied, setCopied] = useState(false);
  if (!id) return null;
  const href = gmailWebUrl(id, messageId);

  const copy = async (e) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API can be unavailable (permissions denied, non-secure
      // context) — fall back to a prompt so the link text is at least
      // selectable/copyable by hand.
      window.prompt("העתיקי את הקישור:", href);
    }
  };

  return (
    <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
      <a href={href} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:"#0077b6",fontWeight:700,whiteSpace:"nowrap",textDecoration:"none"}}>📩 מייל מקורי</a>
      <button
        onClick={copy}
        aria-label="העתיקי קישור למייל"
        title="אם הקישור פותח את אפליקציית Gmail בלי להראות את המייל — העתיקי והדביקי אותו בשורת הכתובת בדפדפן"
        style={{background:"none",border:"1px solid #dde",borderRadius:6,cursor:"pointer",fontSize:10,padding:"2px 6px",color:copied?"#2d6a4f":"#888",fontFamily:"'Heebo',sans-serif",fontWeight:copied?700:400,whiteSpace:"nowrap"}}
      >
        {copied?"✓ הועתק":"📋 העתק"}
      </button>
    </div>
  );
}
