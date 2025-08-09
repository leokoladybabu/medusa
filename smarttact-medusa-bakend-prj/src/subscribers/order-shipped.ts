import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type {
  INotificationModuleService,
  IFulfillmentModuleService,
  IOrderModuleService,
  Logger,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function orderShippedHandler({
  event: { data }, // data.id is the fulfillment id
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve<Logger>("logger")
  const notifications = container.resolve<INotificationModuleService>(Modules.NOTIFICATION)
  const fulfillments = container.resolve<IFulfillmentModuleService>(Modules.FULFILLMENT)
  const orders = container.resolve<IOrderModuleService>(Modules.ORDER)

  try {
    // 1) Fulfillment (cast to any to reach fields not exposed on the DTO type)
    const f = await fulfillments.retrieveFulfillment(data.id)
    const fAny = f as any

    // 2) Find the order
    let order
    if (fAny.order_id) {
      order = await orders.retrieveOrder(fAny.order_id, {
        relations: ["items", "shipping_methods"],
      })
    } else {
      // Fallback: find order by fulfillment id
      const list = await orders.listOrders(
        { fulfillment_ids: [f.id] } as any,
        { relations: ["items", "shipping_methods"] }
      )
      order = list?.[0]
    }

    if (!order) {
      logger.error(`order-shipped: no order found for fulfillment ${f.id}`)
      return
    }

    // 3) Tracking info (first link if present)
    const link = (fAny.tracking_links?.[0] ?? {}) as any

    // 4) Send notification (CreateNotificationDTO has no provider_id in your build)
    await notifications.createNotifications({
      to: order.email!,
      channel: "email",
      template: "order.shipped",
      data: {
        order,
        tracking_number: link.tracking_number ?? null,
        tracking_url: link.url ?? null,
        carrier: f.provider_id ?? null,
      },
    })
  } catch (e) {
    logger?.error("order-shipped subscriber failed", e as any)
  }
}

// Fires when a shipment is created for a fulfillment (Admin → Mark as shipped)
export const config: SubscriberConfig = {
  event: "fulfillment.shipment_created",
}
