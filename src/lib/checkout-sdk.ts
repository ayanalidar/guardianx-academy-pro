/* ============================================================
   Checkout SDK loaders - shared by course-detail checkout and
   the dashboard "pay pending installment" dialog.
   ============================================================ */

export function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById("razorpay-script")
    if (existing) { resolve(); return }
    const script = document.createElement("script")
    script.id = "razorpay-script"
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK"))
    document.body.appendChild(script)
  })
}

export function loadPayPalScript(clientId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById("paypal-sdk-script") as HTMLScriptElement | null
    if (existing) {
      if (existing.dataset.clientId === clientId) { resolve(); return }
      existing.remove() // client id changed (e.g. live <-> sandbox) - reload
    }
    const script = document.createElement("script")
    script.id = "paypal-sdk-script"
    script.dataset.clientId = clientId
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&components=buttons&disable-funding=paylater`
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load PayPal SDK"))
    document.body.appendChild(script)
  })
}
