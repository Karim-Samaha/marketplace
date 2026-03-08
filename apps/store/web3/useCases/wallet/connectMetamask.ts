/**
 * Connect to MetaMask wallet
 * @returns The connected account address
 * @throws Error if MetaMask is not installed or connection fails
 */
export const connectMetamask = async (): Promise<string> => {
  //@ts-ignore
  if (typeof window !== 'undefined' && !window.ethereum) {
    throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
  }

  try {
    // Request account access
    // @ts-ignore
    const accounts = await window?.ethereum?.request({
      method: 'eth_requestAccounts',
    }) as string[];

    if (accounts && accounts.length > 0) {
      return accounts[0];
    }

    throw new Error('No accounts found');
  } catch (error: any) {
    if (error.code === 4001) {
      // User rejected the request
      throw new Error('Please connect to MetaMask.');
    }
    throw new Error(`Failed to connect to MetaMask: ${error.message}`);
  }
};

