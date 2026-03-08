import { getTokenContract } from '../utils';

/**
 * Get the current token price
 * @returns The token price in wei
 */
export const getTokenPrice = async (): Promise<bigint> => {
  const contract = await getTokenContract();
  return await contract.getTokenPrice();
};

