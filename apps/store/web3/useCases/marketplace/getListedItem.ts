import { getContract } from '../utils';

/**
 * Get a listed item by token ID
 * @param tokenId - The token ID
 * @returns The Item struct with token details
 */
export const getListedItem = async (tokenId: bigint): Promise<any> => {
  const contract = await getContract();
  return await contract.getListedItem(tokenId);
};

