export class IntegrationUnavailable extends Error {
  constructor(public readonly integration: "catalog" | "payments" | "account") {
    super(`${integration} integration is not connected yet.`);
    this.name = "IntegrationUnavailable";
  }
}
export class CatalogError extends Error {}
export class InvalidOrder extends Error {}
