import { Modules, ModuleProvider } from "@medusajs/framework/utils";
import TaxJarProvider from "./service";

export default ModuleProvider(Modules.TAX, {
  services: [TaxJarProvider],
});