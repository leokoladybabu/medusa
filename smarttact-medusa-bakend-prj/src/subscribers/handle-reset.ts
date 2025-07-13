import {
  SubscriberArgs,
  type SubscriberConfig,
} from "@medusajs/medusa"
import { Modules } from "@medusajs/framework/utils"

export default async function resetPasswordTokenHandler({
  event: { data: {
    entity_id: email,
    token,
    actor_type,
  } },
  container,
}: SubscriberArgs<{ entity_id: string, token: string, actor_type: string }>) {
  const notificationModuleService = container.resolve(
    Modules.NOTIFICATION
  )

  const customerService = container.resolve(Modules.CUSTOMER)
  let customerName = ""

  if (actor_type === "customer") {
    const customers = await customerService.listCustomers({email})
    customerName = [customers[0]?.first_name, customers[0]?.last_name].filter(Boolean).join(" ")
  }

  const urlPrefix = actor_type === "customer" ? 
    process.env.STOREFRONT_URL : 
    "https://admin.com/app"

  await notificationModuleService.createNotifications({
    to: email,
    channel: "email",
    template: "reset-password",
    data: {
      // a URL to a frontend application
      resetLink: `${urlPrefix}/us/reset-password?token=${token}&email=${email}`,
      customerName: ""
    },
  })
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}