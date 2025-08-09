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
  const storeUrl = process.env.STOREFRONT_URL || "https://www.smarttract.com"
  const accountUrl = `${storeUrl}/account/orders`

  const fmt = new Intl.NumberFormat([], {
    style: "currency",
    currencyDisplay: "narrowSymbol",
    currency: order.currency_code,
  })

  const price = (v: BigNumberValue) => {
    if (typeof v === "number") return fmt.format(v)
    if (typeof v === "string") return fmt.format(parseFloat(v))
    return v?.toString() ?? ""
  }

  const idLabel =
    typeof order.display_id === "number"
      ? `#${order.display_id}`
      : order.display_id || order.id

  const trackingBlock = (
    <>
      <Text className="text-gray-700" style={{ margin: "0 0 12px" }}>
        We’ve handed your package to the carrier{carrier ? ` (${carrier})` : ""}.
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
          <Section className="bg-[#27272a] text-white px-6 py-4">
            <Heading as="h2" className="text-white text-xl m-0">
              SmartTract
            </Heading>
          </Section>

          {/* Hero / Title */}
          <Container className="p-6">
            <Heading className="text-2xl font-bold text-center text-gray-800">
              Good news — your order <strong>{idLabel}</strong> is on its way!
            </Heading>
            <Text className="text-center text-gray-600 mt-2">
              You can always check its status under{" "}
              <Link href={accountUrl} style={{ color: "#0070f3", textDecoration: "underline" }}>
                My Account
              </Link>
              .
            </Text>
          </Container>

          {/* Tracking */}
          <Container className="px-6">{trackingBlock}</Container>

          {/* Items (optional but nice) */}
          <Container className="px-6">
            <Heading className="text-xl font-semibold text-gray-800 mb-4">In this shipment</Heading>
            {order.items?.map((item) => (
              <Section key={item.id} className="border-b border-gray-200 py-4">
                <Row>
                  <Column className="w-1/3">
                    <Img
                      src={item.thumbnail ?? ""}
                      alt={item.product_title ?? ""}
                      className="rounded-lg"
                      width="100%"
                    />
                  </Column>
                  <Column className="w-2/3 pl-4">
                    <Text className="text-lg font-semibold text-gray-800 m-0">
                      {item.product_title}
                    </Text>
                    <Text className="text-gray-600 m-0">{item.variant_title}</Text>
                    <Text className="text-gray-800 mt-2 font-bold m-0">{price(item.total)}</Text>
                  </Column>
                </Row>
              </Section>
            ))}
          </Container>

          {/* Summary */}
          <Container className="px-6">
            <Section className="mt-6">
              <Row className="text-gray-600">
                <Column className="w-1/2">
                  <Text className="m-0">Subtotal</Text>
                </Column>
                <Column className="w-1/2 text-right">
                  <Text className="m-0">{price(order.item_total)}</Text>
                </Column>
              </Row>
              {order.shipping_methods?.map((m) => (
                <Row key={m.id} className="text-gray-600">
                  <Column className="w-1/2">
                    <Text className="m-0">{m.name}</Text>
                  </Column>
                  <Column className="w-1/2 text-right">
                    <Text className="m-0">{price(m.total)}</Text>
                  </Column>
                </Row>
              ))}
              <Row className="text-gray-600">
                <Column className="w-1/2">
                  <Text className="m-0">Tax</Text>
                </Column>
                <Column className="w-1/2 text-right">
                  <Text className="m-0">{price(order.tax_total || 0)}</Text>
                </Column>
              </Row>
              <Row className="border-t border-gray-200 mt-4 text-gray-800 font-bold">
                <Column className="w-1/2">
                  <Text>Total</Text>
                </Column>
                <Column className="w-1/2 text-right">
                  <Text>{price(order.total)}</Text>
                </Column>
              </Row>
            </Section>
          </Container>

          {/* Footer */}
          <Section className="bg-gray-50 p-6 mt-10">
            <Text className="text-center text-gray-500 text-sm">
              Questions? Reply to this email or contact{" "}
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
