import { Contract } from 'ethers';
import { ethers } from 'ethers';
import { nftMarketplaceABI, nftMarketplaceAddress, tokenABI, tokenAddress } from '@/web3/config';

/**
 * Get an instance of the Factory contract
 */

export const getProvider = (): ethers.BrowserProvider | null => {
  // @ts-ignore
  if (typeof window !== 'undefined' && window.ethereum) {
    // @ts-ignore
    return new ethers.BrowserProvider(window.ethereum);
  }
  return null;
};

// Get signer from provider
export const getSigner = async (): Promise<ethers.JsonRpcSigner | null> => {
  const provider = getProvider();
  if (!provider) {
    throw new Error('No provider found. Please install MetaMask or another Web3 wallet.');
  }
  return await provider.getSigner();
};


/**
 * Get an instance of the NFT Marketplace contract
 * @returns NFT Marketplace contract instance with signer
 */
export const getContract = async (): Promise<Contract> => {
  const signer = await getSigner();
  if (!signer) {
    throw new Error('No signer found. Please install MetaMask or another Web3 wallet.');
  }

  return new Contract(
    nftMarketplaceAddress,
    nftMarketplaceABI,
    signer
  );
};

/**
 * Get an instance of the Token contract
 * @returns Token contract instance with signer
 */
export const getTokenContract = async (): Promise<Contract> => {
  const signer = await getSigner();
  if (!signer) {
    throw new Error('No signer found. Please install MetaMask or another Web3 wallet.');
  }

  return new Contract(
    tokenAddress,
    tokenABI,
    signer
  );
};









