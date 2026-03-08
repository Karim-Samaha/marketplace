import { getContract } from '../utils';

/**
 * List a token on the marketplace
 * @param priceInToken - The price in tokens
 * @param uri - The token URI
 * @returns Transaction receipt with the Item struct
 */
export const listToken = async (
  priceInToken: bigint,
  uri: string,
): Promise<any> => {
  const contract = await getContract();
  const tx = await contract.listToken(priceInToken, uri);
  return await tx.wait();
};

