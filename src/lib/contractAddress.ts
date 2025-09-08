// Contract Addresses Configuration
// Update these addresses when contracts are redeployed

export const CONTRACT_ADDRESSES = {
  // Sonic Testnet
  SONIC_TESTNET: {
    ADMIN: "0x071A4FCcEEe657c8d4729F664957e1777f6A719E",
    ERC1155_CORE: "0xF4Ef996bF8d60B1C17aFb174f3D0a5434139001c",
    ISSUER: "0xDc00F1531fdbB8995D03569A0c1bcd26dF84caC1", 
    MARKETPLACE: "0x7EBE05a43847d779b6e46bB1e5F9506155cAb249",
    PAYMENT_SPLITTER: "0xf344dd57a07Cf302F75502aa2Eb846593fDCa323"
  }
} as const;

// Network configuration
export const NETWORK_CONFIG = {
  SONIC_TESTNET: {
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
} as const;

// Current active network (change this to switch networks)
export const ACTIVE_NETWORK = "SONIC_TESTNET" as const;

// Export active contract addresses for easy import
export const CONTRACTS = CONTRACT_ADDRESSES[ACTIVE_NETWORK];

// Individual contract exports for convenience
export const ADMIN_CONTRACT = CONTRACTS.ADMIN;
export const TOKEN_CONTRACT = CONTRACTS.ERC1155_CORE;
export const ISSUER_CONTRACT = CONTRACTS.ISSUER;
export const MARKETPLACE_CONTRACT = CONTRACTS.MARKETPLACE;
export const PAYMENT_SPLITTER_CONTRACT = CONTRACTS.PAYMENT_SPLITTER;

// Type definitions
export type NetworkName = keyof typeof CONTRACT_ADDRESSES;
export type ContractName = keyof typeof CONTRACT_ADDRESSES.SONIC_TESTNET;

// Utility function to get contract address by name
export const getContractAddress = (contractName: ContractName, network: NetworkName = ACTIVE_NETWORK): string => {
  return CONTRACT_ADDRESSES[network][contractName];
};

// Utility function to get all contracts for a network
export const getNetworkContracts = (network: NetworkName = ACTIVE_NETWORK) => {
  return CONTRACT_ADDRESSES[network];
};

// Validation function to check if all addresses are set
export const validateContractAddresses = (network: NetworkName = ACTIVE_NETWORK): boolean => {
  const contracts = CONTRACT_ADDRESSES[network];
  return Object.values(contracts).every((address: string) => 
    address && address.length === 42 && address.startsWith("0x")
  );
};