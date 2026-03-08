import { getTokenContract } from '../utils';

/**
 * Withdraw available funds for the caller
 * @returns Transaction receipt
 */
export const userWithdraw = async (): Promise<any> => {
  const contract = await getTokenContract();
  const tx = await contract.userWithdraw();
  return await tx.wait();
};

