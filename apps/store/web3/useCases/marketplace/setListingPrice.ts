import { getContract } from '../utils';

/**
 * Set the listing price (owner only)
 * @param listingPriceInToken - The new listing price in tokens
 * @returns Transaction receipt
 */
export const setListingPrice = async (
  listingPriceInToken: bigint,
): Promise<any> => {
  const contract = await getContract();
  const tx = await contract.setListingPrice(listingPriceInToken);
  return await tx.wait();
};

