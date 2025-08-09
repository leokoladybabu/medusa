// src/modules/resend/emails/order-shipped.ts
import * as React from "react"

type OrderShippedEmailProps = {
  order_id?: string | number
  tracking_number?: string
  tracking_url?: string
}

export const orderShippedEmail = ({
  order_id,
  tracking_number,
  tracking_url,
}: OrderShippedEmailProps) => {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", color: "#111", lineHeight: 1.45 }}>
      <h2 style={{ margin: "0 0 12px" }}>Your order has shipped! 📦</h2>
      <p style={{ margin: "0 0 12px" }}>
        Great news — your order {order_id ? <strong>#{order_id}</strong> : null} is on its way.
      </p>

      {tracking_number ? (
        <p style={{ margin: "0 0 12px" }}>
          Tracking Number: <strong>{tracking_number}</strong>
        </p>
      ) : null}

      {tracking_url ? (
        <p style={{ margin: "0 0 16px" }}>
          Track it here:{" "}
          <a href={tracking_url} style={{ color: "#0066cc" }}>
            Track Shipment
          </a>
        </p>
      ) : null}

      <p style={{ margin: 0 }}>
        Thanks for shopping with SmartTract! If you have questions, reply to this email or
        contact <a href="mailto:support@smart-tract.com">support@smart-tract.com</a>.
      </p>

      <p style={{ marginTop: 18, color: "#666", fontSize: 12 }}>
        © {new Date().getFullYear()} SmartTract, Inc. All rights reserved.
      </p>
    </div>
  )
}
