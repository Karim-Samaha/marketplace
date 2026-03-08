import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEther, parseUnits } from "viem";

import { network } from "hardhat";

async function deployContracts(viem: any, owner: any) {
  // Deploy MyToken with owner as initial owner
  const myToken = await viem.deployContract("MyToken", [owner.account.address]);
  
  // Deploy Token contract with owner and token address
  const token = await viem.deployContract("TokenContract", [
    owner.account.address,
    myToken.address,
  ]);

  // Mint tokens to Token contract so it has tokens to sell
  const mintAmount = parseUnits("1000000", 18); // 1M tokens
  await myToken.write.mint([token.address, mintAmount], {
    account: owner.account,
  });

  return { token, myToken };
}

describe("Token", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [owner, buyer, seller, other] = await viem.getWalletClients();

  describe("Constructor", function () {
    it("Should set the owner correctly", async function () {
      const { token } = await deployContracts(viem, owner);
      const contractOwner = await token.read.owner();
      assert.equal(contractOwner.toLowerCase(), owner.account.address.toLowerCase());
    });

    it("Should set the token address correctly", async function () {
      const { token, myToken } = await deployContracts(viem, owner);
      const tokenAddress = await token.read.token();
      assert.equal(tokenAddress.toLowerCase(), myToken.address.toLowerCase());
    });

    it("Should set initial token price to 1 wei", async function () {
      const { token } = await deployContracts(viem, owner);
      const price = await token.read.tokenPriceInWei();
      assert.equal(price, 1n);
    });
  });

  describe("setTokenPrice", function () {
    it("Should update token price when called by owner", async function () {
      const { token } = await deployContracts(viem, owner);
      const newPrice = parseEther("0.001");
      await token.write.setTokenPrice([newPrice], {
        account: owner.account,
      });

      const price = await token.read.getTokenPrice();
      assert.equal(price, newPrice);
    });

    it("Should revert when called by non-owner", async function () {
      const { token } = await deployContracts(viem, owner);
      const newPrice = parseEther("0.001");
      
      await assert.rejects(
        token.write.setTokenPrice([newPrice], {
          account: buyer.account,
        }),
        /Only owner can call this function/
      );
    });

    it("Should allow updating price multiple times", async function () {
      const { token } = await deployContracts(viem, owner);
      const price1 = parseEther("0.001");
      const price2 = parseEther("0.002");
      
      await token.write.setTokenPrice([price1], {
        account: owner.account,
      });
      assert.equal(await token.read.getTokenPrice(), price1);

      await token.write.setTokenPrice([price2], {
        account: owner.account,
      });
      assert.equal(await token.read.getTokenPrice(), price2);
    });
  });

  describe("getTokenPrice", function () {
    it("Should return the current token price", async function () {
      const { token } = await deployContracts(viem, owner);
      const price = parseEther("0.001");
      await token.write.setTokenPrice([price], {
        account: owner.account,
      });

      const currentPrice = await token.read.getTokenPrice();
      assert.equal(currentPrice, price);
    });
  });

  describe("getTotalSupply", function () {
    it("Should return the total supply of the token", async function () {
      const { token, myToken } = await deployContracts(viem, owner);
      const supply = await token.read.getTotalSupply();
      const actualSupply = await myToken.read.totalSupply();
      assert.equal(supply, actualSupply);
    });
  });

  describe("getBalance", function () {
    it("Should return the balance of msg.sender", async function () {
      const { token, myToken } = await deployContracts(viem, owner);
      const price = parseEther("0.001");
      await token.write.setTokenPrice([price], {
        account: owner.account,
      });

      // Buy tokens using the Token contract (which transfers them from its balance)
      const payment = parseEther("1");
      const expectedTokens = payment / price;
      await token.write.buyToken({
        account: buyer.account,
        value: payment,
      });

      const balance = await token.read.getBalance({
        account: buyer.account,
      });
      assert.equal(balance, expectedTokens);
    });
  });

  describe("buyToken", function () {
    it("Should transfer tokens when payment is sufficient", async function () {
      const { token, myToken } = await deployContracts(viem, owner);
      const price = parseEther("0.001");
      await token.write.setTokenPrice([price], {
        account: owner.account,
      });

      const payment = parseEther("1"); // 1 ETH
      const expectedTokens = payment / price; // 1000 tokens

      const initialBalance = await myToken.read.balanceOf([buyer.account.address]);

      await token.write.buyToken({
        account: buyer.account,
        value: payment,
      });

      const finalBalance = await myToken.read.balanceOf([buyer.account.address]);
      assert.equal(finalBalance - initialBalance, expectedTokens);
    });

    it("Should revert when payment is less than token price", async function () {
      const { token } = await deployContracts(viem, owner);
      const price = parseEther("0.001");
      await token.write.setTokenPrice([price], {
        account: owner.account,
      });

      const insufficientPayment = price - 1n; // Less than price

      await assert.rejects(
        token.write.buyToken({
          account: buyer.account,
          value: insufficientPayment,
        }),
        /Insufficient funds/
      );
    });

    it("Should revert when payment is 0", async function () {
      const { token } = await deployContracts(viem, owner);
      const price = parseEther("0.001");
      await token.write.setTokenPrice([price], {
        account: owner.account,
      });

      await assert.rejects(
        token.write.buyToken({
          account: buyer.account,
          value: 0n,
        }),
        /Insufficient funds/
      );
    });

    it("Should work correctly with exact token price payment", async function () {
      const { token, myToken } = await deployContracts(viem, owner);
      const price = parseEther("0.001");
      await token.write.setTokenPrice([price], {
        account: owner.account,
      });

      const initialBalance = await myToken.read.balanceOf([buyer.account.address]);

      const result = await token.write.buyToken({
        account: buyer.account,
        value: price,
      });

      const finalBalance = await myToken.read.balanceOf([buyer.account.address]);
      assert.equal(finalBalance - initialBalance, 1n); // Should get exactly 1 token
    });

    it("Should emit TokenBought event", async function () {
      const { token, myToken } = await deployContracts(viem, owner);
      const price = parseEther("0.001");
      await token.write.setTokenPrice([price], {
        account: owner.account,
      });

      const payment = parseEther("1");
      const expectedTokens = payment / price;

      const txHash = await token.write.buyToken({
        account: buyer.account,
        value: payment,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      // Check that logs were emitted (at least one log from our contract)
      const contractLogs = receipt.logs.filter(log => 
        log.address.toLowerCase() === token.address.toLowerCase()
      );
      assert.ok(contractLogs.length > 0, "TokenBought event should be emitted");
    });

    it("Should return true on successful purchase", async function () {
      const { token } = await deployContracts(viem, owner);
      const price = parseEther("0.001");
      await token.write.setTokenPrice([price], {
        account: owner.account,
      });

      // Use simulate to get return value
      const { result } = await token.simulate.buyToken({
        account: buyer.account,
        value: price,
      });

      assert.equal(result, true);
    });

    it("Should return excess payment to buyer", async function () {
      const { token, myToken } = await deployContracts(viem, owner);
      const price = parseEther("0.001");
      await token.write.setTokenPrice([price], {
        account: owner.account,
      });

      // Use a payment that doesn't divide evenly to create excess
      const payment = parseEther("1.5001"); // 1.5001 ETH
      const expectedTokens = payment / price; // 1500 tokens (integer division)
      const expectedExcess = payment - (expectedTokens * price); // Should be 0.0001 ETH

      const initialBalance = await publicClient.getBalance({
        address: buyer.account.address,
      });

      const txHash = await token.write.buyToken({
        account: buyer.account,
        value: payment,
      });

      // Wait for transaction to be mined
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      // Verify tokens were transferred correctly
      const tokenBalance = await myToken.read.balanceOf([buyer.account.address]);
      assert.equal(tokenBalance, expectedTokens);

      // Verify excess is stored in availableForUsersToWithdraw (pull payment model)
      const availableToWithdraw = await token.read.availableForUsersToWithdraw([buyer.account.address]);
      assert.equal(availableToWithdraw, expectedExcess, "Excess should be stored in availableForUsersToWithdraw");

      // Now withdraw the excess
      const withdrawTxHash = await token.write.userWithdraw({
        account: buyer.account,
      });

      // Wait for withdrawal transaction to be mined and get receipt for gas calculation
      const withdrawReceipt = await publicClient.waitForTransactionReceipt({ hash: withdrawTxHash });
      const gasPrice = withdrawReceipt.effectiveGasPrice || 0n;
      const gasCost = withdrawReceipt.gasUsed * gasPrice;

      const finalBalance = await publicClient.getBalance({
        address: buyer.account.address,
      });

      // Verify excess was withdrawn (accounting for gas)
      // finalBalance = initialBalance - payment - buyGasCost + expectedExcess - withdrawGasCost
      // balanceChange = -payment + expectedExcess - totalGasCost
      const balanceChange = finalBalance - initialBalance;
      // The balance change should be approximately: -payment + expectedExcess - totalGasCost
      // So balanceChange should be > -payment (allowing for gas costs)
      assert.ok(balanceChange > -payment - 1000000n, "Excess should be withdrawable by buyer");

      // Verify availableForUsersToWithdraw is now 0
      const remainingAvailable = await token.read.availableForUsersToWithdraw([buyer.account.address]);
      assert.equal(remainingAvailable, 0n, "availableForUsersToWithdraw should be reset to 0 after withdrawal");
    });
  });

  describe("sellToken", function () {
    it("Should burn tokens and send ether when conditions are met", async function () {
      const { token, myToken } = await deployContracts(viem, owner);
      const price = parseEther("0.001");
      await token.write.setTokenPrice([price], {
        account: owner.account,
      });

      // First, buyer buys some tokens
      const buyAmount = parseEther("1");
      await token.write.buyToken({
        account: buyer.account,
        value: buyAmount,
      });

      const tokensToSell = 500n;
      const expectedEther = tokensToSell * price;

      // Approve token contract to spend tokens
      await myToken.write.approve([token.address, tokensToSell], {
        account: buyer.account,
      });

      const initialTokenBalance = await myToken.read.balanceOf([buyer.account.address]);
      const initialEtherBalance = await publicClient.getBalance({
        address: buyer.account.address,
      });

      const txHash = await token.write.sellToken([tokensToSell], {
        account: buyer.account,
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });

      const finalTokenBalance = await myToken.read.balanceOf([buyer.account.address]);
      const finalEtherBalance = await publicClient.getBalance({
        address: buyer.account.address,
      });

      assert.equal(initialTokenBalance - finalTokenBalance, tokensToSell);
      // Ether balance should increase (accounting for gas)
      assert.ok(finalEtherBalance > initialEtherBalance - expectedEther);
    });

    it("Should revert when contract has insufficient liquidity", async function () {
      const { token, myToken } = await deployContracts(viem, owner);
      const price = parseEther("0.001");
      await token.write.setTokenPrice([price], {
        account: owner.account,
      });

      // Buyer buys tokens
      const buyAmount = parseEther("1");
      await token.write.buyToken({
        account: buyer.account,
        value: buyAmount,
      });

      const tokensToSell = 2000n; // More than contract can pay for
      
      await myToken.write.approve([token.address, tokensToSell], {
        account: buyer.account,
      });

      await assert.rejects(
        token.write.sellToken([tokensToSell], {
          account: buyer.account,
        }),
        /Insufficient contract liquidity/
      );
    });

    it("Should revert when seller has insufficient balance", async function () {
      const { token, myToken } = await deployContracts(viem, owner);
      const price = parseEther("0.001");
      await token.write.setTokenPrice([price], {
        account: owner.account,
      });

      // Add liquidity to contract first (so liquidity check passes)
      await token.write.buyToken({
        account: buyer.account,
        value: parseEther("1"),
      });

      const tokensToSell = 1000n;
      
      await myToken.write.approve([token.address, tokensToSell], {
        account: seller.account,
      });

      await assert.rejects(
        token.write.sellToken([tokensToSell], {
          account: seller.account,
        }),
        /Insufficient balance/
      );
    });

    it("Should revert when allowance is insufficient", async function () {
      const { token, myToken } = await deployContracts(viem, owner);
      const price = parseEther("0.001");
      await token.write.setTokenPrice([price], {
        account: owner.account,
      });

      // Buyer buys tokens
      const buyAmount = parseEther("1");
      await token.write.buyToken({
        account: buyer.account,
        value: buyAmount,
      });

      const tokensToSell = 500n;
      // Don't approve or approve less than needed
      await myToken.write.approve([token.address, tokensToSell - 1n], {
        account: buyer.account,
      });

      await assert.rejects(
        token.write.sellToken([tokensToSell], {
          account: buyer.account,
        }),
        /Insufficient allowance/
      );
    });

    it("Should allow selling 0 tokens (edge case)", async function () {
      const { token, myToken } = await deployContracts(viem, owner);
      const price = parseEther("0.001");
      await token.write.setTokenPrice([price], {
        account: owner.account,
      });

      // Buyer buys tokens
      const buyAmount = parseEther("1");
      await token.write.buyToken({
        account: buyer.account,
        value: buyAmount,
      });

      const initialTokenBalance = await myToken.read.balanceOf([buyer.account.address]);
      const initialEtherBalance = await publicClient.getBalance({
        address: buyer.account.address,
      });

      await myToken.write.approve([token.address, 0n], {
        account: buyer.account,
      });

      // Selling 0 tokens should succeed (though not very useful)
      const txHash = await token.write.sellToken([0n], {
        account: buyer.account,
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });

      const finalTokenBalance = await myToken.read.balanceOf([buyer.account.address]);
      const finalEtherBalance = await publicClient.getBalance({
        address: buyer.account.address,
      });

      // Balances should remain unchanged (accounting for gas)
      assert.equal(finalTokenBalance, initialTokenBalance);
      // Ether balance should decrease only by gas costs
      assert.ok(finalEtherBalance <= initialEtherBalance);
    });

    it("Should emit TokenSold event", async function () {
      const { token, myToken } = await deployContracts(viem, owner);
      const price = parseEther("0.001");
      await token.write.setTokenPrice([price], {
        account: owner.account,
      });

      // Buyer buys tokens
      const buyAmount = parseEther("1");
      await token.write.buyToken({
        account: buyer.account,
        value: buyAmount,
      });

      const tokensToSell = 500n;
      await myToken.write.approve([token.address, tokensToSell], {
        account: buyer.account,
      });

      const txHash = await token.write.sellToken([tokensToSell], {
        account: buyer.account,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      // Check that logs were emitted (at least one log from our contract)
      const contractLogs = receipt.logs.filter(log => 
        log.address.toLowerCase() === token.address.toLowerCase()
      );
      assert.ok(contractLogs.length > 0, "TokenSold event should be emitted");
    });

    it("Should return true on successful sale", async function () {
      const { token, myToken } = await deployContracts(viem, owner);
      const price = parseEther("0.001");
      await token.write.setTokenPrice([price], {
        account: owner.account,
      });

      // Buyer buys tokens
      const buyAmount = parseEther("1");
      await token.write.buyToken({
        account: buyer.account,
        value: buyAmount,
      });

      const tokensToSell = 500n;
      await myToken.write.approve([token.address, tokensToSell], {
        account: buyer.account,
      });

      // Use simulate to get return value
      const { result } = await token.simulate.sellToken([tokensToSell], {
        account: buyer.account,
      });

      assert.equal(result, true);
    });
  });

  describe("withdraw", function () {
    it("Should withdraw ether to owner when called by owner", async function () {
      const { token } = await deployContracts(viem, owner);
      const price = parseEther("0.001");
      await token.write.setTokenPrice([price], {
        account: owner.account,
      });

      // Add some ether to contract by buying tokens
      const buyAmount = parseEther("1");
      await token.write.buyToken({
        account: buyer.account,
        value: buyAmount,
      });

      const withdrawAmount = parseEther("0.5");
      const initialOwnerBalance = await publicClient.getBalance({
        address: owner.account.address,
      });

      const txHash = await token.write.withdraw([withdrawAmount], {
        account: owner.account,
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });

      const finalOwnerBalance = await publicClient.getBalance({
        address: owner.account.address,
      });

      // Owner should receive the withdrawn amount (accounting for gas)
      assert.ok(finalOwnerBalance > initialOwnerBalance);
    });

    it("Should revert when called by non-owner", async function () {
      const { token } = await deployContracts(viem, owner);
      const withdrawAmount = parseEther("0.1");

      await assert.rejects(
        token.write.withdraw([withdrawAmount], {
          account: buyer.account,
        }),
        /Only owner can call this function/
      );
    });

    it("Should revert when contract has insufficient balance", async function () {
      const { token } = await deployContracts(viem, owner);
      const withdrawAmount = parseEther("1");

      await assert.rejects(
        token.write.withdraw([withdrawAmount], {
          account: owner.account,
        }),
        /Insufficient balance/
      );
    });

    it("Should allow withdrawing 0 amount when contract has balance", async function () {
      const { token } = await deployContracts(viem, owner);
      const price = parseEther("0.001");
      await token.write.setTokenPrice([price], {
        account: owner.account,
      });

      // Add some ether to contract
      await token.write.buyToken({
        account: buyer.account,
        value: parseEther("1"),
      });

      // Withdrawing 0 should succeed (though not very useful)
      await token.write.withdraw([0n], {
        account: owner.account,
      });

      assert.ok(true); // If we reach here, it succeeded
    });

    it("Should return true on successful withdrawal", async function () {
      const { token } = await deployContracts(viem, owner);
      const price = parseEther("0.001");
      await token.write.setTokenPrice([price], {
        account: owner.account,
      });

      // Add some ether to contract by buying tokens
      const buyAmount = parseEther("1");
      await token.write.buyToken({
        account: buyer.account,
        value: buyAmount,
      });

      const withdrawAmount = parseEther("0.5");

      // Use simulate to get return value
      const { result } = await token.simulate.withdraw([withdrawAmount], {
        account: owner.account,
      });

      assert.equal(result, true);
    });
  });

  describe("receive", function () {
    it("Should accept ether sent directly to contract", async function () {
      const { token } = await deployContracts(viem, owner);
      const sendAmount = parseEther("1");

      const initialBalance = await publicClient.getBalance({
        address: token.address,
      });

      // Send ether directly to contract
      await buyer.sendTransaction({
        to: token.address,
        value: sendAmount,
      });

      const finalBalance = await publicClient.getBalance({
        address: token.address,
      });

      assert.equal(finalBalance - initialBalance, sendAmount);
    });
  });
});
