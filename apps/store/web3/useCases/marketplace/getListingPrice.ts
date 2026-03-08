import { getContract } from '../utils';

/**
 * Get the listing price for listing an item
 * @returns The listing price in tokens
 */
export const getListingPrice = async (): Promise<bigint> => {
  const contract = await getContract();
  return await contract.getListingPrice();
};

