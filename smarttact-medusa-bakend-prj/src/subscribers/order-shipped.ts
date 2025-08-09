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

  try {
    const shipmentId = data?.id
    if (!shipmentId) {
      logger.error("order-shipped: missing shipment id in payload")
      return
    }

    // Honor “Don’t send notification” toggle, if used
    if (data.no_notification) {
      logger.info(`order-shipped: skipping, no_notification=true (shipment ${shipmentId})`)
      return
    }

    // 1) shipment -> fulfillment id
    const [shipment] = await remoteQuery({
      entry_point: "shipments",
      fields: ["id", "reference_id"],
      variables: { id: shipmentId },
    })
    const fulfillmentId = shipment?.reference_id as string
    if (!fulfillmentId) {
      logger.error(`order-shipped: shipment ${shipmentId} missing reference_id`)
      return
    }

    // 2) fulfillment -> tracking info
    const [fulfillment] = await remoteQuery({
      entry_point: "fulfillments",
      fields: [
        "id",
        "provider_id",
        "tracking_links.url",
        "tracking_links.tracking_number",
      ],
      variables: { id: fulfillmentId },
    })

    const t = fulfillment?.tracking_links?.[0] ?? {}
    const tracking_number = t.tracking_number ?? null
    const tracking_url = t.url ?? null
    const carrier = fulfillment?.provider_id ?? null

    // 3) order containing this fulfillment
    const [order] = await orders.listOrders(
      { fulfillment_ids: [fulfillmentId] } as any,
      { relations: ["items", "shipping_methods"] }
    )
    if (!order?.email) {
      logger.error(`order-shipped: no order/email for fulfillment ${fulfillmentId}`)
      return
    }

    // 4) send the email via the notification module (Resend)
    await notifications.createNotifications({
      to: order.email,
      channel: "email",
      template: "order.shipped",
      data: { order, tracking_number, tracking_url, carrier },
    })

    logger.info(
      `order-shipped: queued shipped email to ${order.email} (shipment ${shipmentId})`
    )
  } catch (e) {
    container.resolve<Logger>("logger").error("order-shipped subscriber failed", e as any)
  }
}

export const config: SubscriberConfig = {
  event: "fulfillment.shipment.created",
}
