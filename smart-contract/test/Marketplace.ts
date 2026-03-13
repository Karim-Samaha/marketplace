import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEther, parseUnits } from "viem";

import { network } from "hardhat";

async function deployContracts(viem: any, owner: any) {
  // Deploy MyToken (ERC20) with owner as initial owner
  const myToken = await viem.deployContract("MyToken", [owner.account.address]);
  
  // Deploy NFT (ERC721) with owner as initial owner
  // We'll transfer ownership to Marketplace after deployment
  const nft = await viem.deployContract("NFT", [owner.account.address]);
  
  // Deploy Marketplace with owner, token address, and NFT address
  const marketplace = await viem.deployContract("Marketplace", [
    owner.account.address,
    myToken.address,
    nft.address,
  ]);

  // Transfer NFT ownership to Marketplace so it can mint tokens
  await nft.write.transferOwnership([marketplace.address], {
    account: owner.account,
  });

  // Mint some tokens to users for testing
  const mintAmount = parseUnits("1000000", 18); // 1M tokens
  await myToken.write.mint([owner.account.address, mintAmount], {
    account: owner.account,
  });

  return { marketplace, myToken, nft, owner };
}

describe("Marketplace", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [owner, seller, buyer, other] = await viem.getWalletClients();

  describe("Constructor", function () {
    it("Should set the owner correctly", async function () {
      const { marketplace } = await deployContracts(viem, owner);
      const contractOwner = await marketplace.read.owner();
      assert.equal(contractOwner.toLowerCase(), owner.account.address.toLowerCase());
    });

    it("Should set the token address correctly", async function () {
      const { marketplace, myToken } = await deployContracts(viem, owner);
      const tokenAddress = await marketplace.read.token();
      assert.equal(tokenAddress.toLowerCase(), myToken.address.toLowerCase());
    });

    it("Should set the ERC721 token address correctly", async function () {
      const { marketplace, nft } = await deployContracts(viem, owner);
      const erc721TokenAddress = await marketplace.read.erc721Token();
      assert.equal(erc721TokenAddress.toLowerCase(), nft.address.toLowerCase());
    });

    it("Should set initial listing price to 1", async function () {
      const { marketplace } = await deployContracts(viem, owner);
      const listingPrice = await marketplace.read.listingPriceInToken();
      assert.equal(listingPrice, 1n);
    });

    it("Should set initial items count to 0", async function () {
      const { marketplace } = await deployContracts(viem, owner);
      const itemsCount = await marketplace.read.itemsCount();
      assert.equal(itemsCount, 0n);
    });
  });

  describe("setListingPrice", function () {
    it("Should update listing price when called by owner", async function () {
      const { marketplace } = await deployContracts(viem, owner);
      const newPrice = parseEther("10");
      await marketplace.write.setListingPrice([newPrice], {
        account: owner.account,
      });

      const price = await marketplace.read.getListingPrice();
      assert.equal(price, newPrice);
    });

    it("Should revert when called by non-owner", async function () {
      const { marketplace } = await deployContracts(viem, owner);
      const newPrice = parseEther("10");
      
      await assert.rejects(
        marketplace.write.setListingPrice([newPrice], {
          account: seller.account,
        }),
        /Only owner can call this function/
      );
    });

    it("Should allow updating price multiple times", async function () {
      const { marketplace } = await deployContracts(viem, owner);
      const price1 = parseEther("10");
      const price2 = parseEther("20");
      
      await marketplace.write.setListingPrice([price1], {
        account: owner.account,
      });
      assert.equal(await marketplace.read.getListingPrice(), price1);

      await marketplace.write.setListingPrice([price2], {
        account: owner.account,
      });
      assert.equal(await marketplace.read.getListingPrice(), price2);
    });
  });

  describe("getListingPrice", function () {
    it("Should return the current listing price", async function () {
      const { marketplace } = await deployContracts(viem, owner);
      const price = parseEther("15");
      await marketplace.write.setListingPrice([price], {
        account: owner.account,
      });

      const currentPrice = await marketplace.read.getListingPrice();
      assert.equal(currentPrice, price);
    });
  });

  describe("listToken", function () {
    it("Should list token when conditions are met", async function () {
      const { marketplace, myToken, nft, owner: deployOwner } = await deployContracts(viem, owner);
      const listingPrice = parseEther("1");
      await marketplace.write.setListingPrice([listingPrice], {
        account: owner.account,
      });

      // Create a collection to list NFTs into
      await marketplace.write.createCollection(["Default Collection", "Test collection"], {
        account: owner.account,
      });
      const collectionId = 0n; // first collection has id 0

      // Mint tokens to seller
      const sellerTokenAmount = parseEther("1000");
      await myToken.write.mint([seller.account.address, sellerTokenAmount], {
        account: deployOwner.account,
      });

      // Seller approves marketplace to spend tokens
      await myToken.write.approve([marketplace.address, listingPrice], {
        account: seller.account,
      });

      const priceInToken = parseEther("100");
      const uri = "https://example.com/token/1";

      const initialItemsCount = await marketplace.read.itemsCount();
      const initialSellerBalance = await myToken.read.balanceOf([seller.account.address]);
      const initialMarketplaceBalance = await myToken.read.balanceOf([marketplace.address]);

      const result = await marketplace.write.listToken([collectionId, priceInToken, uri], {
        account: seller.account,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: result });
      const finalItemsCount = await marketplace.read.itemsCount();
      const finalSellerBalance = await myToken.read.balanceOf([seller.account.address]);
      const finalMarketplaceBalance = await myToken.read.balanceOf([marketplace.address]);

      assert.equal(finalItemsCount, initialItemsCount + 1n);
      assert.equal(initialSellerBalance - finalSellerBalance, listingPrice);
      assert.equal(finalMarketplaceBalance - initialMarketplaceBalance, listingPrice);

      // Check that NFT was minted to seller
      const tokenId = await nft.read.nextTokenId() - 1n;
      const nftOwner = await nft.read.ownerOf([tokenId]);
      assert.equal(nftOwner.toLowerCase(), seller.account.address.toLowerCase());
    });

    it("Should revert when allowance is insufficient", async function () {
      const { marketplace, myToken, owner: deployOwner } = await deployContracts(viem, owner);
      const listingPrice = parseEther("1");
      await marketplace.write.setListingPrice([listingPrice], {
        account: owner.account,
      });

      await marketplace.write.createCollection(["Default Collection", "Test collection"], {
        account: owner.account,
      });
      const collectionId = 0n;

      // Mint tokens to seller
      const sellerTokenAmount = parseEther("1000");
      await myToken.write.mint([seller.account.address, sellerTokenAmount], {
        account: deployOwner.account,
      });

      // Approve less than required
      await myToken.write.approve([marketplace.address, listingPrice - 1n], {
        account: seller.account,
      });

      const priceInToken = parseEther("100");
      const uri = "https://example.com/token/1";

      await assert.rejects(
        marketplace.write.listToken([collectionId, priceInToken, uri], {
          account: seller.account,
        }),
        /Approve Marketplace to spend tokens first/
      );
    });

    it("Should revert when no approval is given", async function () {
      const { marketplace, myToken, owner: deployOwner } = await deployContracts(viem, owner);
      const listingPrice = parseEther("1");
      await marketplace.write.setListingPrice([listingPrice], {
        account: owner.account,
      });

      await marketplace.write.createCollection(["Default Collection", "Test collection"], {
        account: owner.account,
      });
      const collectionId = 0n;

      // Mint tokens to seller
      const sellerTokenAmount = parseEther("1000");
      await myToken.write.mint([seller.account.address, sellerTokenAmount], {
        account: deployOwner.account,
      });

      const priceInToken = parseEther("100");
      const uri = "https://example.com/token/1";

      await assert.rejects(
        marketplace.write.listToken([collectionId, priceInToken, uri], {
          account: seller.account,
        }),
        /Approve Marketplace to spend tokens first/
      );
    });

    it("Should emit ItemListed event", async function () {
      const { marketplace, myToken, owner: deployOwner } = await deployContracts(viem, owner);
      const listingPrice = parseEther("1");
      await marketplace.write.setListingPrice([listingPrice], {
        account: owner.account,
      });

      await marketplace.write.createCollection(["Default Collection", "Test collection"], {
        account: owner.account,
      });
      const collectionId = 0n;

      // Mint tokens to seller
      const sellerTokenAmount = parseEther("1000");
      await myToken.write.mint([seller.account.address, sellerTokenAmount], {
        account: deployOwner.account,
      });

      await myToken.write.approve([marketplace.address, listingPrice], {
        account: seller.account,
      });

      const priceInToken = parseEther("100");
      const uri = "https://example.com/token/1";

      const txHash = await marketplace.write.listToken([collectionId, priceInToken, uri], {
        account: seller.account,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      const contractLogs = receipt.logs.filter(log => 
        log.address.toLowerCase() === marketplace.address.toLowerCase()
      );
      assert.ok(contractLogs.length > 0, "ItemListed event should be emitted");
    });

    it("Should return the listed item", async function () {
      const { marketplace, myToken, nft, owner: deployOwner } = await deployContracts(viem, owner);
      const listingPrice = parseEther("1");
      await marketplace.write.setListingPrice([listingPrice], {
        account: owner.account,
      });

      await marketplace.write.createCollection(["Default Collection", "Test collection"], {
        account: owner.account,
      });
      const collectionId = 0n;

      // Mint tokens to seller
      const sellerTokenAmount = parseEther("1000");
      await myToken.write.mint([seller.account.address, sellerTokenAmount], {
        account: deployOwner.account,
      });

      await myToken.write.approve([marketplace.address, listingPrice], {
        account: seller.account,
      });

      const priceInToken = parseEther("100");
      const uri = "https://example.com/token/1";

      const { result } = await marketplace.simulate.listToken([collectionId, priceInToken, uri], {
        account: seller.account,
      });

      const tokenId = await nft.read.nextTokenId();
      assert.equal(result.tokenId, tokenId);
      assert.equal(result.priceInToken, priceInToken);
      assert.equal(result.uri, uri);
      assert.equal(result.seller.toLowerCase(), seller.account.address.toLowerCase());
      assert.equal(result.isListed, true);
    });
  });

  describe("getListedItem", function () {
    it("Should return the listed item details", async function () {
      const { marketplace, myToken, nft, owner: deployOwner } = await deployContracts(viem, owner);
      const listingPrice = parseEther("1");
      await marketplace.write.setListingPrice([listingPrice], {
        account: owner.account,
      });

      // Create a collection for the listing
      await marketplace.write.createCollection(["Default Collection", "Test collection"], {
        account: owner.account,
      });
      const collectionId = 0n;

      // Mint tokens to seller
      const sellerTokenAmount = parseEther("1000");
      await myToken.write.mint([seller.account.address, sellerTokenAmount], {
        account: deployOwner.account,
      });

      await myToken.write.approve([marketplace.address, listingPrice], {
        account: seller.account,
      });

      const priceInToken = parseEther("100");
      const uri = "https://example.com/token/1";

      await marketplace.write.listToken([collectionId, priceInToken, uri], {
        account: seller.account,
      });

      const tokenId = await nft.read.nextTokenId() - 1n;
      const item = await marketplace.read.getListedItem([tokenId]);

      assert.equal(item.tokenId, tokenId);
      assert.equal(item.priceInToken, priceInToken);
      assert.equal(item.uri, uri);
      assert.equal(item.seller.toLowerCase(), seller.account.address.toLowerCase());
      assert.equal(item.isListed, true);
    });

    it("Should return empty item for non-existent token", async function () {
      const { marketplace } = await deployContracts(viem, owner);
      const item = await marketplace.read.getListedItem([999n]);
      assert.equal(item.tokenId, 0n);
      assert.equal(item.priceInToken, 0n);
      assert.equal(item.uri, "");
      assert.equal(item.seller, "0x0000000000000000000000000000000000000000");
      assert.equal(item.isListed, false);
    });
  });

  describe("editItemPrice", function () {
    it("Should update price when called by seller", async function () {
      const { marketplace, myToken, nft, owner: deployOwner } = await deployContracts(viem, owner);
      const listingPrice = parseEther("1");
      await marketplace.write.setListingPrice([listingPrice], {
        account: owner.account,
      });

      await marketplace.write.createCollection(["Default Collection", "Test collection"], {
        account: owner.account,
      });
      const collectionId = 0n;

      // Mint tokens to seller
      const sellerTokenAmount = parseEther("1000");
      await myToken.write.mint([seller.account.address, sellerTokenAmount], {
        account: deployOwner.account,
      });

      await myToken.write.approve([marketplace.address, listingPrice], {
        account: seller.account,
      });

      const initialPrice = parseEther("100");
      const uri = "https://example.com/token/1";

      await marketplace.write.listToken([collectionId, initialPrice, uri], {
        account: seller.account,
      });

      const tokenId = await nft.read.nextTokenId() - 1n;
      const newPrice = parseEther("150");

      const { result } = await marketplace.simulate.editItemPrice([tokenId, newPrice], {
        account: seller.account,
      });

      assert.equal(result.priceInToken, newPrice);
    });

    it("Should revert when token is not listed", async function () {
      const { marketplace } = await deployContracts(viem, owner);
      const newPrice = parseEther("150");

      await assert.rejects(
        marketplace.write.editItemPrice([999n, newPrice], {
          account: seller.account,
        }),
        /Token not listed/
      );
    });

    it("Should revert when called by non-seller", async function () {
      const { marketplace, myToken, nft, owner: deployOwner } = await deployContracts(viem, owner);
      const listingPrice = parseEther("1");
      await marketplace.write.setListingPrice([listingPrice], {
        account: owner.account,
      });

      await marketplace.write.createCollection(["Default Collection", "Test collection"], {
        account: owner.account,
      });
      const collectionId = 0n;

      // Mint tokens to seller
      const sellerTokenAmount = parseEther("1000");
      await myToken.write.mint([seller.account.address, sellerTokenAmount], {
        account: deployOwner.account,
      });

      await myToken.write.approve([marketplace.address, listingPrice], {
        account: seller.account,
      });

      const initialPrice = parseEther("100");
      const uri = "https://example.com/token/1";

      await marketplace.write.listToken([collectionId, initialPrice, uri], {
        account: seller.account,
      });

      const tokenId = await nft.read.nextTokenId() - 1n;
      const newPrice = parseEther("150");

      await assert.rejects(
        marketplace.write.editItemPrice([tokenId, newPrice], {
          account: buyer.account,
        }),
        /You are not the owner of the token/
      );
    });

    it("Should return updated item", async function () {
      const { marketplace, myToken, nft, owner: deployOwner } = await deployContracts(viem, owner);
      const listingPrice = parseEther("1");
      await marketplace.write.setListingPrice([listingPrice], {
        account: owner.account,
      });

      await marketplace.write.createCollection(["Default Collection", "Test collection"], {
        account: owner.account,
      });
      const collectionId = 0n;

      // Mint tokens to seller
      const sellerTokenAmount = parseEther("1000");
      await myToken.write.mint([seller.account.address, sellerTokenAmount], {
        account: deployOwner.account,
      });

      await myToken.write.approve([marketplace.address, listingPrice], {
        account: seller.account,
      });

      const initialPrice = parseEther("100");
      const uri = "https://example.com/token/1";

      await marketplace.write.listToken([collectionId, initialPrice, uri], {
        account: seller.account,
      });

      const tokenId = await nft.read.nextTokenId() - 1n;
      const newPrice = parseEther("150");

      const { result } = await marketplace.simulate.editItemPrice([tokenId, newPrice], {
        account: seller.account,
      });

      assert.equal(result.priceInToken, newPrice);
      assert.equal(result.isListed, true);
    });
  });

  describe("removeListedToken", function () {
    it("Should remove token when called by seller", async function () {
      const { marketplace, myToken, nft, owner: deployOwner } = await deployContracts(viem, owner);
      const listingPrice = parseEther("1");
      await marketplace.write.setListingPrice([listingPrice], {
        account: owner.account,
      });

      await marketplace.write.createCollection(["Default Collection", "Test collection"], {
        account: owner.account,
      });
      const collectionId = 0n;

      // Mint tokens to seller
      const sellerTokenAmount = parseEther("1000");
      await myToken.write.mint([seller.account.address, sellerTokenAmount], {
        account: deployOwner.account,
      });

      await myToken.write.approve([marketplace.address, listingPrice], {
        account: seller.account,
      });

      const priceInToken = parseEther("100");
      const uri = "https://example.com/token/1";

      await marketplace.write.listToken([collectionId, priceInToken, uri], {
        account: seller.account,
      });

      const tokenId = await nft.read.nextTokenId() - 1n;
      const initialItemsCount = await marketplace.read.itemsCount();

      await marketplace.write.removeListedToken([tokenId], {
        account: seller.account,
      });

      const finalItemsCount = await marketplace.read.itemsCount();
      const item = await marketplace.read.getListedItem([tokenId]);

      assert.equal(finalItemsCount, initialItemsCount - 1n);
      assert.equal(item.isListed, false);
    });

    it("Should revert when token is not listed", async function () {
      const { marketplace } = await deployContracts(viem, owner);

      await assert.rejects(
        marketplace.write.removeListedToken([999n], {
          account: seller.account,
        }),
        /Token not listed/
      );
    });

    it("Should revert when called by non-seller", async function () {
      const { marketplace, myToken, nft, owner: deployOwner } = await deployContracts(viem, owner);
      const listingPrice = parseEther("1");
      await marketplace.write.setListingPrice([listingPrice], {
        account: owner.account,
      });

      await marketplace.write.createCollection(["Default Collection", "Test collection"], {
        account: owner.account,
      });
      const collectionId = 0n;

      // Mint tokens to seller
      const sellerTokenAmount = parseEther("1000");
      await myToken.write.mint([seller.account.address, sellerTokenAmount], {
        account: deployOwner.account,
      });

      await myToken.write.approve([marketplace.address, listingPrice], {
        account: seller.account,
      });

      const priceInToken = parseEther("100");
      const uri = "https://example.com/token/1";

      await marketplace.write.listToken([collectionId, priceInToken, uri], {
        account: seller.account,
      });

      const tokenId = await nft.read.nextTokenId() - 1n;

      await assert.rejects(
        marketplace.write.removeListedToken([tokenId], {
          account: buyer.account,
        }),
        /You are not the owner of the token/
      );
    });

    it("Should emit ItemRemoved event", async function () {
      const { marketplace, myToken, nft, owner: deployOwner } = await deployContracts(viem, owner);
      const listingPrice = parseEther("1");
      await marketplace.write.setListingPrice([listingPrice], {
        account: owner.account,
      });

      await marketplace.write.createCollection(["Default Collection", "Test collection"], {
        account: owner.account,
      });
      const collectionId = 0n;

      // Mint tokens to seller
      const sellerTokenAmount = parseEther("1000");
      await myToken.write.mint([seller.account.address, sellerTokenAmount], {
        account: deployOwner.account,
      });

      await myToken.write.approve([marketplace.address, listingPrice], {
        account: seller.account,
      });

      const priceInToken = parseEther("100");
      const uri = "https://example.com/token/1";

      await marketplace.write.listToken([collectionId, priceInToken, uri], {
        account: seller.account,
      });

      const tokenId = await nft.read.nextTokenId() - 1n;

      const txHash = await marketplace.write.removeListedToken([tokenId], {
        account: seller.account,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      const contractLogs = receipt.logs.filter(log => 
        log.address.toLowerCase() === marketplace.address.toLowerCase()
      );
      assert.ok(contractLogs.length > 0, "ItemRemoved event should be emitted");
    });

    it("Should return removed item", async function () {
      const { marketplace, myToken, nft, owner: deployOwner } = await deployContracts(viem, owner);
      const listingPrice = parseEther("1");
      await marketplace.write.setListingPrice([listingPrice], {
        account: owner.account,
      });

      await marketplace.write.createCollection(["Default Collection", "Test collection"], {
        account: owner.account,
      });
      const collectionId = 0n;

      // Mint tokens to seller
      const sellerTokenAmount = parseEther("1000");
      await myToken.write.mint([seller.account.address, sellerTokenAmount], {
        account: deployOwner.account,
      });

      await myToken.write.approve([marketplace.address, listingPrice], {
        account: seller.account,
      });

      const priceInToken = parseEther("100");
      const uri = "https://example.com/token/1";

      await marketplace.write.listToken([collectionId, priceInToken, uri], {
        account: seller.account,
      });

      const tokenId = await nft.read.nextTokenId() - 1n;

      const { result } = await marketplace.simulate.removeListedToken([tokenId], {
        account: seller.account,
      });

      assert.equal(result.tokenId, tokenId);
      assert.equal(result.isListed, false);
    });
  });

  describe("buyToken", function () {
    it("Should transfer NFT and tokens when conditions are met", async function () {
      const { marketplace, myToken, nft, owner: deployOwner } = await deployContracts(viem, owner);
      const listingPrice = parseEther("1");
      await marketplace.write.setListingPrice([listingPrice], {
        account: owner.account,
      });

      await marketplace.write.createCollection(["Default Collection", "Test collection"], {
        account: owner.account,
      });
      const collectionId = 0n;

      // Mint tokens to buyer and seller
      const buyerTokenAmount = parseEther("1000");
      await myToken.write.mint([buyer.account.address, buyerTokenAmount], {
        account: deployOwner.account,
      });

      const sellerTokenAmount = parseEther("1000");
      await myToken.write.mint([seller.account.address, sellerTokenAmount], {
        account: deployOwner.account,
      });

      // Seller lists token
      await myToken.write.approve([marketplace.address, listingPrice], {
        account: seller.account,
      });

      const priceInToken = parseEther("100");
      const uri = "https://example.com/token/1";

      await marketplace.write.listToken([collectionId, priceInToken, uri], {
        account: seller.account,
      });

      const tokenId = await nft.read.nextTokenId() - 1n;

      // Seller approves marketplace to transfer NFT
      await nft.write.approve([marketplace.address, tokenId], {
        account: seller.account,
      });

      // Buyer approves marketplace to spend tokens
      await myToken.write.approve([marketplace.address, priceInToken], {
        account: buyer.account,
      });

      const initialBuyerBalance = await myToken.read.balanceOf([buyer.account.address]);
      const initialSellerBalance = await myToken.read.balanceOf([seller.account.address]);
      const initialItemsCount = await marketplace.read.itemsCount();

      await marketplace.write.buyToken([tokenId], {
        account: buyer.account,
      });

      const finalBuyerBalance = await myToken.read.balanceOf([buyer.account.address]);
      const finalSellerBalance = await myToken.read.balanceOf([seller.account.address]);
      const finalItemsCount = await marketplace.read.itemsCount();
      const nftOwner = await nft.read.ownerOf([tokenId]);

      assert.equal(initialBuyerBalance - finalBuyerBalance, priceInToken);
      assert.equal(finalSellerBalance - initialSellerBalance, priceInToken);
      assert.equal(nftOwner.toLowerCase(), buyer.account.address.toLowerCase());
      assert.equal(finalItemsCount, initialItemsCount - 1n);
    });

    it("Should revert when NFT is not approved", async function () {
      const { marketplace, myToken, nft, owner: deployOwner } = await deployContracts(viem, owner);
      const listingPrice = parseEther("1");
      await marketplace.write.setListingPrice([listingPrice], {
        account: owner.account,
      });

      await marketplace.write.createCollection(["Default Collection", "Test collection"], {
        account: owner.account,
      });
      const collectionId = 0n;

      // Mint tokens to buyer and seller
      const buyerTokenAmount = parseEther("1000");
      await myToken.write.mint([buyer.account.address, buyerTokenAmount], {
        account: deployOwner.account,
      });

      const sellerTokenAmount = parseEther("1000");
      await myToken.write.mint([seller.account.address, sellerTokenAmount], {
        account: deployOwner.account,
      });

      await myToken.write.approve([marketplace.address, listingPrice], {
        account: seller.account,
      });

      const priceInToken = parseEther("100");
      const uri = "https://example.com/token/1";

      await marketplace.write.listToken([collectionId, priceInToken, uri], {
        account: seller.account,
      });

      const tokenId = await nft.read.nextTokenId() - 1n;

      await myToken.write.approve([marketplace.address, priceInToken], {
        account: buyer.account,
      });

      await assert.rejects(
        marketplace.write.buyToken([tokenId], {
          account: buyer.account,
        }),
        /Marketplace not approved for NFT/
      );
    });

    it("Should revert when token is not listed", async function () {
      const { marketplace, myToken, nft, owner: deployOwner } = await deployContracts(viem, owner);
      const listingPrice = parseEther("1");
      await marketplace.write.setListingPrice([listingPrice], {
        account: owner.account,
      });

      await marketplace.write.createCollection(["Default Collection", "Test collection"], {
        account: owner.account,
      });
      const collectionId = 0n;

      // Mint tokens to buyer and seller
      const buyerTokenAmount = parseEther("1000");
      await myToken.write.mint([buyer.account.address, buyerTokenAmount], {
        account: deployOwner.account,
      });

      const sellerTokenAmount = parseEther("1000");
      await myToken.write.mint([seller.account.address, sellerTokenAmount], {
        account: deployOwner.account,
      });

      await myToken.write.approve([marketplace.address, listingPrice], {
        account: seller.account,
      });

      const priceInToken = parseEther("100");
      const uri = "https://example.com/token/1";

      await marketplace.write.listToken([collectionId, priceInToken, uri], {
        account: seller.account,
      });

      const tokenId = await nft.read.nextTokenId() - 1n;

      // Remove the listing
      await marketplace.write.removeListedToken([tokenId], {
        account: seller.account,
      });

      await nft.write.approve([marketplace.address, tokenId], {
        account: seller.account,
      });

      await myToken.write.approve([marketplace.address, priceInToken], {
        account: buyer.account,
      });

      await assert.rejects(
        marketplace.write.buyToken([tokenId], {
          account: buyer.account,
        }),
        /Token not listed/
      );
    });

    it("Should revert when seller no longer owns NFT", async function () {
      const { marketplace, myToken, nft, owner: deployOwner } = await deployContracts(viem, owner);
      const listingPrice = parseEther("1");
      await marketplace.write.setListingPrice([listingPrice], {
        account: owner.account,
      });

      await marketplace.write.createCollection(["Default Collection", "Test collection"], {
        account: owner.account,
      });
      const collectionId = 0n;

      // Mint tokens to buyer and seller
      const buyerTokenAmount = parseEther("1000");
      await myToken.write.mint([buyer.account.address, buyerTokenAmount], {
        account: deployOwner.account,
      });

      const sellerTokenAmount = parseEther("1000");
      await myToken.write.mint([seller.account.address, sellerTokenAmount], {
        account: deployOwner.account,
      });

      await myToken.write.approve([marketplace.address, listingPrice], {
        account: seller.account,
      });

      const priceInToken = parseEther("100");
      const uri = "https://example.com/token/1";

      await marketplace.write.listToken([collectionId, priceInToken, uri], {
        account: seller.account,
      });

      const tokenId = await nft.read.nextTokenId() - 1n;

      // Transfer NFT to someone else (simulating seller transferring it)
      await nft.write.transferFrom([seller.account.address, other.account.address, tokenId], {
        account: seller.account,
      });

      await nft.write.approve([marketplace.address, tokenId], {
        account: other.account,
      });

      await myToken.write.approve([marketplace.address, priceInToken], {
        account: buyer.account,
      });

      await assert.rejects(
        marketplace.write.buyToken([tokenId], {
          account: buyer.account,
        }),
        /Seller no longer owns NFT/
      );
    });

    it("Should revert when buyer has insufficient token allowance", async function () {
      const { marketplace, myToken, nft, owner: deployOwner } = await deployContracts(viem, owner);
      const listingPrice = parseEther("1");
      await marketplace.write.setListingPrice([listingPrice], {
        account: owner.account,
      });

      await marketplace.write.createCollection(["Default Collection", "Test collection"], {
        account: owner.account,
      });
      const collectionId = 0n;

      // Mint tokens to buyer and seller
      const buyerTokenAmount = parseEther("1000");
      await myToken.write.mint([buyer.account.address, buyerTokenAmount], {
        account: deployOwner.account,
      });

      const sellerTokenAmount = parseEther("1000");
      await myToken.write.mint([seller.account.address, sellerTokenAmount], {
        account: deployOwner.account,
      });

      await myToken.write.approve([marketplace.address, listingPrice], {
        account: seller.account,
      });

      const priceInToken = parseEther("100");
      const uri = "https://example.com/token/1";

      await marketplace.write.listToken([collectionId, priceInToken, uri], {
        account: seller.account,
      });

      const tokenId = await nft.read.nextTokenId() - 1n;

      await nft.write.approve([marketplace.address, tokenId], {
        account: seller.account,
      });

      // Approve less than required
      await myToken.write.approve([marketplace.address, priceInToken - 1n], {
        account: buyer.account,
      });

      await assert.rejects(
        marketplace.write.buyToken([tokenId], {
          account: buyer.account,
        }),
        /(Failed to transfer payment tokens|ERC20InsufficientAllowance)/
      );
    });

    it("Should emit ItemSold event", async function () {
      const { marketplace, myToken, nft, owner: deployOwner } = await deployContracts(viem, owner);
      const listingPrice = parseEther("1");
      await marketplace.write.setListingPrice([listingPrice], {
        account: owner.account,
      });

      await marketplace.write.createCollection(["Default Collection", "Test collection"], {
        account: owner.account,
      });
      const collectionId = 0n;

      // Mint tokens to buyer and seller
      const buyerTokenAmount = parseEther("1000");
      await myToken.write.mint([buyer.account.address, buyerTokenAmount], {
        account: deployOwner.account,
      });

      const sellerTokenAmount = parseEther("1000");
      await myToken.write.mint([seller.account.address, sellerTokenAmount], {
        account: deployOwner.account,
      });

      await myToken.write.approve([marketplace.address, listingPrice], {
        account: seller.account,
      });

      const priceInToken = parseEther("100");
      const uri = "https://example.com/token/1";

      await marketplace.write.listToken([collectionId, priceInToken, uri], {
        account: seller.account,
      });

      const tokenId = await nft.read.nextTokenId() - 1n;

      await nft.write.approve([marketplace.address, tokenId], {
        account: seller.account,
      });

      await myToken.write.approve([marketplace.address, priceInToken], {
        account: buyer.account,
      });

      const txHash = await marketplace.write.buyToken([tokenId], {
        account: buyer.account,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      const contractLogs = receipt.logs.filter(log => 
        log.address.toLowerCase() === marketplace.address.toLowerCase()
      );
      assert.ok(contractLogs.length > 0, "ItemSold event should be emitted");
    });

    it("Should return the sold item", async function () {
      const { marketplace, myToken, nft, owner: deployOwner } = await deployContracts(viem, owner);
      const listingPrice = parseEther("1");
      await marketplace.write.setListingPrice([listingPrice], {
        account: owner.account,
      });

      await marketplace.write.createCollection(["Default Collection", "Test collection"], {
        account: owner.account,
      });
      const collectionId = 0n;

      // Mint tokens to buyer and seller
      const buyerTokenAmount = parseEther("1000");
      await myToken.write.mint([buyer.account.address, buyerTokenAmount], {
        account: deployOwner.account,
      });

      const sellerTokenAmount = parseEther("1000");
      await myToken.write.mint([seller.account.address, sellerTokenAmount], {
        account: deployOwner.account,
      });

      await myToken.write.approve([marketplace.address, listingPrice], {
        account: seller.account,
      });

      const priceInToken = parseEther("100");
      const uri = "https://example.com/token/1";

      await marketplace.write.listToken([collectionId, priceInToken, uri], {
        account: seller.account,
      });

      const tokenId = await nft.read.nextTokenId() - 1n;

      await nft.write.approve([marketplace.address, tokenId], {
        account: seller.account,
      });

      await myToken.write.approve([marketplace.address, priceInToken], {
        account: buyer.account,
      });

      const { result } = await marketplace.simulate.buyToken([tokenId], {
        account: buyer.account,
      });

      assert.equal(result.tokenId, tokenId);
      assert.equal(result.isListed, false);
    });
  });
});
