import type { SessionProvider } from "./SessionProvider.js";

export class ProviderRegistry {
  private readonly providers = new Map<string, SessionProvider>();

  register(provider: SessionProvider): void {
    this.providers.set(provider.name, provider);
  }

  get(providerName: string): SessionProvider {
    const provider = this.providers.get(providerName);

    if (!provider) {
      const availableProviders = [...this.providers.keys()].join(", ");
      throw new Error(
        `Provider "${providerName}" is not supported. Available providers: ${availableProviders}`,
      );
    }

    return provider;
  }
}
