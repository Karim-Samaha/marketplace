import { getContract } from '../utils';

/**
 * Get the listing price in tokens
 * @returns The listing price in tokens
 */
export const listingPriceInToken = async (): Promise<bigint> => {
  const contract = await getContract();
  return await contract.listingPriceInToken();
};

