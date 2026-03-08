import { Contract, Signer, Provider } from 'ethers';

export interface ContractConfig {
  signerOrProvider: Signer | Provider;
}

export interface IcoContractInstance extends Contract {

}


