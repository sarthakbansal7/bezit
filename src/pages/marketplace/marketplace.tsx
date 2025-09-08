

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Tabs, TabsContent, TabsTrigger, TabsList } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { ethers } from 'ethers';
import { BackgroundBeamsWithCollision } from '@/components/ui/background-beams-with-collision';
import BuyModal from '@/components/BuyModal';
import { fetchETHPrice, formatPriceInUSD, convertETHToUSD, formatETHWithUSD } from '@/utils/priceService';
import { useWallet } from '@/context/WalletContext';
import { MARKETPLACE_CONTRACT, TOKEN_CONTRACT, NETWORK_CONFIG, ACTIVE_NETWORK } from '@/lib/contractAddress';
import { MARKETPLACE_ABI } from '@/utils/marketplaceABI';

// Alternative RPC endpoints for Sonic Testnet
const SONIC_TESTNET_RPC_URLS = [
  "https://rpc.testnet.soniclabs.com",
  "https://rpc.testnet.soniclabs.com", // Backup - same URL as primary for now
  "https://rpc.testnet.soniclabs.com", // Backup - same URL as primary for now
  "https://rpc.testnet.soniclabs.com"  // Backup - same URL as primary for now
];

// Demo marketplace data for fallback when RPC is having issues
const DEMO_MARKETPLACE_DATA = [
  {
    tokenId: "1",
    name: "Luxury Villa in Miami",
    description: "A beautiful beachfront villa with stunning ocean views",
    image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400",
    price: "250000000000000000000000", // 250,000 S in Wei
    amount: 100,
    seller: "0x1234567890123456789012345678901234567890",
    metadataURI: "demo://villa-miami",
    attributes: [
      { trait_type: "Type", value: "Real Estate" },
      { trait_type: "Location", value: "Miami, FL" },
      { trait_type: "Area", value: "3,500 sq ft" },
      { trait_type: "Bedrooms", value: "4" },
      { trait_type: "Bathrooms", value: "3" }
    ]
  },
  {
    tokenId: "2",
    name: "Gold Bullion Investment",
    description: "Premium 1oz gold bars with certified authenticity",
    image: "https://images.unsplash.com/photo-1622976520928-53c6b59f4e7e?w=400",
    price: "2100000000000000000000", // 2,100 S in Wei
    amount: 50,
    seller: "0x2345678901234567890123456789012345678901",
    metadataURI: "demo://gold-bullion",
    attributes: [
      { trait_type: "Type", value: "Precious Metal" },
      { trait_type: "Weight", value: "1 oz" },
      { trait_type: "Purity", value: "99.99%" },
      { trait_type: "Certification", value: "LBMA Certified" }
    ]
  },
  {
    tokenId: "3",
    name: "Vintage Wine Collection",
    description: "Rare vintage wines from French vineyards",
    image: "https://images.unsplash.com/photo-1506377247886-a2c6fa3bf4fd?w=400",
    price: "5000000000000000000000", // 5,000 S in Wei
    amount: 25,
    seller: "0x3456789012345678901234567890123456789012",
    metadataURI: "demo://vintage-wine",
    attributes: [
      { trait_type: "Type", value: "Wine" },
      { trait_type: "Vintage", value: "1982" },
      { trait_type: "Region", value: "Bordeaux" },
      { trait_type: "Bottles", value: "12" }
    ]
  }
];

// Simple ABI for ERC1155 token contract to get metadata
const TOKEN_ABI = [
  "function uri(uint256 tokenId) external view returns (string memory)",
  "function tokenMetadata(uint256 tokenId) external view returns (string memory)",
  "function tokenPrice(uint256 tokenId) external view returns (uint256)"
];

interface MarketplaceListing {
  tokenId: string;
  name: string;
  description: string;
  image: string;
  price: string; // in Wei
  amount: number;
  seller: string;
  metadataURI: string;
  metadata?: any;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

const Marketplace: React.FC = () => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [showDetails, setShowDetails] = useState<MarketplaceListing | null>(null);
  const [ethPrice, setEthPrice] = useState<number>(2500); // Default S price
  const [priceLoading, setPriceLoading] = useState(true);
  
