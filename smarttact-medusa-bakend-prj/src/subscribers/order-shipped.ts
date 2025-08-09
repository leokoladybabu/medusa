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
      logger.error("order-shipped: missing shipment id")
      return
    }

    if (data.no_notification) {
      logger.info(`order-shipped: skip (no_notification=true) [${shipmentId}]`)
      return
    }

    // shipment -> fulfillment
    const [shipment] = await remoteQuery({
      entry_point: "shipments",
      fields: ["id", "reference_id"],
      variables: { id: shipmentId },
    })
    const fulfillmentId = shipment?.reference_id as string
    if (!fulfillmentId) {
      logger.error(`order-shipped: no fulfillment for shipment ${shipmentId}`)
      return
    }

    // fulfillment -> tracking
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

    // order containing this fulfillment
    const [order] = await orders.listOrders(
      { fulfillment_ids: [fulfillmentId] } as any,
      { relations: ["items", "shipping_methods"] }
    )
    if (!order?.email) {
      logger.error(`order-shipped: order/email not found for fulfillment ${fulfillmentId}`)
      return
    }

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
  event: "shipment.created",
}
