import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("TokenModule", (m) => {
  // Get the deployer account as the owner
  const owner = m.getAccount(0);
  
  const token = m.contract("MyToken", [owner]);

  return { token };
});
