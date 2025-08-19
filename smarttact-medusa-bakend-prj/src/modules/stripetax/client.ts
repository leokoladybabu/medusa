import Stripe from 'stripe';

/**
 * Wrapper around the Stripe client that exposes ApiKey and WebhookSecret
 */
export class MedusaStripeClient extends Stripe {
    constructor(private apiKey: string) {
        super(apiKey, {
            apiVersion: null as unknown as Stripe.LatestApiVersion, // Use accounts default version
        });
    }
}