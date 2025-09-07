// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC1155Core is ERC1155, Ownable {
    // Events
    event TokenMinted(address indexed issuer, uint256 indexed tokenId, uint256 amount, uint256 price, string metadataURI);

    // State variables
    mapping(uint256 => uint256) public tokenPrice;
    mapping(uint256 => string) public tokenMetadata;
    mapping(uint256 => address) public tokenIssuer;
    mapping(uint256 => uint256) public tokenSupply;
    
    address public adminContract;
    address public issuerContract; // Add issuer contract address
    uint256 public nextTokenId = 1;

    modifier onlyIssuer() {
        require(IAdmin(adminContract).isIssuer(msg.sender), "Not authorized issuer");
        _;
    }

    constructor(address _adminContract) ERC1155("") Ownable(msg.sender) {
        adminContract = _adminContract;
    }
    
    function setIssuerContract(address _issuerContract) external onlyOwner {
        issuerContract = _issuerContract;
    }

    function mintToken(
        uint256 _amount,
        uint256 _price,
        string memory _metadataURI
    ) external onlyIssuer returns (uint256) {
        uint256 tokenId = nextTokenId++;
        
        tokenPrice[tokenId] = _price;
        tokenMetadata[tokenId] = _metadataURI;
        tokenIssuer[tokenId] = msg.sender;
        tokenSupply[tokenId] = _amount;
        
        _mint(msg.sender, tokenId, _amount, "");
        
        emit TokenMinted(msg.sender, tokenId, _amount, _price, _metadataURI);
        return tokenId;
    }
    
    // Function for Issuer contract to mint on behalf of issuer
    function mintTokenForIssuer(
        address _issuer,
        uint256 _amount,
        uint256 _price,
        string memory _metadataURI
    ) external returns (uint256) {
        require(msg.sender == issuerContract, "Only issuer contract");
        require(IAdmin(adminContract).isIssuer(_issuer), "Not authorized issuer");
        
        uint256 tokenId = nextTokenId++;
        
        tokenPrice[tokenId] = _price;
        tokenMetadata[tokenId] = _metadataURI;
        tokenIssuer[tokenId] = _issuer;
        tokenSupply[tokenId] = _amount;
        
        _mint(_issuer, tokenId, _amount, "");
        
        emit TokenMinted(_issuer, tokenId, _amount, _price, _metadataURI);
        return tokenId;
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return tokenMetadata[tokenId];
    }

    function getTokenInfo(uint256 tokenId) external view returns (
        uint256 price,
        string memory metadataURI,
        address issuer,
        uint256 supply
    ) {
        return (
            tokenPrice[tokenId],
            tokenMetadata[tokenId],
            tokenIssuer[tokenId],
            tokenSupply[tokenId]
        );
    }

    function updateTokenPrice(uint256 tokenId, uint256 newPrice) external {
        require(tokenIssuer[tokenId] == msg.sender, "Not token issuer");
        tokenPrice[tokenId] = newPrice;
    }
    
    // Function for Issuer contract to update price on behalf of issuer
    function updateTokenPriceForIssuer(address _issuer, uint256 tokenId, uint256 newPrice) external {
        require(msg.sender == issuerContract, "Only issuer contract");
        require(tokenIssuer[tokenId] == _issuer, "Not token issuer");
        tokenPrice[tokenId] = newPrice;
    }
}

interface IAdmin {
    function isIssuer(address) external view returns (bool);
}
