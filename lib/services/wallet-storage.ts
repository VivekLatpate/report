// Temporary wallet address storage until Prisma client is regenerated
const walletAddressStorage = new Map<string, string>();

export function storeWalletAddress(reportId: string, walletAddress: string) {
  walletAddressStorage.set(reportId, walletAddress);
}

export function getWalletAddress(reportId: string): string | undefined {
  return walletAddressStorage.get(reportId);
}



