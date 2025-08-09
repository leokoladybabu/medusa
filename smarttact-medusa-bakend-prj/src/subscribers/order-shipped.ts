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

    // 1) shipment -> fulfillment id
    const sRows = await remoteQuery({
      shipments: {
        __args: { id: shipmentId },
        fields: ["id", "reference_id"],
      },
    })
    const fulfillmentId = sRows?.[0]?.reference_id as string | undefined
    if (!fulfillmentId) {
      log("error", `no fulfillment reference for shipment ${shipmentId}`)
      return
    }

    // 2) fulfillment -> tracking info
    const fRows = await remoteQuery({
      fulfillments: {
        __args: { id: fulfillmentId },
        fields: [
          "id",
          "provider_id",
          "tracking_links.id",
          "tracking_links.url",
          "tracking_links.tracking_number",
          "tracking_links.carrier",
        ],
      },
    })
    const fulfillment = (fRows?.[0] ?? {}) as any
    const firstLink = Array.isArray(fulfillment.tracking_links)
      ? fulfillment.tracking_links[0] ?? {}
      : {}

    const tracking_number: string | null = firstLink.tracking_number ?? null
    const tracking_url: string | null = firstLink.url ?? null
    const carrier: string | null =
      firstLink.carrier ?? fulfillment.provider_id ?? null

    // 3) find the order that contains this fulfillment
    const oList = await orders.listOrders(
      { fulfillment_ids: [fulfillmentId] } as any,
      { relations: ["items", "shipping_methods"] } // no 'customer' relation to keep TS happy
    )
    const order = oList?.[0]
    if (!order) {
      log("error", `could not resolve order for fulfillment ${fulfillmentId}`)
      return
    }

    // 4) email: prefer order.email; if absent, fetch via remoteQuery
    let toEmail: string | undefined = (order as any)?.email
    if (!toEmail) {
      const oRows = await remoteQuery({
        orders: {
          __args: { id: order.id },
          fields: ["id", "email"],
        },
      })
      toEmail = oRows?.[0]?.email
    }
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
      `queued shipped email to ${toEmail} (shipment=${shipmentId}, fulfillment=${fulfillmentId})`
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
