/**
 * Get the currently connected MetaMask account
 * @returns The connected account address, or null if not connected
 */
export const getCurrentAccount = async (): Promise<string | null> => {
  // @ts-ignore
  if (typeof window !== 'undefined' && !window?.ethereum) {
    return null;
  }

  try {
    // @ts-ignore
    const accounts = await window?.ethereum?.request({
      method: 'eth_accounts',
    }) as string[];

    if (accounts && accounts.length > 0) {
      return accounts[0];
    }

    return null;
  } catch (error) {
    console.error('Error getting current account:', error);
    return null;
  }
};

