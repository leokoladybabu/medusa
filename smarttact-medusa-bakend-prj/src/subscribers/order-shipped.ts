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

  // Small helper to make logs consistent
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
        fields: ["id", "reference_id"], // reference_id points to the fulfillment
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
    //    (selector type is loose here to avoid TS friction across versions)
    const oList = await orders.listOrders(
      { fulfillment_ids: [fulfillmentId] } as any,
      { relations: ["items", "shipping_methods", "customer"] }
    )

    const order = oList?.[0]
    const toEmail: string | undefined =
      order?.email || order?.customer?.email || undefined

    if (!order || !toEmail) {
      log("error", `could not resolve order/email for fulfillment ${fulfillmentId}`)
      return
    }

    // 4) enqueue notification -> your Resend provider will render "order.shipped"
    await notifications.createNotifications({
      to: toEmail,
      channel: "email",
      template: "order.shipped",
      data: { order, tracking_number, tracking_url, carrier },
      // If you ever need to force a specific provider id:
      // provider_id: "resend",
    })

    log(
      "info",
      `queued shipped email to ${toEmail} (shipment=${shipmentId}, fulfillment=${fulfillmentId})`
    )
  } catch (e) {
    const err = e as any
    const msg = err?.message || String(err)
    log("error", `subscriber failed: ${msg}`)
    if (err?.stack) logger.error(err.stack)
  }
}

// Bind to the event emitted by the order shipment workflow
export const config: SubscriberConfig = {
  event: "shipment.created",
}
