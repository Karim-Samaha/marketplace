import { getTokenContract } from '../utils';

/**
 * Get the total supply of tokens
 * @returns The total supply
 */
export const getTotalSupply = async (): Promise<bigint> => {
  const contract = await getTokenContract();
  return await contract.getTotalSupply();
};

