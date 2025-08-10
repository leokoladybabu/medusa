import React from "react"
import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components"
import { CustomerDTO, OrderDTO, BigNumberValue } from "@medusajs/framework/types"

type OrderShippedEmailProps = {
  order: OrderDTO & { customer?: CustomerDTO }
  tracking_number?: string | null
  tracking_url?: string | null
  carrier?: string | null
}

export default function OrderShippedEmailComponent({
  order,
  tracking_number,
  tracking_url,
  carrier,
}: OrderShippedEmailProps) {
  // Debug logging
  console.log('OrderShippedEmail - order:', JSON.stringify(order, null, 2))
  console.log('OrderShippedEmail - tracking_number:', tracking_number)
  console.log('OrderShippedEmail - tracking_url:', tracking_url)
  console.log('OrderShippedEmail - carrier:', carrier)
  
  const storeUrl = process.env.STOREFRONT_URL || "https://www.smarttract.com"
  const accountUrl = `${storeUrl}/account/orders`

  const fmt = new Intl.NumberFormat([], {
    style: "currency",
    currencyDisplay: "narrowSymbol",
    currency: order.currency_code || 'USD',
  })

  const price = (v: BigNumberValue) => {
    try {
      if (!v && v !== 0) return fmt.format(0)
      if (typeof v === "number") return fmt.format(v)
      if (typeof v === "string") {
        const num = parseFloat(v)
        return isNaN(num) ? fmt.format(0) : fmt.format(num)
      }
      if (v && typeof v === 'object' && 'raw' in v) {
        const num = parseFloat(String(v.raw))
        return isNaN(num) ? fmt.format(0) : fmt.format(num)
      }
      // Handle BigNumber or other object types
      const str = String(v)
      const num = parseFloat(str)
      return isNaN(num) ? fmt.format(0) : fmt.format(num)
    } catch (error) {
      console.log('Price formatting error for value:', v, 'error:', error)
      return fmt.format(0)
    }
  }

  const idLabel =
    typeof order.display_id === "number"
      ? `#${order.display_id}`
      : order.display_id || order.id

  const trackingBlock = (
    <>
      <Text className="text-gray-700" style={{ margin: "0 0 12px" }}>
        We have shipped your package.
      </Text>

      {tracking_number ? (
        <Text className="text-gray-700" style={{ margin: "0 0 12px" }}>
          Tracking number: <strong>{tracking_number}</strong>
        </Text>
      ) : null}

      {tracking_url ? (
        <Text className="text-gray-700" style={{ margin: "0 0 16px" }}>
          Track your shipment here:{" "}
          <Link href={tracking_url} style={{ color: "#0070f3", textDecoration: "underline" }}>
            {tracking_url}
          </Link>
        </Text>
      ) : null}
    </>
  )

  return (
    <Tailwind>
      <Html className="font-sans bg-gray-100">
        <Head />
        <Preview>Your SmartTract order has shipped</Preview>
        <Body className="bg-white my-10 mx-auto w-full max-w-2xl">
          {/* Header */}
          <Section className="bg-[#CCFF00] text-white px-6 py-4">
            <Heading as="h2" className="text-gray-800 text-xl m-0">
              SmartTract
            </Heading>
          </Section>

          {/* Hero / Title */}
          <Container className="p-6">
            <Heading className="text-2xl font-bold text-center text-gray-800">
              Good news — your order is on its way!
            </Heading>
            <Text className="text-center text-gray-600 mt-2">
              You can check order details under{" "}
              <Link href={accountUrl} style={{ color: "#0070f3", textDecoration: "underline" }}>
                My Account
              </Link>
              .
            </Text>
          </Container>
          {/* Footer */}
          <Section className="bg-gray-50 p-6 mt-10">
            <Text className="text-center text-gray-500 text-sm">
              Questions? Reply to this email{" "}
              <Link href="mailto:support@smart-tract.com" style={{ color: "#0070f3" }}>
                support@smart-tract.com
              </Link>
              .
            </Text>
            <Text className="text-center text-gray-500 text-sm">Order Token: {order.id}</Text>
            <Text className="text-center text-gray-400 text-xs mt-4">
              © {new Date().getFullYear()} SmartTract, Inc. All rights reserved.
            </Text>
          </Section>
        </Body>
      </Html>
    </Tailwind>
  )
}

// Helper export for Resend provider mapping
export const orderShippedEmail = (props: OrderShippedEmailProps) => (
  <OrderShippedEmailComponent {...props} />
)
