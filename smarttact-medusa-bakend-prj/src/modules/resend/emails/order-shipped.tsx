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

  const idLabel =
    typeof order.display_id === "number"
      ? `#${order.display_id}`
      : order.display_id || order.id

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
