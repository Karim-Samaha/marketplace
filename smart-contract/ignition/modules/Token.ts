import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("IcoTokenModule", (m) => {
  // Get the deployer account as the owner
  const owner = m.getAccount(0);
  
  // First deploy the MyToken contract
  const erc20 = m.contract("MyToken", [owner]);
  
  // Then deploy Token with owner and token address
  const token = m.contract("TokenContract", [owner, erc20]);

  return { token, erc20 };
});
