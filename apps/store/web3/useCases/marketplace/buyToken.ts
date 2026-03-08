import { getContract } from '../utils';

/**
 * Buy a listed token
 * @param tokenId - The token ID to buy
 * @returns Transaction receipt with the Item struct
 */
export const buyToken = async (tokenId: bigint): Promise<any> => {
  const contract = await getContract();
  const tx = await contract.buyToken(tokenId);
  return await tx.wait();
};

