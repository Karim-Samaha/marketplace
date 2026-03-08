import { getContract } from '../utils';

/**
 * Get the total count of listed items
 * @returns The number of listed items
 */
export const itemsCount = async (): Promise<bigint> => {
  const contract = await getContract();
  return await contract.itemsCount();
};

