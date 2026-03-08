import { getProvider } from '../utils/getContract';
/**
 * Get the wallet balance in ETH for a given address
 * @param address The wallet address to get the balance for
 * @returns The balance in wei (as bigint), or null if unable to fetch
 */
export const getWalletBalance = async (address: string): Promise<bigint | null> => {
  const provider = getProvider();
  if (!provider || !address) {
    return null;
  }

  try {
    const balance = await provider.getBalance(address);
    return balance;
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    return null;
  }
};

