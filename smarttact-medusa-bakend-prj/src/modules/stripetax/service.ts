import {
  ITaxProvider,
  RemoteQueryFunction,
  TaxTypes,
} from "@medusajs/framework/types";

import { Logger } from "@medusajs/medusa";
import { MedusaStripeClient } from "./client";
import { EntityManager } from "@mikro-orm/knex";
import { getStripeTaxCalculationParams, mapStripeToMedusaTaxLines } from "./util";

type InjectedDependencies = {
  logger: Logger;
  manager: EntityManager;
  remoteQuery: Omit<RemoteQueryFunction, symbol>;
};

type StripeClientOptions = {
  id: string;
  options: {
    apiKey: string;
    webhookSecret: string;
  };
};

export default class StripeTaxProvider implements ITaxProvider {
  static identifier = "stripetax";

  private stripeClient: MedusaStripeClient;

  constructor(private deps: InjectedDependencies, opts: StripeClientOptions) {
    console.log('StripeTaxProvider has been initialized')
    this.stripeClient = new MedusaStripeClient(opts.options.apiKey);
  }

  getIdentifier(): string {
    console.log('jhgygiyuiy')
    return StripeTaxProvider.identifier;
  }

  async getTaxLines(
    itemLines: TaxTypes.ItemTaxCalculationLine[],
    shippingLines: TaxTypes.ShippingTaxCalculationLine[],
    context: TaxTypes.TaxCalculationContext
  ): Promise<(TaxTypes.ItemTaxLineDTO | TaxTypes.ShippingTaxLineDTO)[]> {
    console.log('im also here')
    if (itemLines.length === 0 || context.address.postal_code === null) {
      return [];
    }

    const params = getStripeTaxCalculationParams(itemLines, shippingLines, context );
    console.log(JSON.stringify(params),'went into its making')
    const result = await this.stripeClient.tax.calculations.create(params);
    console.log(result, 'from stripe')
    const {itemTaxLines, shippingTaxLines }= mapStripeToMedusaTaxLines(result, this.getIdentifier())

    return [...itemTaxLines, ...shippingTaxLines];
  }
}