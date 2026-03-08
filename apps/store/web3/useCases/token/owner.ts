import { getTokenContract } from '../utils';

/**
 * Get the owner address of the contract
 * @returns The owner address
 */
export const owner = async (): Promise<string> => {
  const contract = await getTokenContract();
  return await contract.owner();
};

