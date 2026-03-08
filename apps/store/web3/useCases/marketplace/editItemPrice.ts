import { getContract } from '../utils';

/**
 * Edit the price of a listed item
 * @param tokenId - The token ID
 * @param newPrice - The new price in tokens
 * @returns Transaction receipt with the Item struct
 */
export const editItemPrice = async (
  tokenId: bigint,
  newPrice: bigint,
): Promise<any> => {
  const contract = await getContract();
  const tx = await contract.editItemPrice(tokenId, newPrice);
  return await tx.wait();
};

