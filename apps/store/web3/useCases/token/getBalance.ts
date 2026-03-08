import { getTokenContract } from '../utils';

/**
 * Get the contract balance
 * @returns The contract balance
 */
export const getBalance = async (): Promise<bigint> => {
  const contract = await getTokenContract();
  return await contract.getBalance();
};

