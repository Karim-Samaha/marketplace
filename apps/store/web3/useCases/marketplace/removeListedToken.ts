import { getContract } from '../utils';

/**
 * Remove a token from the marketplace listing
 * @param tokenId - The token ID to remove
 * @returns Transaction receipt with the Item struct
 */
export const removeListedToken = async (tokenId: bigint): Promise<any> => {
  const contract = await getContract();
  const tx = await contract.removeListedToken(tokenId);
  return await tx.wait();
};

