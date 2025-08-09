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
import { orderShippedEmail } from "./emails/order-shipped"

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

const TEMPLATE_KEYS = {
  ORDER_PLACED: "order.placed",
  ORDER_SHIPPED: "order.shipped",
  RESET_PASSWORD: "auth.reset_password",
} as const

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

type InjectedDependencies = { logger: Logger }

class ResendNotificationProviderService extends AbstractNotificationProviderService {
  // must match your provider id in medusa-config
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
    const inline = this.options.html_templates?.[templateKey]
    if (inline?.content) return inline.content
    return reactTemplates[templateKey] ?? null
  }

  private getSubject(templateKey: string, notification?: ProviderSendNotificationDTO) {
    // inline subject override
    const inline = this.options.html_templates?.[templateKey]
    if (inline?.subject) return inline.subject

    // allow subject in data: { subject: "..." }
    const dataSubject = (notification?.data as any)?.subject
    if (typeof dataSubject === "string" && dataSubject.trim()) return dataSubject.trim()

    // defaults
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

  async send(notification: ProviderSendNotificationDTO): Promise<ProviderSendNotificationResultsDTO> {
    const originalKey = String(notification.template)
    const key = this.normalizeKey(originalKey)

    const template = this.getTemplateFn(key)
    if (!template) {
      this.logger.error(
        `Resend: no template for "${originalKey}" (normalized "${key}"). Available: ${Object.keys(reactTemplates).join(", ")}`
      )
      return {}
    }

    const common: Omit<CreateEmailOptions, "react" | "html"> = {
      from: this.options.from,
      to: [notification.to],
      replyTo: this.options.reply_to ?? this.options.from,
      subject: this.getSubject(key, notification),
    }

    let emailOptions: CreateEmailOptions
    if (typeof template === "string") {
      emailOptions = { ...common, html: template }
    } else {
      emailOptions = { ...common, react: template(notification.data) }
    }

    const { data, error } = await this.resendClient.emails.send(emailOptions)

    if (error || !data) {
      if (error) {
        // Resend returns a typed ErrorResponse; wrap to satisfy logger
        const wrapped = new Error(typeof error === "string" ? error : JSON.stringify(error))
        this.logger.error("Resend: failed to send email", wrapped)
      } else {
        this.logger.error("Resend: failed to send email: unknown error")
      }
      return {}
    }

    return { id: data.id }
  }
}

export default ResendNotificationProviderService