  // Wallet and contract integration
  const { provider, signer } = useWallet();
  const [marketplaceContract, setMarketplaceContract] = useState<ethers.Contract | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    initializeContract();
    loadETHPrice();
  }, [provider, signer]);

  useEffect(() => {
    if (marketplaceContract) {
      loadMarketplaceListings();
    }
  }, [marketplaceContract]);

  // Initialize marketplace contract with fallback RPC endpoints
  const initializeContract = async () => {
    try {
      console.log('🔄 Initializing marketplace contract...');
      console.log('Contract address:', MARKETPLACE_CONTRACT);
      console.log('Network:', ACTIVE_NETWORK);
      
      let providerToUse;
      
      if (!provider) {
        console.log('⚠️ No wallet provider, trying public RPC endpoints...');
        
        // Try multiple RPC endpoints
        for (let i = 0; i < SONIC_TESTNET_RPC_URLS.length; i++) {
          try {
            console.log(`🔄 Trying RPC endpoint ${i + 1}/${SONIC_TESTNET_RPC_URLS.length}: ${SONIC_TESTNET_RPC_URLS[i]}`);
            providerToUse = new ethers.providers.JsonRpcProvider(SONIC_TESTNET_RPC_URLS[i]);
            
            // Test the connection
            await providerToUse.getNetwork();
            console.log(`✅ Successfully connected to RPC endpoint ${i + 1}`);
            break;
          } catch (rpcError) {
            console.warn(`❌ RPC endpoint ${i + 1} failed:`, rpcError);
            if (i === SONIC_TESTNET_RPC_URLS.length - 1) {
              throw new Error('All RPC endpoints failed. Using demo data.');
            }
          }
        }
      } else {
        console.log('✅ Using wallet provider');
        providerToUse = provider;
      }

      // Check network if using wallet provider
      if (provider) {
        try {
          const network = await provider.getNetwork();
          console.log('Connected to network:', network.name, 'Chain ID:', network.chainId);
          console.log('Expected Chain ID:', NETWORK_CONFIG[ACTIVE_NETWORK].chainId);
          
          if (network.chainId !== NETWORK_CONFIG[ACTIVE_NETWORK].chainId) {
            throw new Error(`Wrong network! Please switch to ${NETWORK_CONFIG[ACTIVE_NETWORK].name}`);
          }
        } catch (networkError) {
          console.error('❌ Network check failed:', networkError);
          // Fall back to public RPC
          providerToUse = new ethers.providers.JsonRpcProvider(
            NETWORK_CONFIG[ACTIVE_NETWORK].rpcUrl
          );
        }
      }

      const signerToUse = signer || providerToUse;
      const contract = new ethers.Contract(MARKETPLACE_CONTRACT, MARKETPLACE_ABI, signerToUse);
      
      // Verify contract exists with retry logic
      let contractExists = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`🔍 Verifying contract exists (attempt ${attempt}/3)...`);
          const code = await providerToUse.getCode(MARKETPLACE_CONTRACT);
          if (code === '0x') {
            throw new Error('No contract found at address');
          }
          contractExists = true;
          console.log('✅ Contract verified at address:', MARKETPLACE_CONTRACT);
          break;
        } catch (verifyError) {
          console.warn(`⚠️ Contract verification attempt ${attempt} failed:`, verifyError);
          if (attempt === 3) {
            throw new Error('Marketplace contract not found after 3 attempts');
          }
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (contractExists) {
        setMarketplaceContract(contract);
        console.log('✅ Marketplace contract initialized successfully');
      }
      
    } catch (error: any) {
      console.error('❌ Error initializing marketplace contract:', error);
      console.log('🔄 Loading demo marketplace data as fallback...');
      
      // Load demo data when contract initialization fails
      setListings(DEMO_MARKETPLACE_DATA);
      setLoading(false);
      setError('Connected to demo marketplace data. Contract data unavailable due to network issues.');
      
      toast.error('Using demo data due to network issues', {
        duration: 4000,
      });
    }
  };

  const loadETHPrice = async () => {
    setPriceLoading(true);
    try {
      const price = await fetchETHPrice();
      setEthPrice(price);
      console.log(`S price loaded: $${price}`);
    } catch (error) {
      console.error('Failed to fetch S price:', error);
      toast.error('Failed to fetch S price, using fallback');
    } finally {
      setPriceLoading(false);
    }
  };

  // Simple IPFS metadata fetching - fast and reliable
  const fetchMetadataFromIPFS = async (metadataURI: string) => {
    try {
      console.log('🔄 Fetching metadata from IPFS:', metadataURI);
      
      // Convert IPFS URI to HTTP gateway URL
      const ipfsHash = metadataURI.replace('ipfs://', '');
      const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      
      console.log('� Fetching from:', ipfsUrl);
      
      // Fast fetch with timeout
      const response = await Promise.race([
        fetch(ipfsUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000)
        )
      ]) as Response;
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const metadata = await response.json();
      console.log('✅ Metadata fetched successfully:', metadata);
      
      // Simple image processing - just convert ipfs:// to gateway URL
      if (metadata.image) {
        if (metadata.image.startsWith('ipfs://')) {
          const imageHash = metadata.image.replace('ipfs://', '');
          metadata.image = `https://gateway.pinata.cloud/ipfs/${imageHash}`;
          console.log('✅ Converted IPFS image URL:', metadata.image);
        }
      }
      
      return metadata;
      
    } catch (error) {
      console.error('❌ Error fetching IPFS metadata:', error);
      return null;
    }
  };

  // Simple image URL processing - just convert IPFS to gateway URL
  const processImageURL = (imageUrl: string, metadata?: any): string => {
    if (!imageUrl) return '';
    
    // If it's already an HTTP URL, return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // If it's an IPFS URL, convert to HTTP gateway
    if (imageUrl.startsWith('ipfs://')) {
      const ipfsHash = imageUrl.replace('ipfs://', '');
      const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      console.log('✅ Converting IPFS URL:', imageUrl, '→', gatewayUrl);
      return gatewayUrl;
    }
    
    // If it's just a hash, assume it's IPFS
    if (imageUrl.match(/^[a-zA-Z0-9]{46,59}$/)) {
      return `https://gateway.pinata.cloud/ipfs/${imageUrl}`;
    }
    
    // Return as is for other formats
    return imageUrl;
  };

  // Simple and fast processing of individual listing
  const processListing = async (tokenId: any, issuer: string, amount: any, price: any, tokenContract: any): Promise<MarketplaceListing | null> => {
    try {
      const tokenIdStr = tokenId.toString();
      const amountNum = amount.toNumber();
      const priceStr = price.toString();
      
      console.log(`🔄 Processing token ${tokenIdStr}...`);
      
      // Quick metadata URI fetch
      let metadataURI = '';
      if (tokenContract) {
        try {
          metadataURI = await tokenContract.tokenMetadata(tokenIdStr);
        } catch (e) {
          try {
            metadataURI = await tokenContract.uri(tokenIdStr);
          } catch (e2) {
            console.warn('⚠️ No metadata URI for token:', tokenIdStr);
          }
        }
      }
      
      // Simple metadata fetch with timeout
      let metadata = null;
      if (metadataURI) {
        try {
          const ipfsHash = metadataURI.replace('ipfs://', '');
          const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
          
          const response = await Promise.race([
            fetch(ipfsUrl, { method: 'GET', headers: { 'Accept': 'application/json' } }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
          ]) as Response;
          
          if (response.ok) {
            metadata = await response.json();
            console.log('✅ Fast metadata fetch for token:', tokenIdStr);
          }
        } catch (e) {
          console.warn('⚠️ Fast metadata fetch failed for token:', tokenIdStr);
        }
      }
      
      // Determine asset type
      let assetType = 'Real Estate'; // Default
      if (metadata?.attributes) {
        const assetTypeAttr = metadata.attributes.find((attr: any) => 
          attr.trait_type === 'Asset Type'
        );
        assetType = assetTypeAttr?.value || assetType;
      }
      
      // Simple image processing - just convert ipfs:// to gateway URL
      let imageUrl = '';
      if (metadata?.image) {
        if (metadata.image.startsWith('ipfs://')) {
          const ipfsHash = metadata.image.replace('ipfs://', '');
          imageUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
        } else if (metadata.image.startsWith('http')) {
          imageUrl = metadata.image;
        }
      }
      
      // Fallback images
      if (!imageUrl || imageUrl.includes('placeholder')) {
        const fallbackImages = {
          'Real Estate': 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop',
          'Invoice': 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop',
          'Stocks': 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop',
          'CarbonCredit': 'https://images.unsplash.com/photo-1569163139342-de0874c4e2c5?w=800&h=600&fit=crop'
        };
        imageUrl = fallbackImages[assetType as keyof typeof fallbackImages] || fallbackImages['Real Estate'];
      }
      
      return {
        tokenId: tokenIdStr,
        name: metadata?.name || `Asset #${tokenIdStr}`,
        description: metadata?.description || `A tokenized asset with ID ${tokenIdStr}`,
        image: imageUrl,
        price: priceStr,
        amount: amountNum,
        seller: issuer,
        metadataURI,
        metadata,
        attributes: metadata?.attributes || [
          { trait_type: 'Asset Type', value: assetType },
          { trait_type: 'Token ID', value: tokenIdStr }
        ]
      };
      
    } catch (error) {
      console.error('❌ Error processing listing:', error);
      return null;
    }
  };

  const loadMarketplaceListings = async () => {
    if (!marketplaceContract) {
      console.log('⚠️ Marketplace contract not initialized');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log('🔄 Loading marketplace listings from contract...');
      
      // Call getAllListings from marketplace contract with retry logic
      let listingsData;
      let lastError;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`📞 Calling getAllListings (attempt ${attempt}/3)...`);
          listingsData = await marketplaceContract.getAllListings();
          console.log('📦 Raw listings data:', listingsData);
          console.log('📦 Raw listings data type:', typeof listingsData);
          console.log('📦 Raw listings data is array:', Array.isArray(listingsData));
          if (Array.isArray(listingsData)) {
            console.log('📦 Raw listings data length:', listingsData.length);
            listingsData.forEach((item, index) => {
              console.log(`📦 Item ${index}:`, item, 'Type:', typeof item, 'IsArray:', Array.isArray(item));
            });
          }
          break;
        } catch (callError: any) {
          console.warn(`⚠️ getAllListings attempt ${attempt} failed:`, callError);
          lastError = callError;
          
          // If this is a missing trie node error, try with fallback RPC provider
          if (callError.message?.includes('missing trie node') && attempt < 3) {
            console.log('🔄 Trying with fallback RPC provider...');
            try {
              const fallbackProvider = new ethers.providers.JsonRpcProvider(
                SONIC_TESTNET_RPC_URLS[attempt % SONIC_TESTNET_RPC_URLS.length]
              );
              const fallbackContract = new ethers.Contract(MARKETPLACE_CONTRACT, MARKETPLACE_ABI, fallbackProvider);
              listingsData = await fallbackContract.getAllListings();
              console.log('✅ Success with fallback RPC provider!');
              break;
            } catch (fallbackError) {
              console.warn('❌ Fallback RPC also failed:', fallbackError);
            }
          }
          
          if (attempt === 3) {
            // On final attempt, check if it's a network/state issue
            if (callError.code === 'CALL_EXCEPTION' || callError.message?.includes('missing trie node')) {
              throw new Error('Network synchronization issue. Please try again in a few minutes.');
            } else if (callError.message?.includes('revert')) {
              throw new Error('Smart contract call failed. The marketplace may be paused or have no listings.');
            } else {
              throw callError;
            }
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      if (!listingsData) {
        throw new Error('Failed to get listings data after 3 attempts');
      }

      console.log('🔍 Analyzing getAllListings response structure:', listingsData);
      console.log('📊 Response type:', typeof listingsData);
      console.log('📊 Is array:', Array.isArray(listingsData));
      console.log('📊 Response length:', listingsData.length);
      console.log('📊 First element:', listingsData[0]);
      
      // Handle different response formats from getAllListings
      let tokenIds, issuers, amounts, prices;
      
      if (Array.isArray(listingsData)) {
        // Check if it's the expected 4-array format or just token IDs
        if (listingsData.length === 4 && Array.isArray(listingsData[0])) {
          // Expected format: [tokenIds[], issuers[], amounts[], prices[]]
          [tokenIds, issuers, amounts, prices] = listingsData;
          console.log('✅ Successfully extracted 4 arrays from response');
        } else if (listingsData.length > 0 && listingsData[0]?._isBigNumber) {
          // Contract is only returning token IDs - fetch other data manually
          console.log('⚠️ Contract returned only token IDs, fetching additional data...');
          tokenIds = listingsData;
          issuers = [];
          amounts = [];
          prices = [];
          
          // Fetch individual listing data for each token
          for (let i = 0; i < tokenIds.length; i++) {
            try {
              const tokenId = tokenIds[i].toString();
              console.log(`🔍 Fetching listing data for token ${tokenId}...`);
              
              // Get listing data from contract
              const listing = await marketplaceContract.listings(tokenId);
              console.log(`📋 Listing for token ${tokenId}:`, listing);
              
              issuers.push(listing.issuer);
              amounts.push(listing.amount);
              
              // Try to get price from token contract
              try {
                const tokenContractAddress = await marketplaceContract.tokenContract();
                const tokenContract = new ethers.Contract(tokenContractAddress, TOKEN_ABI, marketplaceContract.provider);
                const tokenPrice = await tokenContract.tokenPrice(tokenId);
                prices.push(tokenPrice);
                console.log(`💰 Token ${tokenId} price: ${ethers.utils.formatEther(tokenPrice)} S`);
              } catch (priceError) {
                console.warn(`⚠️ Could not fetch price for token ${tokenId}:`, priceError);
                prices.push(ethers.utils.parseEther("1000")); // Default price
              }
              
            } catch (tokenError) {
              console.error(`❌ Error fetching data for token ${tokenIds[i]}:`, tokenError);
              // Use default values
              issuers.push("0x0000000000000000000000000000000000000000");
              amounts.push(ethers.BigNumber.from(0));
              prices.push(ethers.utils.parseEther("1000"));
            }
          }
        } else {
          console.error('❌ Unexpected response structure from getAllListings');
          console.log('Expected: 4 arrays [tokenIds, issuers, amounts, prices] or array of token IDs');
          console.log('Received:', listingsData);
          throw new Error('Invalid response structure from marketplace contract');
        }
      } else {
        throw new Error('getAllListings did not return an array');
      }
      
      console.log('📊 Extracted data:');
      console.log('- Token IDs:', tokenIds);
      console.log('- Issuers:', issuers);
      console.log('- Amounts:', amounts);
      console.log('- Prices:', prices);

      if (!tokenIds || tokenIds.length === 0) {
        console.log('ℹ️ No listings found in marketplace');
        setListings([]);
        setLoading(false);
        toast('No assets currently listed on the marketplace', {
          icon: 'ℹ️',
        });
        return;
      }

      console.log(`📊 Found ${tokenIds.length} listings in marketplace`);
      
      // Initialize token contract for metadata fetching with fallback
      let tokenContract;
      try {
        const signerOrProvider = signer || provider || new ethers.providers.JsonRpcProvider(
          NETWORK_CONFIG[ACTIVE_NETWORK].rpcUrl
        );
        tokenContract = new ethers.Contract(TOKEN_CONTRACT, TOKEN_ABI, signerOrProvider);
      } catch (tokenContractError) {
        console.error('❌ Failed to initialize token contract:', tokenContractError);
        // Continue without token contract - use fallback metadata
      }
      
      // Process each listing and fetch metadata
      const processedListings: MarketplaceListing[] = [];
      
      for (let i = 0; i < tokenIds.length; i++) {
        try {
          // Safely convert BigNumbers to appropriate types
          const tokenId = ethers.BigNumber.isBigNumber(tokenIds[i]) ? tokenIds[i].toString() : tokenIds[i].toString();
          const issuer = issuers[i];
          const amount = ethers.BigNumber.isBigNumber(amounts[i]) ? amounts[i].toNumber() : Number(amounts[i]);
          const price = ethers.BigNumber.isBigNumber(prices[i]) ? prices[i].toString() : prices[i].toString();
          
          console.log(`🔄 Processing listing ${i + 1}/${tokenIds.length}:`, {
            tokenId,
            issuer,
            amount,
            priceInETH: ethers.utils.formatEther(price),
            priceInWei: price
          });
          
          // Get token metadata URI from token contract with fallback
          let metadataURI = '';
          if (tokenContract) {
            try {
              // Try tokenMetadata first (custom function)
              metadataURI = await tokenContract.tokenMetadata(tokenId);
              console.log('✅ Got metadata URI from tokenMetadata:', metadataURI);
            } catch (e) {
              try {
                // Fallback to uri function (standard ERC1155)
                metadataURI = await tokenContract.uri(tokenId);
                console.log('✅ Got metadata URI from uri:', metadataURI);
              } catch (e2) {
                console.warn('⚠️ Could not get metadata URI for token:', tokenId);
                metadataURI = ''; // Will use fallback data
              }
            }
          }
          
          // Fetch metadata from IPFS if URI available
          let metadata = null;
          if (metadataURI && metadataURI !== '') {
            metadata = await fetchMetadataFromIPFS(metadataURI);
          }
          
          // Determine asset type from metadata or use fallback
          let assetType = 'Unknown';
          if (metadata?.attributes) {
            const assetTypeAttr = metadata.attributes.find((attr: any) => 
              attr.trait_type === 'Asset Type'
            );
            assetType = assetTypeAttr?.value || assetType;
          } else if (metadata?.assetDetails) {
            assetType = metadata.assetDetails.assetType || assetType;
          }
          
          // Create fallback data if metadata is not available
          const fallbackImages = {
            'Real Estate': 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop',
            'Invoice': 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop',
            'Commodity': 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=800&h=600&fit=crop',
            'Stocks': 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop',
            'CarbonCredit': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
            'Gold': 'https://images.unsplash.com/photo-1622976520928-53c6b59f4e7e?w=800&h=600&fit=crop',
            'Wine': 'https://images.unsplash.com/photo-1506377247886-a2c6fa3bf4fd?w=800&h=600&fit=crop',
            'Art': 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop',
            'Unknown': 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop'
          };
          
          const fallbackImage = fallbackImages[assetType as keyof typeof fallbackImages] || fallbackImages['Unknown'];
          
          // Simple image processing - just convert ipfs:// to gateway URL
          let imageUrl = '';
          if (metadata?.image) {
            if (metadata.image.startsWith('ipfs://')) {
              const imageHash = metadata.image.replace('ipfs://', '');
              imageUrl = `https://gateway.pinata.cloud/ipfs/${imageHash}`;
              console.log('✅ Converted IPFS image URL:', metadata.image, '→', imageUrl);
            } else if (metadata.image.startsWith('http')) {
              imageUrl = metadata.image;
            }
          }
          
          // Use fallback image if no image found or placeholder
          if (!imageUrl || imageUrl.includes('placeholder')) {
            imageUrl = fallbackImage;
          }
          
          console.log('🖼️ Final image URL for asset:', imageUrl);
          
          const listing: MarketplaceListing = {
            tokenId,
            name: metadata?.name || `Asset Token #${tokenId}`,
            description: metadata?.description || `Asset token listed on the marketplace. Token ID: ${tokenId}`,
            image: imageUrl,
            price,
            amount,
            seller: issuer,
            metadataURI: metadataURI || `placeholder-${tokenId}`,
            metadata,
            attributes: metadata?.attributes || [
              { trait_type: "Asset Type", value: assetType }
            ]
          };
          
          processedListings.push(listing);
          
        } catch (listingError) {
          console.error(`❌ Error processing listing ${i}:`, listingError);
          // Continue with next listing - don't fail entire load
        }
      }
      
      setListings(processedListings);
      console.log('✅ Marketplace listings loaded:', processedListings.length);
      
      if (processedListings.length === 0) {
        toast('No assets could be loaded from the marketplace', {
          icon: 'ℹ️',
        });
      } else {
        toast.success(`${processedListings.length} assets loaded from marketplace`);
      }
      
    } catch (error: any) {
      console.error('❌ Error loading marketplace listings:', error);
      
      let errorMessage = 'Failed to load marketplace listings';
      if (error.message?.includes('Network synchronization')) {
        errorMessage = 'Network synchronization issue. Loading demo data as fallback.';
      } else if (error.message?.includes('Smart contract call failed')) {
        errorMessage = 'Marketplace contract unavailable. Loading demo data as fallback.';
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network connection issue. Loading demo data as fallback.';
      } else {
        errorMessage = 'Contract data unavailable. Loading demo data as fallback.';
      }
      
      // Load demo data as fallback
      console.log('🔄 Loading demo marketplace data as fallback...');
      setListings(DEMO_MARKETPLACE_DATA);
      setError(errorMessage);
      
      toast.error(errorMessage, {
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseSuccess = () => {
    // Reload listings after successful purchase
    loadMarketplaceListings();
    toast.success('Purchase completed! Refreshing marketplace...');
  };

  if (loading) {
    return (
      <div className="min-h-screen h-screen w-full bg-white flex items-center justify-center">
        <BackgroundBeamsWithCollision>
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            <div className="text-black text-xl font-medium">Loading marketplace...</div>
            <div className="text-gray-600 text-sm">Please wait</div>
          </div>
        </BackgroundBeamsWithCollision>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen h-screen w-full bg-white flex items-center justify-center">
        <BackgroundBeamsWithCollision>
          <div className="flex flex-col items-center space-y-4 text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="text-black text-xl font-medium">Connection Error</div>
            <div className="text-gray-600 text-sm">{error}</div>
            <div className="flex flex-col space-y-2">
              <button 
                onClick={() => {
                  setError('');
                  initializeContract();
                }} 
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Retry Connection
              </button>
              <button 
                onClick={() => window.location.reload()} 
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </BackgroundBeamsWithCollision>
      </div>
    );
  }

  // Filter listings by category
  const realEstateListings = listings?.filter(listing => {
    const assetType = listing.attributes?.find(attr => 
      attr.trait_type === 'Asset Type'
    )?.value;
    return assetType?.toLowerCase() === 'real estate';
  }) || [];

  const invoiceListings = listings?.filter(listing => {
    const assetType = listing.attributes?.find(attr => 
      attr.trait_type === 'Asset Type'
    )?.value;
    return assetType?.toLowerCase() === 'invoice';
  }) || [];

  const commodityListings = listings?.filter(listing => {
    const assetType = listing.attributes?.find(attr => 
      attr.trait_type === 'Asset Type'
    )?.value;
    return assetType?.toLowerCase() === 'commodity';
  }) || [];

  const stockListings = listings?.filter(listing => {
    const assetType = listing.attributes?.find(attr => 
      attr.trait_type === 'Asset Type'
    )?.value;
    return assetType?.toLowerCase() === 'stocks';
  }) || [];

  const carbonCreditListings = listings?.filter(listing => {
    const assetType = listing.attributes?.find(attr => 
      attr.trait_type === 'Asset Type'
    )?.value;
    return assetType?.toLowerCase() === 'carboncredit';
  }) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50/30 to-gray-100">
      {/* Professional Header */}
      <header className="backdrop-blur-lg bg-white/90 border-b border-gray-200/60 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div 
              className="flex items-center space-x-3 cursor-pointer group"
              onClick={() => navigate('/')}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-black rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-6 text-sm">
                <span className="text-gray-600 hover:text-gray-900 cursor-pointer transition-colors">Explore</span>
                <span className="text-gray-600 hover:text-gray-900 cursor-pointer transition-colors">About</span>
                <span className="text-gray-600 hover:text-gray-900 cursor-pointer transition-colors">Help</span>
              </div>
              <button 
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="font-medium">My Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Demo Data Warning Banner */}
      {error && error.includes('demo') && (
        <div className="bg-yellow-50 border border-yellow-200 px-6 py-4">
          <div className="container mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-yellow-800 font-medium">Demo Mode Active</h3>
                  <p className="text-yellow-700 text-sm">{error}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setError('');
                    initializeContract();
                  }}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Retry Live Data</span>
                </button>
                <button
                  onClick={() => setError('')}
                  className="p-2 text-yellow-600 hover:text-yellow-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Featured Properties Carousel */}
      <div className="container mx-auto px-6 pt-8 pb-12">
        <FeaturedPropertiesCarousel 
          listings={listings.slice(0, 3)} 
          onSelectListing={setSelectedListing}
          onViewDetails={setShowDetails}
          tokenPrice={ethPrice}
        />
        
        {/* See All Listings Section */}
        <div className="mt-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">See All Listings</h2>
              <p className="text-gray-600">Explore our complete collection of tokenized real-world assets</p>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={loadMarketplaceListings}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors flex items-center space-x-2"
                title="Refresh listings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
              <button className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Professional Tabs */}
        <Tabs defaultValue="realEstate" className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="inline-flex bg-white/80 backdrop-blur-sm p-1 rounded-2xl shadow-lg border border-gray-200/50">
              <ProfessionalTab title="Real Estate" icon="🏘️" value="realEstate" />
              <ProfessionalTab title="Invoices" icon="📄" value="invoices" />
              <ProfessionalTab title="Commodities" icon="⚡" value="commodities" />
              <ProfessionalTab title="Stocks" icon="📈" value="stocks" />
              <ProfessionalTab title="Carbon Credits" icon="🌱" value="carbonCredits" />
            </TabsList>
          </div>

          <TabsContent value="realEstate">
            <ProfessionalListingsGrid 
              listings={realEstateListings} 
              category="Real Estate" 
              onSelectListing={setSelectedListing}
              tokenPrice={ethPrice}
              loading={loading}
            />
          </TabsContent>
          <TabsContent value="invoices">
            <ProfessionalListingsGrid 
              listings={invoiceListings} 
              category="Invoices"
              onSelectListing={setSelectedListing}
              tokenPrice={ethPrice}
              loading={loading}
            />
          </TabsContent>
          <TabsContent value="commodities">
            <ProfessionalListingsGrid 
              listings={commodityListings} 
              category="Commodities"
              onSelectListing={setSelectedListing}
              tokenPrice={ethPrice}
              loading={loading}
            />
          </TabsContent>
          <TabsContent value="stocks">
            <ProfessionalListingsGrid 
              listings={stockListings} 
              category="Stocks"
              onSelectListing={setSelectedListing}
              tokenPrice={ethPrice}
              loading={loading}
            />
          </TabsContent>
          <TabsContent value="carbonCredits">
            <ProfessionalListingsGrid 
              listings={carbonCreditListings} 
              category="Carbon Credits"
              onSelectListing={setSelectedListing}
              tokenPrice={ethPrice}
              loading={loading}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Buy Modal */}
      {selectedListing && (
        <BuyModal
          asset={{
            tokenId: selectedListing.tokenId,
            name: selectedListing.name,
            description: selectedListing.description,
            price: selectedListing.price, // Price in Wei
            amount: selectedListing.amount,
            image: selectedListing.image,
            seller: selectedListing.seller,
            metadata: selectedListing.metadata
          }}
          onClose={() => setSelectedListing(null)}
          onSuccess={handlePurchaseSuccess}
          tokenPrice={ethPrice}
        />
      )}

      {/* Details Modal */}
      {showDetails && (
        <ProfessionalExpandedDetail 
          listing={showDetails} 
          onClose={() => setShowDetails(null)}
          onBuy={(listing) => {
            setShowDetails(null);
            setSelectedListing(listing);
          }}
          tokenPrice={ethPrice}
        />
      )}
    </div>
  );
}

