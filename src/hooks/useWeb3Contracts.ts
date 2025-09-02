// This file is deprecated - use hederaContractService directly instead
// Left here for compatibility during transition

export const listAssetOnMarketplace = async (tokenId: string, amount: number): Promise<string> => {
  throw new Error('listAssetOnMarketplace is deprecated. Use hederaContractService instead.');
};
