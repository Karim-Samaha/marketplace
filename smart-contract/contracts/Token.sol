// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.6.0
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IToken is IERC20 {
    function mint(address to, uint256 amount) external;
    function burnFrom(address from, uint256 amount) external;
}

event TokenBought(address buyer, uint256 amount);
event TokenSold(address seller, uint256 amount);

contract TokenContract is ReentrancyGuard {
    address public owner;
    IToken public token;
    uint256 public tokenPriceInWei = 1;

    mapping(address => uint256) public availableForUsersToWithdraw;

    constructor(address _owner, address _tokenAdress) {
        owner = _owner;
        token = IToken(_tokenAdress);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    function setTokenPrice(uint256 _tokenPriceInWei) public onlyOwner {
        tokenPriceInWei = _tokenPriceInWei;
    }
    function getTokenPrice() public view returns (uint256) {
        return tokenPriceInWei;
    }
    function getTotalSupply() public view returns (uint256) {
        return token.totalSupply();
    }
    function getBalance() public view returns (uint256) {
        return token.balanceOf(msg.sender);
    }

    function buyToken() public payable nonReentrant returns (bool) {
        require(msg.value >= tokenPriceInWei, "Insufficient funds");
        uint256 purchasedAmount = msg.value / tokenPriceInWei;
       

        token.transfer(msg.sender, purchasedAmount);
        emit TokenBought(msg.sender, purchasedAmount);

        uint toReturn = msg.value - (purchasedAmount * tokenPriceInWei);
        if (toReturn > 0) {
         availableForUsersToWithdraw[msg.sender] += toReturn;
        }
        return true;
    }
   
    function sellToken(uint256 amount) public nonReentrant returns (bool) {
        require(address(this).balance >= amount * tokenPriceInWei,"Insufficient contract liquidity");
        require(token.balanceOf(msg.sender) >= amount, "Insufficient balance");
        require(token.allowance(msg.sender, address(this)) >= amount, "Insufficient allowance");
        token.burnFrom(msg.sender, amount);
        availableForUsersToWithdraw[msg.sender] += amount * tokenPriceInWei;
        emit TokenSold(msg.sender, amount);
        return true;
    }

    function userWithdraw() public returns (bool) {
        require(availableForUsersToWithdraw[msg.sender] > 0, "No available balance");
        (bool status, ) = payable(msg.sender).call{value: availableForUsersToWithdraw[msg.sender]}("");
        require(status);
        availableForUsersToWithdraw[msg.sender] = 0;
        return true;
    }

    function withdraw(uint256 amount) external payable onlyOwner returns (bool) {
        require(address(this).balance >= amount, "Insufficient balance");
        (bool status, ) = payable(owner).call{value: amount}("");
        require(status, "Failed to withdraw");
        return true;
    }

    receive() external payable {}
}