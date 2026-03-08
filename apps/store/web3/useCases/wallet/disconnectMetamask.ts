/**
 * Disconnect from MetaMask wallet
 * Note: MetaMask doesn't have a native disconnect method, but we can
 * clear the account from the app's state. The actual wallet connection
 * persists in MetaMask until the user manually disconnects.
 * 
 * This function can be used to clear the account state in your application.
 * @returns void
 */
export const disconnectMetamask = async (): Promise<void> => {
  // Note: MetaMask doesn't provide a way to programmatically disconnect
  // The connection persists until the user manually disconnects in MetaMask
  // This function is here for consistency and can be used to clear app state
  
  // If you want to try to disconnect, you can attempt to reset the accounts
  // However, this won't actually disconnect from MetaMask
  // @ts-ignore
  if (typeof window !== 'undefined' && window?.ethereum) {
    try {
      // Some wallets support wallet_disconnect, but MetaMask doesn't
      // This is a no-op for MetaMask, but included for completeness
      // @ts-ignore
      await window?.ethereum?.request({
        method: 'wallet_disconnect',
      }).catch(() => {
        // MetaMask doesn't support this method, which is expected
      });
    } catch (error) {
      // Ignore errors as MetaMask doesn't support programmatic disconnection
    }
  }
};

