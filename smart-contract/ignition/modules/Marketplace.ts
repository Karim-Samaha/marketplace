import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MarketplaceModule", (m) => {
  // Get the deployer account as the owner
  const owner = m.getAccount(0);

  // First deploy the ERC20 token (MyToken)
  const erc20 = m.contract("MyToken", [owner]);

  // Then deploy the ERC721 token (RealEstate)
  const erc721 = m.contract("NFT", [owner]);

  // Finally deploy Marketplace with owner, ERC20 address, and ERC721 address
  const marketplace = m.contract("Marketplace", [owner, erc20, erc721]);

  return { marketplace, erc20, erc721 };
});
