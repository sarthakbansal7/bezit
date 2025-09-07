// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Admin is Ownable {
    // Events
    event IssuerAdded(address indexed issuer, string metadataURI);
    event ManagerAdded(address indexed manager, string metadataURI);
    event MarketplacePaused(bool paused);

    // State variables
    mapping(address => bool) public isIssuer;
    mapping(address => bool) public isManager;
    mapping(address => string) public issuerMetadata;
    mapping(address => string) public managerMetadata;
    mapping(address => uint256[]) public managerTokens; // Manager assigned tokens
    mapping(uint256 => address) public tokenManager; // Token to manager mapping
    
    // Arrays to store all addresses
    address[] public allIssuers;
    address[] public allManagers;
    
    bool public marketplacePaused;

    constructor() Ownable(msg.sender) {}

    // Add issuer
    function addIssuer(address _issuer, string memory _metadataURI) external onlyOwner {
        require(!isIssuer[_issuer], "Already an issuer");
        
        isIssuer[_issuer] = true;
        issuerMetadata[_issuer] = _metadataURI;
        allIssuers.push(_issuer);
        
        emit IssuerAdded(_issuer, _metadataURI);
    }

    // Add manager
    function addManager(address _manager, string memory _metadataURI) external onlyOwner {
        require(!isManager[_manager], "Already a manager");
        
        isManager[_manager] = true;
        managerMetadata[_manager] = _metadataURI;
        allManagers.push(_manager);
        
        emit ManagerAdded(_manager, _metadataURI);
    }

    // Remove issuer
    function removeIssuer(address _issuer) external onlyOwner {
        require(isIssuer[_issuer], "Not an issuer");
        
        isIssuer[_issuer] = false;
        delete issuerMetadata[_issuer];
        
        // Remove from array
        for (uint i = 0; i < allIssuers.length; i++) {
            if (allIssuers[i] == _issuer) {
                allIssuers[i] = allIssuers[allIssuers.length - 1];
                allIssuers.pop();
                break;
            }
        }
    }

    // Remove manager
    function removeManager(address _manager) external onlyOwner {
        require(isManager[_manager], "Not a manager");
        
        isManager[_manager] = false;
        delete managerMetadata[_manager];
        
        // Remove from array
        for (uint i = 0; i < allManagers.length; i++) {
            if (allManagers[i] == _manager) {
                allManagers[i] = allManagers[allManagers.length - 1];
                allManagers.pop();
                break;
            }
        }
    }

    // Pause/unpause marketplace
    function pauseMarketplace() external onlyOwner {
        marketplacePaused = !marketplacePaused;
        emit MarketplacePaused(marketplacePaused);
    }

    // Assign token to manager
    function assignManager(address _manager, uint256 _tokenId) external onlyOwner {
        require(isManager[_manager], "Not a manager");
        managerTokens[_manager].push(_tokenId);
        tokenManager[_tokenId] = _manager;
    }

    // Check if manager is assigned to token
    function isManagerForToken(address _manager, uint256 _tokenId) external view returns (bool) {
        return tokenManager[_tokenId] == _manager;
    }

    // Get all issuers
    function getAllIssuers() external view returns (address[] memory) {
        return allIssuers;
    }

    // Get all managers
    function getAllManagers() external view returns (address[] memory) {
        return allManagers;
    }

    // Get issuer count
    function getIssuerCount() external view returns (uint256) {
        return allIssuers.length;
    }

    // Get manager count
    function getManagerCount() external view returns (uint256) {
        return allManagers.length;
    }

    // Get manager's assigned tokens
    function getManagerTokens(address _manager) external view returns (uint256[] memory) {
        return managerTokens[_manager];
    }

    // Check if address is admin (owner)
    function isAdmin(address _address) external view returns (bool) {
        return _address == owner();
    }

    function getIssuerAt(uint index) external view returns (address) {
        require(index < allIssuers.length, "Index out of bounds");
        return allIssuers[index];
    }

    function getManagerAt(uint index) external view returns (address) {
        require(index < allManagers.length, "Index out of bounds");
        return allManagers[index];
    }
}
