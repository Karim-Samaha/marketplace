import { getTokenContract } from '../utils';

/**
 * Set the token price (owner only)
 * @param tokenPriceInWei - The new token price in wei
 * @returns Transaction receipt
 */
export const setTokenPrice = async (tokenPriceInWei: bigint): Promise<any> => {
  const contract = await getTokenContract();
  const tx = await contract.setTokenPrice(tokenPriceInWei);
  return await tx.wait();
};

