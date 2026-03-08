// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ERC20Token is IERC20 {}
interface ERC721Token is IERC721 {
    function safeMint(address to, string memory uri) external returns (uint256);
}
event ItemListed(uint256 tokenId, address seller, uint256 price);
event ItemSold(uint256 tokenId, address buyer, uint256 price);
event ItemRemoved(uint256 tokenId);

contract Marketplace is ReentrancyGuard {
    struct Item {
        uint256 tokenId;
        uint256 priceInToken;
        string uri;
        address seller;
        bool isListed;
    }
    address public owner;
    ERC20Token public token;
    ERC721Token public erc721Token;
    uint256 public listingPriceInToken = 1;
    uint256 public itemsCount;
    mapping(uint256 => Item) public listedItems;

    constructor(address _owner, address _tokenAddress, address _erc721TokenAddress) {
        owner = _owner;
        token = ERC20Token(_tokenAddress);
        erc721Token = ERC721Token(_erc721TokenAddress);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    function setListingPrice(uint256 _listingPriceInToken) public onlyOwner {
        listingPriceInToken = _listingPriceInToken;
    }

    function getListingPrice() public view returns (uint256) {
        return listingPriceInToken;
    }


    function listToken(uint256 priceInToken, string memory uri) public nonReentrant returns (Item memory) {

        // Ask user to approve Marketplace to spend their tokens before calling this
        uint256 allowance = token.allowance(msg.sender, address(this));
        require(allowance >= listingPriceInToken, "Approve Marketplace to spend tokens first");

        require(token.transferFrom(msg.sender, address(this), listingPriceInToken), "Failed to transfer payment tokens");

        uint256 tokenId = erc721Token.safeMint(msg.sender, uri);

        listedItems[tokenId] = Item(tokenId, priceInToken, uri, msg.sender, true);
        itemsCount++;

        emit ItemListed(tokenId, msg.sender, priceInToken);
        return listedItems[tokenId];
    }


    function getListedItem(uint256 tokenId) public view returns (Item memory) {
        return listedItems[tokenId];
    }
    function editItemPrice(uint256 tokenId, uint256 newPrice) public returns (Item memory) {
        require(listedItems[tokenId].isListed == true, "Token not listed");
        require(listedItems[tokenId].seller == msg.sender, "You are not the owner of the token");
        listedItems[tokenId].priceInToken = newPrice;
        return listedItems[tokenId];
    }

    function removeListedToken(uint256 tokenId) public returns (Item memory) {
        require(listedItems[tokenId].isListed == true, "Token not listed");
        require(listedItems[tokenId].seller == msg.sender, "You are not the owner of the token");
        listedItems[tokenId].isListed = false;
        itemsCount--;
        emit ItemRemoved(tokenId);
        return listedItems[tokenId];
    }


    function buyToken(uint256 tokenId) public returns (Item memory) {
        require(erc721Token.ownerOf(tokenId) == listedItems[tokenId].seller, "Seller no longer owns NFT");
        require(erc721Token.getApproved(tokenId) == address(this),"Marketplace not approved for NFT");
        require(listedItems[tokenId].isListed == true, "Token not listed");

        // Transfer tokens (payment) from buyer to seller
        require(token.transferFrom(msg.sender, listedItems[tokenId].seller, listedItems[tokenId].priceInToken), "Failed to transfer payment tokens");
        // Transfer NFT from seller to buyer
        erc721Token.transferFrom(listedItems[tokenId].seller, msg.sender, tokenId);


        listedItems[tokenId].isListed = false;
        itemsCount--;
        emit ItemSold(tokenId, msg.sender, listedItems[tokenId].priceInToken);
        return listedItems[tokenId];
    }

}