// Robust Image Component with fallbacks
const RobustImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
}> = ({ src, alt, className = '', fallbackSrc }) => {
  // If src is a placeholder, immediately use fallback
  const initialSrc = (src === 'placeholder-for-uploaded-image' || !src) && fallbackSrc ? fallbackSrc : src;
  
  const [imgSrc, setImgSrc] = useState(initialSrc);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    console.warn('❌ Image failed to load:', imgSrc);
    setHasError(true);
    
    // Try fallback image if available
    if (fallbackSrc && imgSrc !== fallbackSrc) {
      console.log('🔄 Trying fallback image:', fallbackSrc);
      setImgSrc(fallbackSrc);
      setHasError(false);
    } else {
      // Use a generic fallback
      const genericFallback = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop';
      if (imgSrc !== genericFallback) {
        console.log('🔄 Using generic fallback image');
        setImgSrc(genericFallback);
        setHasError(false);
      }
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    console.log('✅ Image loaded successfully:', imgSrc);
  };

  useEffect(() => {
    // If src is a placeholder, immediately use fallback
    const newSrc = (src === 'placeholder-for-uploaded-image' || !src) && fallbackSrc ? fallbackSrc : src;
    setImgSrc(newSrc);
    setIsLoading(true);
    setHasError(false);
  }, [src, fallbackSrc]);

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 animate-pulse">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      <img
        src={imgSrc}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={handleLoad}
        onError={handleError}
      />
      {hasError && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-500">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-xs">Image unavailable</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Featured Properties Carousel Component
const FeaturedPropertiesCarousel: React.FC<{ 
  listings: MarketplaceListing[];
  onSelectListing: (listing: MarketplaceListing) => void;
  onViewDetails: (listing: MarketplaceListing) => void;
  tokenPrice: number;
}> = ({ listings, onSelectListing, onViewDetails, tokenPrice }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % listings.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [listings.length]);

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % listings.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + listings.length) % listings.length);
  };

  if (listings.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-black shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(75,85,99,0.2),transparent_50%)]"></div>
      
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="flex flex-col lg:flex-row"
          >
            {/* Image Section */}
            <div className="lg:w-1/2 relative">
              <RobustImage
                src={listings[currentIndex].image}
                alt={listings[currentIndex].name}
                className="w-full h-64 lg:h-96 object-cover"
                fallbackSrc="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
              
              {/* Featured Badge */}
              <div className="absolute top-6 left-6">
                <span className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black rounded-full text-sm font-bold shadow-lg">
                  ⭐ FEATURED
                </span>
              </div>
            </div>

            {/* Content Section */}
            <div className="lg:w-1/2 p-8 lg:p-12 text-white flex flex-col justify-center">
              <div className="mb-4">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                  {listings[currentIndex].attributes.find(attr => attr.trait_type === 'Asset Type')?.value}
                </span>
              </div>
              
              <h3 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight">
                {listings[currentIndex].name}
              </h3>
              
              <p className="text-lg text-gray-100 mb-6 leading-relaxed">
                {listings[currentIndex].description}
              </p>
              
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {formatPriceInUSD(parseFloat(listings[currentIndex].price) / Math.pow(10, 18), tokenPrice)}
                  </div>
                  <div className="text-gray-200 text-sm">
                    Price per token ({(parseFloat(listings[currentIndex].price) / Math.pow(10, 18)).toFixed(4)} S)
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-green-400 font-bold">Token #{listings[currentIndex].tokenId}</div>
                  <div className="text-gray-200 text-sm">{listings[currentIndex].amount} Available</div>
                </div>
              </div>

              <div className="flex space-x-4">
                <button 
                  onClick={() => onViewDetails(listings[currentIndex])}
                  className="flex-1 px-6 py-3 bg-white text-gray-900 rounded-xl hover:bg-gray-50 transition-all duration-300 font-semibold shadow-lg"
                >
                  View Details
                </button>
                <button 
                  onClick={() => onSelectListing(listings[currentIndex])}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-xl hover:from-gray-800 hover:to-gray-900 transition-all duration-300 font-semibold shadow-lg"
                >
                  Invest Now
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Indicators */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {listings.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'bg-white shadow-lg' 
                  : 'bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Professional Tab Component
const ProfessionalTab: React.FC<{
  title: string;
  icon: string;
  value: string;
}> = ({ title, icon, value }) => (
  <TabsTrigger 
    value={value}
    className="px-6 py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-300 font-medium text-gray-700 data-[state=active]:text-gray-900"
  >
    <span className="mr-2 text-lg">{icon}</span>
    {title}
  </TabsTrigger>
);

// Professional Listings Grid
const ProfessionalListingsGrid: React.FC<{ 
  listings: MarketplaceListing[];
  category: string;
  onSelectListing: (listing: MarketplaceListing) => void;
  tokenPrice: number;
  loading?: boolean;
}> = ({ listings, category, onSelectListing, tokenPrice, loading = false }) => {
  const [activeListing, setActiveListing] = useState<MarketplaceListing | null>(null);

  // Show loading state
  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <svg className="w-12 h-12 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Loading {category}...</h3>
        <p className="text-gray-600">Please wait while we fetch the latest listings from the blockchain.</p>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">No {category} Available</h3>
        <p className="text-gray-600">Check back later for new listings in this category.</p>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {activeListing && (
          <ProfessionalExpandedDetail 
            listing={activeListing} 
            onClose={() => setActiveListing(null)}
            onBuy={(listing) => onSelectListing(listing)}
            tokenPrice={tokenPrice}
          />
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {listings.map((listing, index) => (
          <motion.div
            key={listing.tokenId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            layoutId={`listing-${listing.tokenId}`}
            onClick={() => setActiveListing(listing)}
            className="group bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer border border-gray-200/50 hover:border-gray-300/50 overflow-hidden hover:scale-[1.02]"
          >
            <div className="relative overflow-hidden">
              <RobustImage
                src={listing.image} 
                alt={listing.name}
                className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-700"
                fallbackSrc="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop"
              />
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700 border border-gray-200/50">
                  {listing.attributes.find(attr => attr.trait_type === 'Asset Type')?.value}
                </span>
              </div>
              <div className="absolute top-4 right-4">
                <span className="px-2 py-1 bg-blue-500/90 backdrop-blur-sm rounded-full text-xs font-medium text-white border border-blue-400/50">
                  #{listing.tokenId}
                </span>
              </div>
            </div>
            
            <div className="p-6">
              <h3 className="font-bold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors line-clamp-1">
                {listing.name}
              </h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                {listing.description}
              </p>
              
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-black bg-clip-text text-transparent">
                    {formatPriceInUSD(parseFloat(listing.price) / Math.pow(10, 18), tokenPrice)}
                  </p>
                  <p className="text-xs text-gray-500">Price per token ({(parseFloat(listing.price) / Math.pow(10, 18)).toFixed(4)} S)</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">{listing.amount} Available</p>
                  <p className="text-xs text-gray-500">Tokens</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-gray-600">Available Now</span>
                </div>
                <button 
                  className="px-4 py-2 bg-gradient-to-r from-gray-800 to-black text-white rounded-xl hover:from-gray-900 hover:to-gray-800 transition-all duration-300 shadow-md hover:shadow-lg text-sm font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectListing(listing);
                  }}
                >
                  Buy Asset
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </>
  );
};

// Professional Expanded Detail Component
const ProfessionalExpandedDetail: React.FC<{
  listing: MarketplaceListing;
  onClose: () => void;
  onBuy: (listing: MarketplaceListing) => void;
  tokenPrice: number;
}> = ({ listing, onClose, onBuy, tokenPrice }) => (
  <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-10 p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200/50"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex flex-col lg:flex-row h-full max-h-[90vh] overflow-y-auto">
        <div className="lg:w-1/2 relative">
          <RobustImage
            src={listing.image}
            alt={listing.name}
            className="w-full h-64 lg:h-full object-cover"
            fallbackSrc="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop"
          />
          <div className="absolute bottom-6 left-6">
            <span className="px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium text-gray-700 border border-gray-200/50">
              {listing.attributes.find(attr => attr.trait_type === 'Asset Type')?.value}
            </span>
          </div>
        </div>

        <div className="lg:w-1/2 p-8 flex flex-col justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{listing.name}</h2>
            
            <div className="mb-6">
              <div className="flex items-baseline space-x-4 mb-2">
                <span className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-black bg-clip-text text-transparent">
                  {formatPriceInUSD(parseFloat(listing.price) / Math.pow(10, 18), tokenPrice)}
                </span>
                <span className="text-lg text-gray-500">Price per token</span>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Available Now</span>
                </div>
                <span>•</span>
                <span>{(parseFloat(listing.price) / Math.pow(10, 18)).toFixed(4)} S per token</span>
                <span>•</span>
                <span>Seller: {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}</span>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
              <p className="text-gray-600 leading-relaxed">{listing.description}</p>
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Token ID - Always show first */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200/50">
                  <div className="text-blue-600 text-sm font-medium">Platform ID</div>
                  <div className="text-blue-900 font-semibold mt-1">#{listing.tokenId}</div>
                </div>
                {/* Available Amount */}
                <div className="bg-green-50 rounded-xl p-4 border border-green-200/50">
                  <div className="text-green-600 text-sm font-medium">Available Amount</div>
                  <div className="text-green-900 font-semibold mt-1">{listing.amount} tokens</div>
                </div>
                
                {/* Asset-specific details from metadata.assetDetails */}
                {listing.metadata?.assetDetails && (() => {
                  const assetType = listing.attributes?.find(attr => attr.trait_type === 'Asset Type')?.value;
                  const assetDetails = listing.metadata.assetDetails;
                  
                  // Real Estate specific fields
                  if (assetType === 'Real Estate') {
                    return (
                      <>
                        {assetDetails.size && (
                          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200/50">
                            <div className="text-purple-600 text-sm font-medium">Size</div>
                            <div className="text-purple-900 font-semibold mt-1">{assetDetails.size} sq ft</div>
                          </div>
                        )}
                        {assetDetails.bedrooms && (
                          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200/50">
                            <div className="text-purple-600 text-sm font-medium">Bedrooms</div>
                            <div className="text-purple-900 font-semibold mt-1">{assetDetails.bedrooms}</div>
                          </div>
                        )}
                        {assetDetails.location && (
                          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200/50 sm:col-span-2">
                            <div className="text-purple-600 text-sm font-medium">Location</div>
                            <div className="text-purple-900 font-semibold mt-1">{assetDetails.location}</div>
                          </div>
                        )}
                      </>
                    );
                  }
                  
                  // Invoice specific fields
                  if (assetType === 'Invoice') {
                    return (
                      <>
                        {assetDetails.issuer && (
                          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200/50">
                            <div className="text-orange-600 text-sm font-medium">Issuer Company</div>
                            <div className="text-orange-900 font-semibold mt-1">{assetDetails.issuer}</div>
                          </div>
                        )}
                        {assetDetails.dueDate && (
                          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200/50">
                            <div className="text-orange-600 text-sm font-medium">Due Date</div>
                            <div className="text-orange-900 font-semibold mt-1">{assetDetails.dueDate}</div>
                          </div>
                        )}
                        {assetDetails.riskRating && (
                          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200/50">
                            <div className="text-orange-600 text-sm font-medium">Risk Rating</div>
                            <div className="text-orange-900 font-semibold mt-1">{assetDetails.riskRating}</div>
                          </div>
                        )}
                      </>
                    );
                  }
                  
                  // Commodity specific fields
                  if (assetType === 'Commodity') {
                    return (
                      <>
                        {assetDetails.weight && (
                          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200/50">
                            <div className="text-yellow-600 text-sm font-medium">Weight</div>
                            <div className="text-yellow-900 font-semibold mt-1">{assetDetails.weight}</div>
                          </div>
                        )}
                        {assetDetails.purity && (
                          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200/50">
                            <div className="text-yellow-600 text-sm font-medium">Purity</div>
                            <div className="text-yellow-900 font-semibold mt-1">{assetDetails.purity}</div>
                          </div>
                        )}
                        {assetDetails.storage && (
                          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200/50 sm:col-span-2">
                            <div className="text-yellow-600 text-sm font-medium">Storage Location</div>
                            <div className="text-yellow-900 font-semibold mt-1">{assetDetails.storage}</div>
                          </div>
                        )}
                      </>
                    );
                  }
                  
                  // Stocks specific fields
                  if (assetType === 'Stocks') {
                    return (
                      <>
                        {assetDetails.symbol && (
                          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200/50">
                            <div className="text-indigo-600 text-sm font-medium">Stock Symbol</div>
                            <div className="text-indigo-900 font-semibold mt-1">{assetDetails.symbol}</div>
                          </div>
                        )}
                        {assetDetails.exchange && (
                          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200/50">
                            <div className="text-indigo-600 text-sm font-medium">Exchange</div>
                            <div className="text-indigo-900 font-semibold mt-1">{assetDetails.exchange}</div>
                          </div>
                        )}
                        {assetDetails.sector && (
                          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200/50">
                            <div className="text-indigo-600 text-sm font-medium">Sector</div>
                            <div className="text-indigo-900 font-semibold mt-1">{assetDetails.sector}</div>
                          </div>
                        )}
                      </>
                    );
                  }
                  
                  // Carbon Credits specific fields
                  if (assetType === 'CarbonCredit') {
                    return (
                      <>
                        {assetDetails.standard && (
                          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200/50">
                            <div className="text-emerald-600 text-sm font-medium">Standard</div>
                            <div className="text-emerald-900 font-semibold mt-1">{assetDetails.standard}</div>
                          </div>
                        )}
                        {assetDetails.projectType && (
                          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200/50">
                            <div className="text-emerald-600 text-sm font-medium">Project Type</div>
                            <div className="text-emerald-900 font-semibold mt-1">{assetDetails.projectType}</div>
                          </div>
                        )}
                        {assetDetails.co2Offset && (
                          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200/50">
                            <div className="text-emerald-600 text-sm font-medium">CO2 Offset</div>
                            <div className="text-emerald-900 font-semibold mt-1">{assetDetails.co2Offset} tons</div>
                          </div>
                        )}
                      </>
                    );
                  }
                  
                  return null;
                })()}
                
                {/* Other general attributes */}
                {listing.attributes?.map((attr) => (
                  <div key={attr.trait_type} className="bg-gray-50 rounded-xl p-4 border border-gray-200/50">
                    <div className="text-gray-500 text-sm font-medium">{attr.trait_type}</div>
                    <div className="text-gray-900 font-semibold mt-1">{attr.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex space-x-4">
            <button 
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Close
            </button>
            <button 
              className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-800 to-black text-white rounded-xl hover:from-gray-900 hover:to-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
              onClick={() => onBuy(listing)}
            >
              Buy Asset
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  </motion.div>
);

export default Marketplace;