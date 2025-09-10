# 🏠 RWA Tokenization Platform

**Real-World Asset Tokenization on Sonic Chain**

A comprehensive platform for tokenizing real-world assets including Real Estate, Invoices, Commodities, Stocks, and Carbon Credits on the **Sonic Chain** network with automated marketplace listing and revenue distribution.

---

## 📋 Table of Contents

1. [Platform Overview](#-platform-overview)  
2. [Key Features](#-key-features)  
3. [Technology Stack](#-technology-stack)  
4. [Smart Contracts Architecture](#-smart-contracts-architecture)  
5. [Sonic Chain Integration & Benefits](#-sonic-chain-integration--benefits)  
6. [User Roles & Workflows](#-user-roles--workflows)  
7. [Installation & Setup](#-installation--setup)  
8. [Contract Deployment](#-contract-deployment)  
9. [Environment Configuration](#-environment-configuration)  
10. [API Documentation](#-api-documentation)  
11. [Frontend Architecture](#-frontend-architecture)  
12. [Backend Services](#-backend-services)  
13. [IPFS Integration](#-ipfs-integration)  
14. [Security Features](#-security-features) 

---

## 🌟 Platform Overview

The RWA Tokenization Platform enables users to tokenize real-world assets and trade them on a decentralized marketplace. Built on **Sonic Chain**, the platform offers:

- **Asset Tokenization**: Convert physical assets into digital tokens  
- **Automated Marketplace**: Seamless listing and trading of tokenized assets  
- **Revenue Distribution**: Automatic distribution to token holders  
- **Multi-Asset Support**: Real Estate, Invoices, Commodities, Stocks, Carbon Credits  
- **Enterprise-Grade Security**: Role-based access control and audit trails  

---

## ✨ Key Features

### 🏢 Asset Tokenization
- **Multiple Asset Types**: Support for 5 different asset categories  
- **IPFS Storage**: Decentralized storage for asset metadata and images  
- **Automatic Listing**: Tokens are automatically listed on marketplace after minting  
- **Flexible Supply**: Support for both fungible and non-fungible tokens  

### 🛒 Decentralized Marketplace
- **ERC-1155 Tokens**: Standardized multi-asset token support  
- **No Token Custody**: Marketplace doesn't hold tokens, only records listings  
- **Native Transfers**: Uses Ethereum-compatible token transfers on Sonic Chain  
- **SONIC/USDC Payments**: Direct payments for purchases  

### 💰 Revenue Distribution
- **Automatic Splitting**: PaymentSplitter contract distributes revenue  
- **Proportional Rewards**: Income distributed based on token ownership  
- **Manager Controls**: Authorized managers can submit payments  
- **Real-time Tracking**: Complete payment history and analytics  

### 🔐 Role-Based Access
- **Admin Control**: Platform administration and user management  
- **Issuer Permissions**: Authorized asset tokenization  
- **Manager Assignment**: Asset-specific management roles  
- **User Portfolio**: Individual asset ownership tracking  

---

## 🛠 Technology Stack

### Blockchain & Smart Contracts
- **Sonic Chain L2**: High-speed Ethereum-compatible layer-2 network  
- **Solidity**: Smart contract development  
- **Ethers.js / Hardhat**: Blockchain interactions and deployments  

### Frontend
- **React 18 + TypeScript**: Modern UI  
- **Tailwind CSS**: Styling  
- **Framer Motion**: Animations  
- **React Router**: Routing  

### Backend & Services
- **Node.js + Express.js**: Backend server  
- **MongoDB**: Database  
- **IPFS / Pinata**: Decentralized storage  
- **MetaMask**: Wallet integration  

---

## 📜 Smart Contracts Architecture

### Contract Addresses (Sonic Testnet)
```javascript
SONIC_TESTNET: {
    ADMIN: "0x071A4FCcEEe657c8d4729F664957e1777f6A719E",
    ERC1155_CORE: "0xF4Ef996bF8d60B1C17aFb174f3D0a5434139001c",
    ISSUER: "0xDc00F1531fdbB8995D03569A0c1bcd26dF84caC1", 
    MARKETPLACE: "0x7EBE05a43847d779b6e46bB1e5F9506155cAb249",
    PAYMENT_SPLITTER: "0xf344dd57a07Cf302F75502aa2Eb846593fDCa323"
}
```

## 📜 Smart Contracts

### Admin Contract
**Purpose:** Central authority and permission management  

**Key Functions:**
- `addIssuer(address _issuer, string _metadataURI)`
- `addManager(address _manager, string _metadataURI)`
- `assignManager(address _manager, uint256 _tokenId)`
- `pauseMarketplace()`
- `isIssuer(address _address) view returns (bool)`
- `isManager(address _address, uint256 _tokenId) view returns (bool)`

---

### Marketplace Contract
**Purpose:** Asset listing and trading without token custody  

**Key Functions:**
- `listAsset(uint256 _tokenId, uint256 _amount, uint256 _price, string _metadataURI)`
- `buyAsset(uint256 _tokenId, uint256 _amount) payable`
- `sellAsset(uint256 _tokenId, uint256 _amount)`
- `getAllListings() view returns (...)`
- `getMarketplaceBalance() view returns (uint256)`

---

### PaymentSplitter Contract
**Purpose:** Automated revenue distribution to token holders  

**Key Functions:**
- `addTokenHolder(uint256 _tokenId, address _wallet, uint256 _amount)`
- `setTotalListed(uint256 _tokenId, uint256 _total)`
- `submitRevenue(uint256 _tokenId) payable`
- `getTokenHolders(uint256 _tokenId) view returns (TokenHolder[])`

---

## 🚀 Sonic Chain Integration & Benefits

- **Ethereum Security:** Layer-2 inherits Ethereum's security  
- **Low Fees:** Near-zero gas fees compared to mainnet  
- **High Throughput:** Thousands of TPS  
- **Fast Finality:** Seconds-level confirmation  
- **Cross-Chain Compatible:** Works with Ethereum tooling and bridges  

---

## 👥 User Roles & Workflows

### Admin
- Add/remove issuers and managers  
- Assign managers to tokens  
- Emergency marketplace pause/resume  

### Issuer
- Create assets, mint ERC-1155 tokens  
- Automatic marketplace listing  
- Manage portfolio  

### Manager
- Submit revenue payments  
- Track asset performance  
- Manage token holders  

### User
- Browse marketplace, purchase tokens  
- Track portfolio and revenue  
- Sell assets back to marketplace  

---

## 🔧 Installation & Setup

### Prerequisites
- Node.js 18+  
- npm or yarn  
- Git  
- MetaMask wallet  

### Clone Repository
```bash
git clone https://github.com/sarthakbansal7/RWA-Sonic.git
cd Evm-Rwa
```

### Frontend Setup
```bash
cd Frontend
npm install  
npm run dev
```

### Backend Setup
```bash
cd Backend
npm install
npm start
```

---

## 🔧 Contract Deployment

### Deploy to Sonic Testnet
```bash
cd contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network sonic-testnet
```

### Network Configuration
```javascript
// Sonic Testnet
{
  chainId: 14601,
  name: "Sonic Testnet Network",
  rpcUrl: "https://rpc.testnet.soniclabs.com",
  blockExplorer: "https://testnet.sonicscan.org",
  nativeCurrency: {
    name: "Sonic",
    symbol: "S",
    decimals: 18
  }
}
```


---

## 🏗 Frontend Architecture

### Component Structure
```
src/
├── components/           # Reusable UI components
├── pages/               # Page components
│   ├── admin/          # Admin dashboard
│   ├── marketplace/    # Asset marketplace
│   ├── dashboard/      # User dashboard
│   └── issuer/         # Issuer interface
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
├── utils/              # Helper functions
└── api/                # API integration
```

### Key Features
- **Responsive Design**: Mobile-first approach
- **Wallet Integration**: MetaMask connection
- **Real-time Updates**: Live data from blockchain
- **Error Handling**: Comprehensive error boundaries

---

## 🖥 Backend Services

### Service Architecture
```
Backend/
├── controllers/        # API route controllers
├── models/            # Database models
├── middleware/        # Authentication & validation
├── routes/           # API routes
├── services/         # Business logic
└── utils/            # Helper utilities
```

### Key Services
- **Authentication**: JWT-based user auth
- **Asset Management**: CRUD operations
- **IPFS Integration**: File storage & retrieval
- **Blockchain Interface**: Smart contract interactions

---

## 📁 IPFS Integration

### File Storage
- **Metadata Storage**: Asset details and properties
- **Image Storage**: Asset images and documents
- **Decentralized**: No single point of failure
- **Immutable**: Content-addressed storage

### Pinata Configuration
```javascript
const pinataSDK = require('@pinata/sdk');
const pinata = pinataSDK(apiKey, apiSecret);

// Upload to IPFS
const result = await pinata.pinJSONToIPFS(metadata);
```

---

## 🔐 Security Features

### Smart Contract Security
- **Role-based Access Control**: Admin, Issuer, Manager roles
- **Reentrancy Guards**: Protection against attacks
- **Pausable Contracts**: Emergency stop functionality
- **Input Validation**: Parameter checking

### Frontend Security
- **Wallet Signing**: All transactions require user approval
- **XSS Protection**: Input sanitization
- **CORS Configuration**: Secure API access
- **Environment Variables**: Sensitive data protection

### Backend Security
- **JWT Authentication**: Secure user sessions
- **Rate Limiting**: API abuse prevention
- **Input Validation**: Request sanitization
- **Database Security**: MongoDB security best practices

---

## 🎯 Getting Started

1. **Install Dependencies**
   ```bash
   # Frontend
   cd Frontend && npm install
   
   # Backend
   cd Backend && npm install
   ```

2. **Configure Environment**
   - Set up `.env` files for both frontend and backend
   - Add Pinata API keys for IPFS storage

3. **Start Development Servers**
   ```bash
   # Backend (Port 5000)
   cd Backend && npm start
   
   # Frontend (Port 3000)
   cd Frontend && npm run dev
   ```

4. **Connect MetaMask**
   - Add Sonic Testnet to MetaMask
   - Get testnet tokens from faucet
   - Connect wallet to the platform

5. **Deploy Contracts** (Optional)
   ```bash
   cd contracts
   npx hardhat run scripts/deploy.js --network sonic-testnet
   ```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License

---

## 🔗 Links

- **Frontend Demo**: [Live Demo](https://bezit.pages.dev)
- **Sonic Chain**: [Sonic Labs](https://www.soniclabs.com)
- **Block Explorer**: [Sonic Testnet Explorer](https://testnet.sonicscan.org)

---

## 📞 Support

For support and questions:
- **Issues**: [GitHub Issues](https://github.com/sarthakbansal7/bezit/issues)
- **Discussions**: [GitHub Discussions](https://github.com/sarthakbansal7/bezit/discussions)
---

**Built with ❤️ on Sonic Chain**
