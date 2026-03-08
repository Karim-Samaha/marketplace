import { getTokenContract } from '../utils';

/**
 * Sell tokens back to the marketplace
 * @param amount - The amount of tokens to sell
 * @returns Transaction receipt
 */
export const sellToken = async (amount: bigint): Promise<any> => {
  const contract = await getTokenContract();
  const tx = await contract.sellToken(amount);
  return await tx.wait();
};

