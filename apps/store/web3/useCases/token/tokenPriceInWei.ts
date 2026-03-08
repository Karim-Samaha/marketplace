import { getTokenContract } from '../utils';

/**
 * Get the token price in wei
 * @returns The token price in wei
 */
export const tokenPriceInWei = async (): Promise<bigint> => {
  const contract = await getTokenContract();
  return await contract.tokenPriceInWei();
};

