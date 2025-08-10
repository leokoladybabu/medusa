// src/subscribers/order-shipped.ts
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type {
  INotificationModuleService,
  IOrderModuleService,
  Logger,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function orderShippedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; no_notification?: boolean }>) {
  const logger = container.resolve<Logger>("logger")
  const notifications = container.resolve<INotificationModuleService>(Modules.NOTIFICATION)
  const orders = container.resolve<IOrderModuleService>(Modules.ORDER)
  const remoteQuery = container.resolve<any>("remoteQuery")

  const log = (lvl: "info" | "error", msg: string) =>
    logger[lvl](`[order-shipped] ${msg}`)

  try {
    const shipmentId = data?.id
    if (!shipmentId) {
      log("error", "missing shipment id on event payload")
      return
    }

    if (data?.no_notification) {
      log("info", `skip email (no_notification=true) [shipment=${shipmentId}]`)
      return
    }

  // 1) fulfillment id is emitted in the event payload (shipment.created uses the updated fulfillment's id)
  const fulfillmentId = shipmentId

    // 2) fulfillment -> tracking info (labels contain tracking_number and tracking_url)
    const fRows = await remoteQuery({
      fulfillments: {
        __args: { id: fulfillmentId },
        fields: [
          "id",
          "provider_id",
          "labels.id",
          "labels.tracking_number",
          "labels.tracking_url",
          "labels.label_url",
        ],
      },
    })
    const fulfillment = (fRows?.[0] ?? {}) as any
    
    // Also try to get labels directly
    const labelRows = await remoteQuery({
      fulfillment_labels: {
        __args: { fulfillment_id: fulfillmentId },
        fields: [
          "id",
          "tracking_number", 
          "tracking_url",
          "label_url",
        ],
      },
    })

    log("info", `fulfillment data: ${JSON.stringify(fulfillment)}`)
    log("info", `fulfillment labels direct: ${JSON.stringify(labelRows)}`)

    const firstLink = Array.isArray(fulfillment.labels) && fulfillment.labels.length > 0
      ? fulfillment.labels[0] 
      : (Array.isArray(labelRows) && labelRows.length > 0 ? labelRows[0] : {})

    log("info", `using label data: ${JSON.stringify(firstLink)}`)

    const tracking_number: string | null = firstLink.tracking_number ?? null
    const tracking_url: string | null = (firstLink.tracking_url === "#" ? null : firstLink.tracking_url) ?? null
    const carrier: string | null =
      fulfillment.provider_id ?? null

    // 3) find the order that contains this fulfillment via link table
    const ofRows = await remoteQuery({
      order_fulfillments: {
        __args: { fulfillment_id: fulfillmentId },
        fields: ["order_id"],
      },
    })
    const orderId = ofRows?.[0]?.order_id as string | undefined
    if (!orderId) {
      log("error", `could not resolve order link for fulfillment ${fulfillmentId}`)
      return
    }

    const oRows = await remoteQuery({
      orders: {
        __args: { id: orderId },
        fields: [
          "id",
          "email",
          "currency_code",
          "total",
          "subtotal", 
          "item_total",
          "shipping_total",
          "tax_total",
          "items.id",
          "items.title", 
          "items.product_title",
          "items.variant_title",
          "items.thumbnail",
          "items.quantity",
          "items.unit_price",
          "items.total",
          "shipping_methods.id",
          "shipping_methods.name",
          "shipping_methods.total",
        ],
      },
    })
    const order = oRows?.[0]
    if (!order) {
      log("error", `could not resolve order for fulfillment ${fulfillmentId}`)
      return
    }

    // 4) email: use order.email
    let toEmail: string | undefined = (order as any)?.email
    if (!toEmail) {
      log("error", `no email found for order ${order.id}`)
      return
    }

    // 5) enqueue notification -> Resend provider renders "order.shipped"
    await notifications.createNotifications({
      to: toEmail,
      channel: "email",
      template: "order.shipped",
      data: { order, tracking_number, tracking_url, carrier },
    })

    log(
      "info",
      `queued shipped email to ${toEmail} (shipment=${shipmentId}, fulfillment=${fulfillmentId}) tracking: ${tracking_number || "none"}, url: ${tracking_url || "none"}, carrier: ${carrier || "none"}`
    )
  } catch (e) {
    const err = e as any
    log("error", `subscriber failed: ${err?.message || String(err)}`)
    if (err?.stack) logger.error(err.stack)
  }
}

export const config: SubscriberConfig = {
  event: "shipment.created",
}
