import { getTokenContract } from '../utils';

/**
 * Get the amount available for a user to withdraw
 * @param userAddress - The address of the user
 * @returns The amount available to withdraw
 */
export const availableForUsersToWithdraw = async (
  userAddress: string,
): Promise<bigint> => {
  const contract = await getTokenContract();
  return await contract.availableForUsersToWithdraw(userAddress);
};

