import { getContract } from '../utils';

/**
 * Get the owner address of the marketplace contract
 * @returns The owner address
 */
export const owner = async (): Promise<string> => {
  const contract = await getContract();
  return await contract.owner();
};

