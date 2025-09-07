// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

contract Marketplace is ReentrancyGuard {
    // Events
    event AssetListed(uint256 indexed tokenId, address indexed issuer, uint256 amount, uint256 price);
    event AssetBought(uint256 indexed tokenId, address indexed buyer, uint256 amount, uint256 platformFee);
    event AssetSold(uint256 indexed tokenId, address indexed seller, uint256 amount, uint256 platformFee);
    event EarningsWithdrawn(address indexed admin, uint256 amount);
    event ListingRemoved(uint256 indexed tokenId, address indexed issuer, uint256 amount);
    event ListingUpdated(uint256 indexed tokenId, string newMetadataURI);

    // Structs
    struct Listing {
        address issuer;
        uint256 amount;
        bool active;
    }

    // State variables
    mapping(uint256 => Listing) public listings;
    mapping(address => mapping(uint256 => uint256)) public tokenHolders; // wallet => tokenId => amount
    mapping(address => uint256[]) public userTokenIds;
    mapping(uint256 => address[]) public tokenHoldersList; // tokenId => holders array
    mapping(uint256 => uint256) public totalTokensListed; // tokenId => total tokens originally listed
    
    address public immutable adminContract;
    address public immutable tokenContract;
    address public paymentSplitter;
    uint256[] public activeTokens;
    uint256 public totalEarnings; // Track platform earnings
    
    uint256 public constant PLATFORM_FEE_PERCENT = 1; // 1% platform fee

    modifier onlyIssuer() {
        require(IAdmin(adminContract).isIssuer(msg.sender), "Not authorized issuer");
        _;
    }

    modifier onlyAdmin() {
        require(IAdmin(adminContract).isAdmin(msg.sender), "Not admin");
        _;
    }

    constructor(address _adminContract, address _tokenContract) {
        adminContract = _adminContract;
        tokenContract = _tokenContract;
    }

    function setPaymentSplitter(address _paymentSplitter) external onlyAdmin {
        paymentSplitter = _paymentSplitter;
    }

    /**
     * List an asset on the marketplace - only issuers can list
     * Uses token's inherent price from ERC1155Core contract
     */
    function listAsset(uint256 _tokenId, uint256 _amount) external onlyIssuer {
        require(_amount > 0, "Amount must be > 0");
        require(IToken(tokenContract).tokenIssuer(_tokenId) == msg.sender, "Not token issuer");
        
        // Get price from token contract
        uint256 price = IToken(tokenContract).tokenPrice(_tokenId);
        require(price > 0, "Invalid token price");
        
        // Transfer tokens from issuer to marketplace
        IERC1155(tokenContract).safeTransferFrom(msg.sender, address(this), _tokenId, _amount, "");

        // Check if this is a new listing
        if (!listings[_tokenId].active) {
            activeTokens.push(_tokenId);
            totalTokensListed[_tokenId] = _amount; // Track total tokens listed
        } else {
            totalTokensListed[_tokenId] += _amount; // Add to existing listing
        }

        // Update or create listing
        listings[_tokenId] = Listing({
            issuer: msg.sender,
            amount: _amount,
            active: true
        });

        emit AssetListed(_tokenId, msg.sender, _amount, price);
    }

    /**
     * Buy an asset from the marketplace with 1% platform fee
     */
    function buyAsset(uint256 _tokenId, uint256 _amount) external payable nonReentrant {
        Listing storage listing = listings[_tokenId];
        require(listing.active, "Asset not listed");
        require(listing.amount >= _amount, "Insufficient tokens");
        
        uint256 tokenPrice = IToken(tokenContract).tokenPrice(_tokenId);
        uint256 totalCost = tokenPrice * _amount;
        uint256 platformFee = (totalCost * PLATFORM_FEE_PERCENT) / 100;
        uint256 totalRequired = totalCost + platformFee;
        
        require(msg.value >= totalRequired, "Insufficient payment including platform fee");

        // Update listing
        listing.amount -= _amount;
        if (listing.amount == 0) {
            listing.active = false;
        }

        // Track token holders
        if (tokenHolders[msg.sender][_tokenId] == 0) {
            userTokenIds[msg.sender].push(_tokenId);
            tokenHoldersList[_tokenId].push(msg.sender);
        }
        tokenHolders[msg.sender][_tokenId] += _amount;

        // Add platform fee to earnings
        totalEarnings += platformFee;

        // Refund excess
        if (msg.value > totalRequired) {
            payable(msg.sender).transfer(msg.value - totalRequired);
        }

        emit AssetBought(_tokenId, msg.sender, _amount, platformFee);
    }

    /**
     * Sell an asset back to the marketplace with 1% platform fee
     */
    function sellAsset(uint256 _tokenId, uint256 _amount) external payable nonReentrant {
        require(tokenHolders[msg.sender][_tokenId] >= _amount, "Insufficient balance");
        
        Listing storage listing = listings[_tokenId];
        uint256 tokenPrice = IToken(tokenContract).tokenPrice(_tokenId);
        uint256 totalValue = tokenPrice * _amount;
        uint256 platformFee = (totalValue * PLATFORM_FEE_PERCENT) / 100;
        
        require(msg.value >= platformFee, "Must pay platform fee");
        require(address(this).balance >= totalValue, "Insufficient marketplace funds");

        // Update token holders
        tokenHolders[msg.sender][_tokenId] -= _amount;
        
        // Remove from holders list if balance becomes 0
        if (tokenHolders[msg.sender][_tokenId] == 0) {
            address[] storage holders = tokenHoldersList[_tokenId];
            for (uint256 i = 0; i < holders.length; i++) {
                if (holders[i] == msg.sender) {
                    holders[i] = holders[holders.length - 1];
                    holders.pop();
                    break;
                }
            }
        }

        // Update listing
        listing.amount += _amount;
        listing.active = true;

        // Add platform fee to earnings
        totalEarnings += platformFee;

        // Pay seller
        payable(msg.sender).transfer(totalValue);

        // Refund excess
        if (msg.value > platformFee) {
            payable(msg.sender).transfer(msg.value - platformFee);
        }

        emit AssetSold(_tokenId, msg.sender, _amount, platformFee);
    }

    /**
     * Withdraw platform earnings - only admin can call
     */
    function withdrawEarnings() external onlyAdmin {
        require(totalEarnings > 0, "No earnings to withdraw");
        
        uint256 amount = totalEarnings;
        totalEarnings = 0;
        
        payable(msg.sender).transfer(amount);
        
        emit EarningsWithdrawn(msg.sender, amount);
    }

    /**
     * Remove listing - only issuer can remove their listing
     */
    function removeListing(uint256 _tokenId) external {
        Listing storage listing = listings[_tokenId];
        require(listing.active, "Listing not active");
        require(listing.issuer == msg.sender, "Not the issuer");
        
        uint256 amount = listing.amount;
        listing.active = false;
        listing.amount = 0;
        
        // Transfer tokens back to issuer
        IERC1155(tokenContract).safeTransferFrom(address(this), msg.sender, _tokenId, amount, "");
        
        emit ListingRemoved(_tokenId, msg.sender, amount);
    }

    /**
     * Update listing metadata - only issuer can update
     */
    function updateListing(uint256 _tokenId, string memory _newMetadataURI) external {
        Listing storage listing = listings[_tokenId];
        require(listing.active, "Listing not active");
        require(listing.issuer == msg.sender, "Not the issuer");
        
        // Update metadata in the token contract (if supported)
        // This assumes ERC1155Core has an updateMetadata function
        // Otherwise, this would just emit an event for frontend tracking
        
        emit ListingUpdated(_tokenId, _newMetadataURI);
    }

    // Getters for token holders (used by payment splitter)
    function getTokenHolders(uint256 _tokenId) external view returns (address[] memory holders, uint256[] memory amounts) {
        address[] memory holderAddresses = tokenHoldersList[_tokenId];
        uint256[] memory holderAmounts = new uint256[](holderAddresses.length);
        
        for (uint256 i = 0; i < holderAddresses.length; i++) {
            holderAmounts[i] = tokenHolders[holderAddresses[i]][_tokenId];
        }
        
        return (holderAddresses, holderAmounts);
    }

    function getAllListings() external view returns (
        uint256[] memory tokenIds, 
        address[] memory issuers,
        uint256[] memory amounts, 
        uint256[] memory prices
    ) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < activeTokens.length; i++) {
            if (listings[activeTokens[i]].active) activeCount++;
        }

        tokenIds = new uint256[](activeCount);
        issuers = new address[](activeCount);
        amounts = new uint256[](activeCount);
        prices = new uint256[](activeCount);
        
        uint256 index = 0;
        for (uint256 i = 0; i < activeTokens.length; i++) {
            uint256 tokenId = activeTokens[i];
            if (listings[tokenId].active) {
                tokenIds[index] = tokenId;
                issuers[index] = listings[tokenId].issuer;
                amounts[index] = listings[tokenId].amount;
                prices[index] = IToken(tokenContract).tokenPrice(tokenId);
                index++;
            }
        }
    }

    function getMyAssets() external view returns (uint256[] memory tokenIds, uint256[] memory amounts) {
        uint256[] memory tokens = userTokenIds[msg.sender];
        uint256 count = 0;
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokenHolders[msg.sender][tokens[i]] > 0) count++;
        }

        tokenIds = new uint256[](count);
        amounts = new uint256[](count);
        
        uint256 index = 0;
        for (uint256 i = 0; i < tokens.length; i++) {
            uint256 balance = tokenHolders[msg.sender][tokens[i]];
            if (balance > 0) {
                tokenIds[index] = tokens[i];
                amounts[index] = balance;
                index++;
            }
        }
    }

    function getUserBalance(address _user, uint256 _tokenId) external view returns (uint256) {
        return tokenHolders[_user][_tokenId];
    }

    function getTotalListed(uint256 _tokenId) external view returns (uint256) {
        return totalTokensListed[_tokenId];
    }

    function getTokenHoldersList(uint256 _tokenId) external view returns (address[] memory) {
        return tokenHoldersList[_tokenId];
    }

    function onERC1155Received(address, address, uint256, uint256, bytes memory) public pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address, address, uint256[] memory, uint256[] memory, bytes memory) public pure returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    receive() external payable {
        // Add received funds to earnings (from PaymentSplitter)
        totalEarnings += msg.value;
    }
}

interface IAdmin {
    function isIssuer(address _address) external view returns (bool);
    function isAdmin(address _address) external view returns (bool);
}

interface IToken {
    function tokenIssuer(uint256) external view returns (address);
    function tokenPrice(uint256) external view returns (uint256);
    function tokenMetadata(uint256) external view returns (string memory);
}
