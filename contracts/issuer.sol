// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ERC1155Core.sol";

contract Issuer {
    address public adminContract;
    address public tokenContract;
    
    mapping(address => uint256[]) public issuerTokens;

    modifier onlyIssuer() {
        require(IAdmin(adminContract).isIssuer(msg.sender), "Not authorized issuer");
        _;
    }

    constructor(address _adminContract, address _tokenContract) {
        adminContract = _adminContract;
        tokenContract = _tokenContract;
    }

    function createToken(
        uint256 _amount,
        uint256 _price,
        string memory _metadataURI
    ) external onlyIssuer returns (uint256) {
        uint256 tokenId = ERC1155Core(tokenContract).mintTokenForIssuer(msg.sender, _amount, _price, _metadataURI);
        issuerTokens[msg.sender].push(tokenId);
        return tokenId;
    }

    function updateTokenPrice(uint256 _tokenId, uint256 _newPrice) external onlyIssuer {
        ERC1155Core(tokenContract).updateTokenPriceForIssuer(msg.sender, _tokenId, _newPrice);
    }

    function getMyTokens() external view returns (uint256[] memory) {
        return issuerTokens[msg.sender];
    }
    
    function getTokenPrice(uint256 _tokenId) external view returns (uint256) {
        return ERC1155Core(tokenContract).tokenPrice(_tokenId);
    }
}
