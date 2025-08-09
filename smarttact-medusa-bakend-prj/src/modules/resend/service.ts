// src/modules/resend/service.ts
import * as React from "react"
import {
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
  Logger,
} from "@medusajs/framework/types"
import { AbstractNotificationProviderService } from "@medusajs/framework/utils"
import { Resend, CreateEmailOptions } from "resend"

import { orderPlacedEmail } from "./emails/order-placed"
import { resetPasswordEmail } from "./emails/reset-password"
import { orderShippedEmail } from "./emails/order-shipped" // <-- create this file

type ResendOptions = {
  api_key: string
  from: string
  reply_to?: string
  html_templates?: Record<
    string,
    {
      subject?: string
      content: string
    }
  >
}

// Canonical keys Medusa emits (plus one for auth reset; adjust if you use another)
const TEMPLATE_KEYS = {
  ORDER_PLACED: "order.placed",
  ORDER_SHIPPED: "order.shipped",
  RESET_PASSWORD: "auth.reset_password",
} as const

// Allow dashed aliases too, just in case callers send them
const ALIASES: Record<string, string> = {
  "order-placed": TEMPLATE_KEYS.ORDER_PLACED,
  "order-shipped": TEMPLATE_KEYS.ORDER_SHIPPED,
  "reset-password": TEMPLATE_KEYS.RESET_PASSWORD,
}

const reactTemplates: Record<string, (props: unknown) => React.ReactNode> = {
  [TEMPLATE_KEYS.ORDER_PLACED]: orderPlacedEmail,
  [TEMPLATE_KEYS.ORDER_SHIPPED]: orderShippedEmail,
  [TEMPLATE_KEYS.RESET_PASSWORD]: resetPasswordEmail,
}

type InjectedDependencies = {
  logger: Logger
}

class ResendNotificationProviderService extends AbstractNotificationProviderService {
  // IMPORTANT: Keep this in sync with the provider id in medusa-config (id: "resend")
  static identifier = "resend"

  private resendClient: Resend
  private options: ResendOptions
  private logger: Logger

  constructor({ logger }: InjectedDependencies, options: ResendOptions) {
    super()
    this.resendClient = new Resend(options.api_key)
    this.options = options
    this.logger = logger
  }

  private normalizeKey(key: string) {
    return ALIASES[key] ?? key
  }

  private getTemplateFn(templateKey: string) {
    // 1) Allow inline HTML override from env-config if provided
    const inline = this.options.html_templates?.[templateKey]
    if (inline?.content) return inline.content

    // 2) React components map
    return reactTemplates[templateKey] ?? null
  }

  private getSubject(templateKey: string) {
    const inline = this.options.html_templates?.[templateKey]
    if (inline?.subject) return inline.subject

    switch (templateKey) {
      case TEMPLATE_KEYS.ORDER_PLACED:
        return "Order Confirmation"
      case TEMPLATE_KEYS.ORDER_SHIPPED:
        return "Your Order Has Shipped"
      case TEMPLATE_KEYS.RESET_PASSWORD:
        return "Reset Your Password"
      default:
        return "SmartTract Notification"
    }
  }

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    const originalKey = String(notification.template)
    const key = this.normalizeKey(originalKey)

    const template = this.getTemplateFn(key)
    if (!template) {
      this.logger.error(
        `Resend: no template for "${originalKey}" (normalized "${key}"). ` +
          `Available: ${Object.keys(reactTemplates).join(", ")}`
      )
      return {}
    }

    const common: Omit<CreateEmailOptions, "react" | "html"> = {
      from: this.options.from,
      to: [notification.to],
      replyTo: this.options.reply_to ?? this.options.from,
      subject: notification.subject ?? this.getSubject(key),
    }

    let emailOptions: CreateEmailOptions
    if (typeof template === "string") {
      emailOptions = { ...common, html: template }
    } else {
      emailOptions = { ...common, react: template(notification.data) }
    }

    const { data, error } = await this.resendClient.emails.send(emailOptions)

    if (error || !data) {
      this.logger.error("Resend: failed to send email", error ?? {})
      return {}
    }

    return { id: data.id }
  }
}

export default ResendNotificationProviderService
