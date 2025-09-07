// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PaymentSplitter is ReentrancyGuard {
    event RentalDistributed(uint256 indexed tokenId, uint256 totalAmount, uint256 toHolders, uint256 toPlatform);

    address public immutable adminContract;
    address public marketplaceContract;

    modifier onlyAssignedManager(uint256 _tokenId) {
        require(IAdmin(adminContract).isManagerForToken(msg.sender, _tokenId), "Not assigned manager");
        _;
    }

    constructor(address _adminContract) {
        adminContract = _adminContract;
    }

    function setMarketplace(address _marketplaceContract) external {
        require(IAdmin(adminContract).isAdmin(msg.sender), "Only admin");
        require(marketplaceContract == address(0), "Already set");
        marketplaceContract = _marketplaceContract;
    }

    function submitRental(uint256 _tokenId) external payable onlyAssignedManager(_tokenId) nonReentrant {
        require(msg.value > 0, "No payment");
        require(marketplaceContract != address(0), "Marketplace not set");

        // Get token holders and total listed from marketplace
        address[] memory holders = IMarketplace(marketplaceContract).getTokenHoldersList(_tokenId);
        uint256 totalListed = IMarketplace(marketplaceContract).totalTokensListed(_tokenId);
        
        require(totalListed > 0, "No tokens listed");
        require(holders.length > 0, "No token holders");

        uint256 perTokenIncome = msg.value / totalListed;
        uint256 totalDistributed = 0;
        uint256 sumOfHolderAmounts = 0;

        // Calculate total holder amounts and verify invariant
        for (uint i = 0; i < holders.length; i++) {
            uint256 holderAmount = IMarketplace(marketplaceContract).tokenHolders(holders[i], _tokenId);
            sumOfHolderAmounts += holderAmount;
        }
        
        // Assert invariant: prevent over-distribution
        require(totalListed >= sumOfHolderAmounts, "Over-distribution risk");

        // Direct distribution to all holders using .call
        for (uint i = 0; i < holders.length; i++) {
            uint256 holderAmount = IMarketplace(marketplaceContract).tokenHolders(holders[i], _tokenId);
            if (holderAmount > 0) {
                uint256 holderIncome = perTokenIncome * holderAmount;
                (bool success, ) = payable(holders[i]).call{value: holderIncome}("");
                require(success, "Transfer failed");
                totalDistributed += holderIncome;
            }
        }

        // Send remaining to marketplace using .call
        uint256 platformEarnings = msg.value - totalDistributed;
        if (platformEarnings > 0) {
            (bool success, ) = payable(marketplaceContract).call{value: platformEarnings}("");
            require(success, "Platform transfer failed");
        }

        emit RentalDistributed(_tokenId, msg.value, totalDistributed, platformEarnings);
    }

    receive() external payable {}
}

interface IAdmin {
    function isManagerForToken(address, uint256) external view returns (bool);
    function isAdmin(address) external view returns (bool);
}

interface IMarketplace {
    function tokenHolders(address wallet, uint256 tokenId) external view returns (uint256);
    function getTokenHoldersList(uint256 tokenId) external view returns (address[] memory);
    function totalTokensListed(uint256 tokenId) external view returns (uint256);
}
