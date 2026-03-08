import { getContract } from '../utils';

/**
 * Get a listed item by index
 * @param index - The index of the listed item
 * @returns The Item struct with token details
 */
export const listedItems = async (index: bigint): Promise<any> => {
  const contract = await getContract();
  return await contract.listedItems(index);
};

