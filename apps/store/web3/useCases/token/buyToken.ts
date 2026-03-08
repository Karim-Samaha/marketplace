import { getTokenContract } from '../utils';

/**
 * Buy tokens from the marketplace (payable function)
 * @param valueInWei - The amount of ETH to send (in wei)
 * @returns Transaction receipt
 */
export const buyToken = async (valueInWei: bigint): Promise<any> => {
  const contract = await getTokenContract();
  const tx = await contract.buyToken({ value: valueInWei });
  return await tx.wait();
};

