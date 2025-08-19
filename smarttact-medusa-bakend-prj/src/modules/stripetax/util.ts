import Stripe from "stripe";
import {
  BigNumberInput,
  TaxTypes,
} from "@medusajs/framework/types";
import { BigNumber } from "@medusajs/framework/utils";


export function getStripeTaxCalculationParams(
  itemLines: TaxTypes.ItemTaxCalculationLine[],
  shippingLines: TaxTypes.ShippingTaxCalculationLine[],
  context: TaxTypes.TaxCalculationContext
): Stripe.Tax.CalculationCreateParams {
  const addr = context.address || context.address || {};
  if (!addr.country_code) {
    throw new Error("Country code is required by Stripe for calculating tax");
  }

  const line_items: Stripe.Tax.CalculationCreateParams.LineItem[] = itemLines.map((l) => ({
    amount: toNumber(l.line_item.unit_price),
    quantity: toNumber(l.line_item.quantity),
    reference: l.line_item.id,
    // tax_behavior:
    //   ((l).line_item. as Stripe.Tax.CalculationCreateParams.LineItem.TaxBehavior) || "exclusive",
  }));

  const shippingAmount = shippingLines.reduce((sum, s) => sum + (toNumber(s.shipping_line.unit_price) || 0), 0);
//   const shippingTaxBehavior =
//     ((shippingLines[0])?.taxBehavior as Stripe.Tax.CalculationCreateParams.ShippingCost.TaxBehavior) ||
//     "exclusive";

 

  const params: Stripe.Tax.CalculationCreateParams = {
      customer_details: {
          address: {
              country: addr.country_code,
              state: addr.province_code,
              postal_code: addr.postal_code,
              city: addr.city || undefined,
              line1: addr.address_1,
              line2: addr.address_2,
          },
          address_source: "shipping",
      },
      line_items,
      currency: itemLines[0].line_item.currency_code ?? "USD",
  };

  if (shippingAmount > 0) {
    params.shipping_cost = {
      amount: shippingAmount,
      tax_behavior: "exclusive",
    };
  }

  return params;
}


export function toNumber(value: BigNumberInput|undefined): number {
  return value?new BigNumber(value).numeric:0;
}

function pctToRate(p?: string | null): number {
  return p ? parseFloat(p) / 100 : 0;
}

function buildCode(d?: {
  tax_type?: string | null;
  country?: string | null;
  state?: string | null;
}) {
  const parts = [d?.country, d?.state, d?.tax_type].filter(Boolean);
  return parts.join("_").toLowerCase();
}

export function mapStripeToMedusaTaxLines(
  calc: Stripe.Tax.Calculation,
  provider_id: string,
): { itemTaxLines: TaxTypes.ItemTaxLineDTO[]; shippingTaxLines: TaxTypes.ShippingTaxLineDTO[] } {
  const itemTaxLines: TaxTypes.ItemTaxLineDTO[] =
    calc.line_items?.data.flatMap((li) =>
      (li.tax_breakdown ?? []).map((tb) => {
        const d = tb.tax_rate_details;
        return {
          line_item_id: li.reference,
          provider_id,
          rate_id: d?.tax_type || "stripe_tax",
          code: buildCode(d??undefined),
          rate: pctToRate(d?.percentage_decimal),
          name: d?.tax_type || "tax",
          amount: tb.amount,
          item_id: String(li.reference ?? li.id),
        } as TaxTypes.ItemTaxLineDTO;
      })
    ) ?? [];

  const shippingTaxLines: TaxTypes.ShippingTaxLineDTO[] =
    calc.shipping_cost?.tax_breakdown?.map((tb) => {
      const d = tb.tax_rate_details;
      return {
        provider_id,
        rate_id: d?.tax_type || "stripe_tax",
        code: buildCode(d??undefined),
        rate: pctToRate(d?.percentage_decimal),
        name: d?.tax_type || "tax",
        amount: tb.amount,
        shipping_line_id: "shipping",
      } as TaxTypes.ShippingTaxLineDTO;
    }) ?? [];

  return { itemTaxLines, shippingTaxLines };
}
