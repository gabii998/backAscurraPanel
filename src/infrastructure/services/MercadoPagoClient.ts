import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import type { PreferenceCreateData } from "mercadopago/dist/clients/preference/create/types";

export class MercadoPagoClient {
  private preference: Preference;
  private payment: Payment;

  constructor(accessToken: string) {
    const client = new MercadoPagoConfig({ accessToken });
    this.preference = new Preference(client);
    this.payment    = new Payment(client);
  }

  createPreference(body: PreferenceCreateData["body"]) {
    return this.preference.create({ body });
  }

  getPayment(id: string) {
    return this.payment.get({ id });
  }
}
