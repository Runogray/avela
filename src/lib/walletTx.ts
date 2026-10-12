/* Mock wallet activity log (localStorage `dote.wallettx`). Written when a
 * top-up or withdrawal completes; read by the Notifications screen. */

export type WalletTxKind = "topup" | "withdraw";
export type WalletTx = { id: string; kind: WalletTxKind; amount: number; at: number };

export function recordWalletTx(kind: WalletTxKind, amount: number) {
  try {
    const all: WalletTx[] = JSON.parse(localStorage.getItem("dote.wallettx") || "[]");
    all.push({ id: Math.random().toString(36).slice(2), kind, amount, at: Date.now() });
    localStorage.setItem("dote.wallettx", JSON.stringify(all));
  } catch {
    /* storage unavailable */
  }
}
