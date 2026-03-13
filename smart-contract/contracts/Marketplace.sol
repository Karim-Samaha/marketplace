// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ERC20Token is IERC20 {}
interface ERC721Token is IERC721 {
    function safeMint(address to, string memory uri) external returns (uint256);
}

event CollectionCreated(uint256 collectionId, address creator, string name);
event ItemListed(uint256 tokenId, uint256 collectionId, address seller, uint256 price);
event ItemSold(uint256 tokenId, uint256 collectionId, address buyer, uint256 price);
event ItemRemoved(uint256 tokenId, uint256 collectionId);

contract Marketplace is ReentrancyGuard {
        struct Collection {
        uint256 collectionId;        
        string name;               
        string description;         
        address creator;            
        uint256 itemCount;           
        bool exists;                 
        uint256 createdAt;           
    }

    struct Item {
        uint256 tokenId;
        uint256 collectionId;
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
    uint256 public collectionsCount;
    mapping(uint256 => Item) public listedItems;
    mapping(uint256 => Collection) public collections;
    mapping(uint256 => uint256[]) public collectionItems;
    mapping(address => uint256[]) public userCollections;

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

    function createCollection(string memory name, string memory description) public returns (Collection memory) {
        uint256 collectionId = collectionsCount;
        collections[collectionId] = Collection({
            collectionId: collectionId,
            name: name,
            description: description,
            creator: msg.sender,
            itemCount: 0,
            exists: true,
            createdAt: block.timestamp
        });  
        emit CollectionCreated(collectionId, msg.sender, name);
        userCollections[msg.sender].push(collectionId);
        collectionsCount++;
        return collections[collectionId];
    }
    function getCollection(uint256 collectionId) public view returns (Collection memory) {
        require(collections[collectionId].exists, "Collection does not exist");
        return collections[collectionId];
    }
    function getCollectionItems(uint256 collectionId) public view returns (uint256[] memory) {
        require(collections[collectionId].exists, "Collection does not exist");
        return collectionItems[collectionId];
    }
    function getUserCollections(address user) public view returns (uint256[] memory) {
        return userCollections[user];
    }


    function listToken(uint256 collectionId, uint256 priceInToken, string memory uri) public nonReentrant returns (Item memory) {
        require(collections[collectionId].exists, "Collection does not exist");

        // Ask user to approve Marketplace to spend their tokens before calling this
        uint256 allowance = token.allowance(msg.sender, address(this));
        require(allowance >= listingPriceInToken, "Approve Marketplace to spend tokens first");

        require(token.transferFrom(msg.sender, address(this), listingPriceInToken), "Failed to transfer payment tokens");

        uint256 tokenId = erc721Token.safeMint(msg.sender, uri);

        listedItems[tokenId] = Item(tokenId, collectionId, priceInToken, uri, msg.sender, true);
        collectionItems[collectionId].push(tokenId);
        itemsCount++;
        collections[collectionId].itemCount++;
        emit ItemListed(tokenId, collectionId, msg.sender, priceInToken);
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
        uint256 collectionId = listedItems[tokenId].collectionId;
        listedItems[tokenId].isListed = false;
        itemsCount--;
        collections[collectionId].itemCount--;
        emit ItemRemoved(tokenId, collectionId);
        return listedItems[tokenId];
    }

    function buyToken(uint256 tokenId) public nonReentrant returns (Item memory) {
        require(erc721Token.ownerOf(tokenId) == listedItems[tokenId].seller, "Seller no longer owns NFT");
        require(erc721Token.getApproved(tokenId) == address(this),"Marketplace not approved for NFT");
        require(listedItems[tokenId].isListed == true, "Token not listed");

        // Transfer tokens (payment) from buyer to seller
        require(token.transferFrom(msg.sender, listedItems[tokenId].seller, listedItems[tokenId].priceInToken), "Failed to transfer payment tokens");
        uint256 collectionId = listedItems[tokenId].collectionId;
        collections[collectionId].itemCount--;
        listedItems[tokenId].isListed = false;
        itemsCount--;
        // Transfer NFT from seller to buyer
        erc721Token.transferFrom(listedItems[tokenId].seller, msg.sender, tokenId);


        emit ItemSold(tokenId, collectionId, msg.sender, listedItems[tokenId].priceInToken);
        return listedItems[tokenId];
    }

}