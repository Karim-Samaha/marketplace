import { getTokenContract } from '../utils';

/**
 * Withdraw funds from the contract (payable function)
 * @param amount - The amount to withdraw
 * @param valueInWei - The amount of ETH to send (in wei)
 * @returns Transaction receipt
 */
export const withdraw = async (
  amount: bigint,
  valueInWei: bigint,
): Promise<any> => {
  const contract = await getTokenContract();
  const tx = await contract.withdraw(amount, { value: valueInWei });
  return await tx.wait();
};

