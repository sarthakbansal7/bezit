import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LabelInputContainer } from '@/components/ui/form-utils';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Copy, Home, TrendingUp, Building2, Plus, FileText, BarChart3, Shield, Users, Globe, Sun, Moon, Loader2, Wallet, RefreshCw, ExternalLink, Trash2 } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { ethers } from 'ethers';
import { ADMIN_CONTRACT, ISSUER_CONTRACT, MARKETPLACE_CONTRACT, TOKEN_CONTRACT, NETWORK_CONFIG, ACTIVE_NETWORK } from '@/lib/contractAddress';
import { ADMIN_ABI } from '@/utils/adminABI';
import { ISSUER_ABI } from '@/utils/issuerABI';
import { MARKETPLACE_ABI } from '@/utils/marketplaceABI';
import { uploadJSONToPinata, uploadToPinata } from '@/utils/pinata';

const assetTypes = [
  'Real Estate',
  'Invoice',
  'Commodity',
  'Stocks',
  'CarbonCredit',
];

const priceTokens = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
];

const Issuer: React.FC = () => {
  // Wallet integration
  const { address, isConnected, connectWallet, provider, signer } = useWallet();
  
  // Authorization state
  const [isAuthorizedIssuer, setIsAuthorizedIssuer] = useState<boolean | null>(null);
  const [authCheckLoading, setAuthCheckLoading] = useState(false);
  
  // Contract state
  const [adminContract, setAdminContract] = useState<ethers.Contract | null>(null);
  const [issuerContract, setIssuerContract] = useState<ethers.Contract | null>(null);
  const [marketplaceContract, setMarketplaceContract] = useState<ethers.Contract | null>(null);
  
  // Contract data state
  const [contractIssuers, setContractIssuers] = useState<{
    addresses: string[], 
    count: number, 
    metadata: Record<string, string>
  }>({ addresses: [], count: 0, metadata: {} });
  const [isLoadingContractData, setIsLoadingContractData] = useState(false);
  
  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Main navigation state
  const [currentView, setCurrentView] = useState<'dashboard' | 'mint' | 'list'>('dashboard');

  // Dialog states
  const [showNFTDialog, setShowNFTDialog] = useState(false);

  // NFT form state
  const [mintStep, setMintStep] = useState(1);
  const [tokenType, setTokenType] = useState<'ERC20' | 'NFT'>('ERC20');
  const [nftTitle, setNftTitle] = useState('');
  const [nftDescription, setNftDescription] = useState('');
  const [nftAssetType, setNftAssetType] = useState(0);
  const [nftPriceToken, setNftPriceToken] = useState('USD');
  const [nftPricePerToken, setNftPricePerToken] = useState('1.0'); // Price per token in S (used for both reference and marketplace)
  const [nftEarnXP, setNftEarnXP] = useState('32000');
  const [nftImageFiles, setNftImageFiles] = useState<File[]>([]);
  const [nftId, setNftId] = useState('');
  const [nftAmount, setNftAmount] = useState('');
  const [isMinting, setIsMinting] = useState(false);

  // Real Estate specific fields
  const [realEstateSize, setRealEstateSize] = useState('');
  const [realEstateBedrooms, setRealEstateBedrooms] = useState('');
  const [realEstateLocation, setRealEstateLocation] = useState('');

  // Invoice specific fields
  const [invoiceIssuer, setInvoiceIssuer] = useState('');
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [invoiceRiskRating, setInvoiceRiskRating] = useState('');

  // Commodity specific fields
  const [commodityWeight, setCommodityWeight] = useState('');
  const [commodityPurity, setCommodityPurity] = useState('');
  const [commodityStorage, setCommodityStorage] = useState('');

  // Stocks specific fields
  const [stockSymbol, setStockSymbol] = useState('');
  const [stockExchange, setStockExchange] = useState('');
  const [stockSector, setStockSector] = useState('');

  // Carbon Credits specific fields
  const [carbonStandard, setCarbonStandard] = useState('');
  const [carbonProjectType, setCarbonProjectType] = useState('');
  const [carbonCO2Offset, setCarbonCO2Offset] = useState('');

  // Success states
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [mintedAssetId, setMintedAssetId] = useState<string | null>(null);
  const [createdTokens, setCreatedTokens] = useState<Array<{
    tokenId: string;
    name: string;
    amount: number;
    price: number;
    createdAt: Date;
  }>>([]);

  // Portfolio listings state
  const [portfolioListings, setPortfolioListings] = useState<Array<{
    tokenId: string;
    name: string;
    description: string;
    image: string;
    price: string; // in Wei
    amount: number;
    issuer: string;
    metadataURI: string;
    metadata?: any;
    attributes: Array<{
      trait_type: string;
      value: string;
    }>;
  }>>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);

  // Check issuer authorization on wallet connection
  useEffect(() => {
    const initializeContractAndCheckAuth = async () => {
      if (!isConnected || !address || !signer) {
        setIsAuthorizedIssuer(null);
        setAdminContract(null);
        console.log('⏳ Authorization check skipped:', { isConnected, address: !!address, signer: !!signer });
        return;
      }

      setAuthCheckLoading(true);
      console.log('🔍 Starting contract initialization and authorization check for:', address);
      
      try {
        // Initialize admin contract
        await initializeAdminContract();
        
      } catch (error) {
        console.error('❌ Error during initialization and authorization check:', error);
        setIsAuthorizedIssuer(false);
      } finally {
        setAuthCheckLoading(false);
      }
    };

    initializeContractAndCheckAuth();
  }, [isConnected, address, signer]);

  // Initialize admin contract
  const initializeAdminContract = async () => {
    try {
      if (!isConnected || !signer) {
        console.log('❌ Wallet not connected');
        return;
      }

      console.log('🔄 Initializing admin contract...');
      console.log('Contract address:', ADMIN_CONTRACT);
      console.log('Network:', ACTIVE_NETWORK);
      
      // Check network
      const network = await signer.provider.getNetwork();
      console.log('Connected to network:', network.name, 'Chain ID:', network.chainId);
      console.log('Expected Chain ID:', NETWORK_CONFIG[ACTIVE_NETWORK].chainId);
      
      if (network.chainId !== NETWORK_CONFIG[ACTIVE_NETWORK].chainId) {
        console.error('❌ Wrong network! Expected Chain ID:', NETWORK_CONFIG[ACTIVE_NETWORK].chainId, 'Got:', network.chainId);
        toast.error(`Please switch to ${NETWORK_CONFIG[ACTIVE_NETWORK].name} (Chain ID: ${NETWORK_CONFIG[ACTIVE_NETWORK].chainId})`);
        return;
      }
      
      // Create contract instance
      const contract = new ethers.Contract(ADMIN_CONTRACT, ADMIN_ABI, signer);
      
      // Verify contract exists with better error handling
      try {
        console.log('🔍 Verifying admin contract...');
        const code = await signer.provider.getCode(ADMIN_CONTRACT);
        if (code === '0x') {
          console.error('❌ No contract found at address:', ADMIN_CONTRACT);
          toast.error('Admin contract not found at the specified address');
          return;
        }
        console.log('✅ Admin contract verified at address:', ADMIN_CONTRACT);
      } catch (verifyError: any) {
        console.warn('⚠️ Contract verification failed, but proceeding anyway:', verifyError.message);
        // Don't return here - proceed with contract initialization even if verification fails
        // This handles RPC issues that don't necessarily mean the contract doesn't exist
      }
      
      setAdminContract(contract);
      console.log('✅ Admin contract initialized successfully');
      
      // Initialize issuer and marketplace contracts
      const marketplaceContractInstance = await initializeIssuerAndMarketplaceContracts();
      
      // Now fetch contract data and check authorization
      await fetchContractDataAndCheckAuth(contract, marketplaceContractInstance || undefined);
      
    } catch (error) {
      console.error('❌ Error initializing admin contract:', error);
      toast.error('Failed to initialize admin contract');
    }
  };

  // Initialize issuer and marketplace contracts
  const initializeIssuerAndMarketplaceContracts = async (): Promise<ethers.Contract | null> => {
    try {
      if (!signer) {
        console.log('❌ Signer not available');
        return null;
      }

      console.log('🔄 Initializing issuer and marketplace contracts...');
      
      // Initialize issuer contract
      const issuerContractInstance = new ethers.Contract(ISSUER_CONTRACT, ISSUER_ABI, signer);
      try {
        const issuerCode = await signer.provider.getCode(ISSUER_CONTRACT);
        if (issuerCode === '0x') {
          console.error('❌ No issuer contract found at address:', ISSUER_CONTRACT);
          toast.error('Issuer contract not found');
          return null;
        }
        console.log('✅ Issuer contract verified at address:', ISSUER_CONTRACT);
      } catch (verifyError: any) {
        console.warn('⚠️ Issuer contract verification failed, but proceeding anyway:', verifyError.message);
      }
      setIssuerContract(issuerContractInstance);
      console.log('✅ Issuer contract initialized:', ISSUER_CONTRACT);

      // Initialize marketplace contract
      const marketplaceContractInstance = new ethers.Contract(MARKETPLACE_CONTRACT, MARKETPLACE_ABI, signer);
      try {
        const marketplaceCode = await signer.provider.getCode(MARKETPLACE_CONTRACT);
        if (marketplaceCode === '0x') {
          console.error('❌ No marketplace contract found at address:', MARKETPLACE_CONTRACT);
          toast.error('Marketplace contract not found');
          return null;
        }
        console.log('✅ Marketplace contract verified at address:', MARKETPLACE_CONTRACT);
      } catch (verifyError: any) {
        console.warn('⚠️ Marketplace contract verification failed, but proceeding anyway:', verifyError.message);
      }
      setMarketplaceContract(marketplaceContractInstance);
      console.log('✅ Marketplace contract initialized:', MARKETPLACE_CONTRACT);

      console.log('✅ All contracts initialized successfully');
      
      return marketplaceContractInstance;
      
    } catch (error) {
      console.error('❌ Error initializing contracts:', error);
      toast.error('Failed to initialize contracts');
      return null;
    }
  };

  // Function to fetch contract data and check authorization
  const fetchContractDataAndCheckAuth = async (contract?: ethers.Contract, marketplaceContractInstance?: ethers.Contract) => {
    const contractToUse = contract || adminContract;
    
    if (!contractToUse) {
      console.log('❌ Admin contract not initialized');
      return;
    }

    setIsLoadingContractData(true);
    
    try {
      console.log('🔄 Loading issuer data from blockchain...');
      console.log('Contract address:', contractToUse.address);
      console.log('Signer address:', await contractToUse.signer.getAddress());
      
      // Call getAllIssuers from admin contract
      let issuersData;
      try {
        console.log('📞 Calling getAllIssuers...');
        issuersData = await contractToUse.getAllIssuers();
        console.log('✅ getAllIssuers result:', issuersData);
      } catch (error) {
        console.error('❌ getAllIssuers failed:', error);
        issuersData = [];
      }

      // Process issuers data
      const issuerAddresses = issuersData || [];
      const contractIssuersData = {
        addresses: issuerAddresses,
        count: issuerAddresses.length,
        metadata: {}
      };
      
      setContractIssuers(contractIssuersData);

      // Check if connected wallet is authorized issuer
      if (address && issuerAddresses.length >= 0) {
        const isAuthorized = issuerAddresses.some(
          (issuerAddress: string) => issuerAddress.toLowerCase() === address.toLowerCase()
        );
        setIsAuthorizedIssuer(isAuthorized);
        
        if (isAuthorized) {
          console.log('✅ Connected wallet is authorized as issuer');
          toast.success('Welcome, authorized issuer!');
          
          // Fetch portfolio listings for the authorized issuer
          await fetchPortfolioListings(marketplaceContractInstance);
        } else {
          console.log('❌ Connected wallet is not authorized as issuer');
          console.log('Connected address:', address);
          console.log('Authorized issuers:', issuerAddresses);
          toast.error('Your wallet is not authorized as an issuer');
        }
      } else if (issuerAddresses.length === 0) {
        console.log('ℹ️ No issuers found in contract');
        setIsAuthorizedIssuer(false);
        toast('No authorized issuers found in the system', {
          icon: 'ℹ️',
        });
      }

      console.log('🎯 Contract data fetched successfully');
      console.log(`📊 Total Authorized Issuers: ${issuerAddresses.length}`);
      
    } catch (error: any) {
      console.error('❌ Error fetching contract data:', error);
      setIsAuthorizedIssuer(false);
      toast.error('Failed to check issuer authorization');
    } finally {
      setIsLoadingContractData(false);
    }
  };

  // Legacy function for compatibility (now calls the new function)
  const fetchContractData = async () => {
    await fetchContractDataAndCheckAuth();
  };

  // Fetch portfolio listings for the connected issuer
  const fetchPortfolioListings = async (marketplaceContractInstance?: ethers.Contract) => {
    if (!address) {
      console.log('❌ Address not available');
      return;
    }

    // Use passed contract instance or fall back to state
    const contractToUse = marketplaceContractInstance || marketplaceContract;

    if (!contractToUse) {
      console.log('❌ Marketplace contract not available');
      toast.error('Marketplace contract not available');
      return;
    }

    setPortfolioLoading(true);
    console.log('🔄 Fetching portfolio listings for issuer:', address);

    try {
      // Call getAllListings from marketplace contract with retry logic
      let listingsData;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          console.log(`📞 Calling getAllListings... (attempt ${retryCount + 1}/${maxRetries})`);
          listingsData = await contractToUse.getAllListings();
          console.log('📋 Raw listings data from contract:', listingsData);
          break; // Success, exit retry loop
        } catch (rpcError: any) {
          console.warn(`⚠️ getAllListings attempt ${retryCount + 1} failed:`, rpcError.message);
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
          } else {
            throw rpcError; // Re-throw on final attempt
          }
        }
      }

      // Handle different response formats from getAllListings
      let tokenIds, issuers, amounts, prices;
      
      if (Array.isArray(listingsData)) {
        if (listingsData.length === 4 && Array.isArray(listingsData[0])) {
          // Expected 4-array format: [tokenIds[], issuers[], amounts[], prices[]]
          [tokenIds, issuers, amounts, prices] = listingsData;
        } else {
          console.error('❌ Unexpected response format from getAllListings');
          toast.error('Failed to fetch listings data');
          return;
        }
      } else {
        console.error('❌ getAllListings did not return an array');
        toast.error('Failed to fetch listings data');
        return;
      }

      console.log('📊 Extracted data:');
      console.log('- Token IDs:', tokenIds);
      console.log('- Issuers:', issuers);
      console.log('- Amounts:', amounts);
      console.log('- Prices:', prices);

      if (!tokenIds || tokenIds.length === 0) {
        console.log('ℹ️ No listings found in marketplace');
        setPortfolioListings([]);
        return;
      }

      // Filter listings by connected wallet address (issuer)
      const myListings = [];
      for (let i = 0; i < tokenIds.length; i++) {
        if (issuers[i].toLowerCase() === address.toLowerCase()) {
          myListings.push({
            tokenId: tokenIds[i].toString(),
            issuer: issuers[i],
            amount: amounts[i].toNumber(),
            price: prices[i].toString()
          });
        }
      }

      console.log(`📊 Found ${myListings.length} listings by connected issuer`);

      if (myListings.length === 0) {
        setPortfolioListings([]);
        return;
      }

      // Initialize token contract for metadata fetching
      let tokenContract;
      try {
        const TOKEN_ABI = [
          "function uri(uint256 tokenId) external view returns (string memory)",
          "function tokenMetadata(uint256 tokenId) external view returns (string memory)",
          "function tokenPrice(uint256 tokenId) external view returns (uint256)"
        ];
        tokenContract = new ethers.Contract(TOKEN_CONTRACT, TOKEN_ABI, signer);
      } catch (error) {
        console.error('❌ Failed to initialize token contract:', error);
      }

      // Process each listing and fetch metadata
      const processedListings = [];
      
      for (const listing of myListings) {
        try {
          console.log(`🔄 Processing listing for token ${listing.tokenId}...`);
          
          // Get metadata from token contract
          let metadata: any = {};
          let metadataURI = '';
          
          if (tokenContract) {
            try {
              metadataURI = await tokenContract.tokenMetadata(listing.tokenId);
              console.log(`📋 Metadata URI for token ${listing.tokenId}:`, metadataURI);
              
              // Fetch metadata if it's IPFS URI
              if (metadataURI && metadataURI.startsWith('ipfs://')) {
                const ipfsHash = metadataURI.replace('ipfs://', '');
                const metadataResponse = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
                if (metadataResponse.ok) {
                  metadata = await metadataResponse.json();
                  console.log(`✅ Metadata fetched for token ${listing.tokenId}:`, metadata);
                }
              }
            } catch (error) {
              console.warn(`⚠️ Could not fetch metadata for token ${listing.tokenId}:`, error);
            }
          }

          // Process image URL
          let imageUrl = '';
          if (metadata?.image) {
            if (metadata.image.startsWith('ipfs://')) {
              const ipfsHash = metadata.image.replace('ipfs://', '');
              imageUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
            } else if (metadata.image.startsWith('http')) {
              imageUrl = metadata.image;
            }
          }

          // Fallback image based on asset type
          if (!imageUrl) {
            const assetType = metadata?.attributes?.find((attr: any) => 
              attr.trait_type === 'Asset Type'
            )?.value || 'Real Estate';
            
            const fallbackImages = {
              'Real Estate': 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop',
              'Invoice': 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop',
              'Stocks': 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop',
              'Commodity': 'https://images.unsplash.com/photo-1622976520928-53c6b59f4e7e?w=800&h=600&fit=crop',
              'CarbonCredit': 'https://images.unsplash.com/photo-1569163139342-de0874c4e2c5?w=800&h=600&fit=crop'
            };
            imageUrl = fallbackImages[assetType as keyof typeof fallbackImages] || fallbackImages['Real Estate'];
          }

          const processedListing = {
            tokenId: listing.tokenId,
            name: metadata?.name || `Asset #${listing.tokenId}`,
            description: metadata?.description || `A tokenized asset with ID ${listing.tokenId}`,
            image: imageUrl,
            price: listing.price,
            amount: listing.amount,
            issuer: listing.issuer,
            metadataURI,
            metadata,
            attributes: metadata?.attributes || [
              { trait_type: 'Asset Type', value: 'Real Estate' },
              { trait_type: 'Token ID', value: listing.tokenId }
            ]
          };

          processedListings.push(processedListing);
          console.log(`✅ Processed listing for token ${listing.tokenId}:`, processedListing.name);

        } catch (error) {
          console.error(`❌ Error processing listing for token ${listing.tokenId}:`, error);
        }
      }

      setPortfolioListings(processedListings);
      console.log(`✅ Portfolio listings loaded: ${processedListings.length} assets`);

      if (processedListings.length > 0) {
        toast.success(`Found ${processedListings.length} assets in your portfolio`);
      }

    } catch (error: any) {
      console.error('❌ Error fetching portfolio listings:', error);
      toast.error('Failed to load portfolio listings');
    } finally {
      setPortfolioLoading(false);
    }
  };

  // Remove listing function
  const removeListing = async (tokenId: string) => {
    if (!marketplaceContract || !address) {
      toast.error('Marketplace contract not available or wallet not connected');
      return;
    }

    try {
      console.log(`🔄 Removing listing for token ${tokenId}...`);
      
      // Show confirmation dialog
      const confirmed = window.confirm(
        `Are you sure you want to remove the listing for Token #${tokenId}? This will transfer the tokens back to your wallet.`
      );
      
      if (!confirmed) {
        return;
      }

      toast.loading('Removing listing from marketplace...');
      
      // Call removeListing on marketplace contract
      const removeListingTx = await marketplaceContract.removeListing(tokenId);
      
      console.log('⏳ Remove listing transaction sent:', removeListingTx.hash);
      toast.success(`Transaction sent: ${removeListingTx.hash.slice(0, 10)}...`);
      
      // Wait for confirmation
      const receipt = await removeListingTx.wait();
      console.log('✅ Remove listing transaction confirmed:', receipt.transactionHash);
      
      toast.success('🎉 Listing removed successfully!');
      
      // Refresh portfolio to reflect changes
      await fetchPortfolioListings();
      
    } catch (error: any) {
      console.error('❌ Remove listing error:', error);
      
      if (error.code === 4001) {
        toast.error('Transaction rejected by user');
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        toast.error('Insufficient funds for transaction');
      } else if (error.message?.includes('Not the issuer')) {
        toast.error('You are not authorized to remove this listing');
      } else if (error.message?.includes('Listing not active')) {
        toast.error('This listing is not active');
      } else {
        toast.error(`Failed to remove listing: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const handleNftImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setNftImageFiles(prev => [...prev, ...files]);
    }
  };

  const removeImage = (index: number) => {
    setNftImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleMintNFT = async () => {
    // Check authorization first
    if (isAuthorizedIssuer !== true) {
      toast.error('You are not authorized to create tokens. Please contact the admin.');
      return;
    }

    // Check contracts are initialized
    if (!issuerContract) {
      toast.error('Issuer contract not initialized. Please refresh the page.');
      return;
    }

    if (!marketplaceContract) {
      console.warn('⚠️ Marketplace contract not initialized - will skip automatic listing');
    }

    // Validate form
    if (!nftTitle || !nftDescription || !nftAmount || !nftPricePerToken) {
      toast.error('Please fill all required fields');
      return;
    }

    // For NFTs, images are required
    if (tokenType === 'NFT' && nftImageFiles.length === 0) {
      toast.error('Please upload at least one image for NFT tokens');
      return;
    }

    setIsMinting(true);
    
    try {
      console.log('� Starting token creation and listing workflow...');
      console.log('Token details:', { 
        title: nftTitle, 
        type: tokenType, 
        amount: nftAmount, 
        price: nftPricePerToken,
        assetType: assetTypes[nftAssetType]
      });
      
      // Step 1: Prepare metadata and upload image + metadata to IPFS
      console.log('🔄 Step 1: Preparing metadata and uploading to IPFS...');
      
      const baseMetadata = {
        name: nftTitle,
        description: nftDescription,
        attributes: [
          {
            trait_type: "Asset Type",
            value: assetTypes[nftAssetType]
          },
          {
            trait_type: "Price Token",
            value: nftPriceToken
          },
          {
            trait_type: "Earn XP",
            value: nftEarnXP
          }
        ],
        // Add asset-specific metadata
        assetDetails: getAssetSpecificMetadata(),
        tokenType: tokenType,
        createdAt: new Date().toISOString(),
        createdBy: address
      };

      console.log('📋 Base metadata prepared:', baseMetadata);
      
      // Upload image and metadata to IPFS
      toast('Uploading image and metadata to IPFS...');
      let metadataHash;
      try {
        if (nftImageFiles.length > 0) {
          // Upload the first image file along with metadata
          console.log('📷 Uploading image:', nftImageFiles[0].name);
          metadataHash = await uploadToPinata(nftImageFiles[0], baseMetadata);
          console.log('✅ Image and metadata uploaded to IPFS:', metadataHash);
          toast.success('Image and metadata uploaded to IPFS successfully!');
        } else {
          // If no image, just upload metadata
          console.log('📋 No image provided, uploading metadata only');
          metadataHash = await uploadJSONToPinata({...baseMetadata, image: ''});
          console.log('✅ Metadata uploaded to IPFS:', metadataHash);
          toast.success('Metadata uploaded to IPFS successfully!');
        }
      } catch (ipfsError) {
        console.error('❌ IPFS upload failed:', ipfsError);
        toast.error('Failed to upload to IPFS');
        return;
      }

      const metadataURI = `ipfs://${metadataHash}`;
      
      // Step 2: Create token via issuer contract
      console.log('🔄 Step 2: Creating token via issuer contract...');
      console.log('Creating token with:', {
        amount: nftAmount,
        price: ethers.utils.parseEther(nftPricePerToken),
        metadataURI
      });
      
      toast('Creating token on blockchain...');
      
      // Call createToken on issuer contract - simple and direct
      const createTokenTx = await issuerContract.createToken(
        parseInt(nftAmount),
        ethers.utils.parseEther(nftPricePerToken),
        metadataURI
      );
      
      console.log('⏳ Create token transaction sent:', createTokenTx.hash);
      toast.success(`Transaction sent: ${createTokenTx.hash.slice(0, 10)}...`);
      
      // Wait for confirmation
      const receipt = await createTokenTx.wait();
      console.log('✅ Transaction confirmed:', receipt.transactionHash);
      
      // Get the actual token ID returned by the createToken function
      let tokenId;
      try {
        // The createToken function returns the tokenId, but we need to get it from the transaction
        // Look for TokenMinted event from ERC1155Core contract
        const tokenMintedEvent = receipt.events?.find((event: any) => 
          event.event === 'TokenMinted' && event.address.toLowerCase() === TOKEN_CONTRACT.toLowerCase()
        );
        
        if (tokenMintedEvent && tokenMintedEvent.args && tokenMintedEvent.args.tokenId) {
          tokenId = tokenMintedEvent.args.tokenId;
          console.log('🎯 Token ID extracted from TokenMinted event:', tokenId.toString());
        } else {
          // Fallback: call getMyTokens to get the latest token created by this issuer
          console.log('🔄 Fallback: Getting token ID from getMyTokens...');
          const myTokens = await issuerContract.getMyTokens();
          tokenId = myTokens[myTokens.length - 1]; // Get the last token created
          console.log('🎯 Token ID from getMyTokens:', tokenId.toString());
        }
      } catch (e) {
        console.error('❌ Failed to extract token ID:', e);
        throw new Error('Failed to get token ID from transaction');
      }
      
      if (!tokenId) {
        throw new Error('Token ID not found in transaction result');
      }
      
      console.log('✅ Confirmed Token ID:', tokenId.toString());
      toast.success(`Token created successfully! Token ID: ${tokenId.toString()}`);

      // Immediately list the asset on marketplace
      console.log('🔄 Listing asset on marketplace...');
      console.log('Listing token:', {
        tokenId: tokenId.toString(),
        amount: parseInt(nftAmount)
      });
      
      if (!marketplaceContract) {
        console.warn('⚠️ Marketplace contract not initialized, skipping listing');
        toast('Token created but marketplace listing skipped (contract not initialized)');
      } else {
        try {
          toast('Listing asset on marketplace...');
          
          const listAssetTx = await marketplaceContract.listAsset(
            tokenId,
            parseInt(nftAmount)
          );
          
          console.log('⏳ List asset transaction sent:', listAssetTx.hash);
          toast.success(`Listing transaction sent: ${listAssetTx.hash.slice(0, 10)}...`);
          
          const listAssetReceipt = await listAssetTx.wait();
          console.log('✅ List asset transaction confirmed:', listAssetReceipt.transactionHash);
          
          toast.success('🎉 Asset listed on marketplace successfully!');
          
        } catch (listError) {
          console.error('❌ List asset failed:', listError);
          toast.error('Token created but failed to list on marketplace');
          // Note: Token was created successfully, but listing failed
        }
      }

      
      // Update local state and show success
      const newToken = {
        tokenId: tokenId.toString(),
        name: nftTitle,
        amount: parseInt(nftAmount),
        price: parseFloat(nftPricePerToken),
        createdAt: new Date()
      };
      
      setCreatedTokens(prev => [...prev, newToken]);
      localStorage.setItem('userTokens', JSON.stringify([...createdTokens, newToken]));

      // Show success dialog
      setMintedAssetId(tokenId.toString());
      setShowSuccessDialog(true);
      setShowNFTDialog(false);
      resetNFTForm();
      
      console.log('🎉 Token created successfully!');
      toast.success(`🎉 Token created successfully! Token ID: ${tokenId.toString()}`);
      
    } catch (error: any) {
      console.error('❌ Token creation error:', error);
      
      if (error.code === 4001) {
        toast.error('Transaction rejected by user');
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        toast.error('Insufficient funds for transaction');
      } else if (error.message?.includes('Not authorized issuer')) {
        toast.error('Your wallet is not authorized as an issuer');
      } else {
        toast.error(`Failed to create token: ${error.message}`);
      }
    } finally {
      setIsMinting(false);
    }
  };

  // Helper function to get asset-specific metadata
  const getAssetSpecificMetadata = () => {
    const assetType = assetTypes[nftAssetType];
    
    switch (assetType) {
      case 'Real Estate':
        return {
          size: realEstateSize,
          bedrooms: realEstateBedrooms,
          location: realEstateLocation
        };
      case 'Invoice':
        return {
          issuer: invoiceIssuer,
          dueDate: invoiceDueDate,
          riskRating: invoiceRiskRating
        };
      case 'Commodity':
        return {
          weight: commodityWeight,
          purity: commodityPurity,
          storage: commodityStorage
        };
      case 'Stocks':
        return {
          symbol: stockSymbol,
          exchange: stockExchange,
          sector: stockSector
        };
      case 'CarbonCredit':
        return {
          standard: carbonStandard,
          projectType: carbonProjectType,
          co2Offset: carbonCO2Offset
        };
      default:
        return {};
    }
  };

  const resetNFTForm = () => {
    setMintStep(1);
    setTokenType('ERC20');
    setNftTitle('');
    setNftDescription('');
    setNftImageFiles([]);
    setNftAssetType(0);
    setNftPriceToken('USD');
    setNftPricePerToken('1.0');
    setNftEarnXP('32000');
    setNftAmount('');
    
    // Reset asset-specific fields
    setRealEstateSize('');
    setRealEstateBedrooms('');
    setRealEstateLocation('');
    setInvoiceIssuer('');
    setInvoiceDueDate('');
    setInvoiceRiskRating('');
    setCommodityWeight('');
    setCommodityPurity('');
    setCommodityStorage('');
    setStockSymbol('');
    setStockExchange('');
    setStockSector('');
    setCarbonStandard('');
    setCarbonProjectType('');
    setCarbonCO2Offset('');
  };

  // Approve marketplace to manage user's tokens
  const handleApproveMarketplace = async () => {
    if (!marketplaceContract || !issuerContract) {
      toast.error('Contracts not initialized. Please refresh the page.');
      return;
    }

    if (!address) {
      toast.error('Please connect your wallet first.');
      return;
    }

    try {
      console.log('🔄 Approving marketplace to manage tokens...');
      console.log('Marketplace address:', MARKETPLACE_CONTRACT);
      
      toast('Requesting approval transaction...');
      
      // Call setApprovalForAll on the token contract (ERC1155Core)
      // We need to get the token contract address from the issuer contract
      const tokenContractAddress = TOKEN_CONTRACT; // From contractAddress.ts
      
      if (!tokenContractAddress) {
        toast.error('Token contract address not found');
        return;
      }

      // Create token contract instance
      const tokenContract = new ethers.Contract(
        tokenContractAddress,
        [
          "function setApprovalForAll(address operator, bool approved) external",
          "function isApprovedForAll(address account, address operator) external view returns (bool)"
        ],
        signer
      );

      // Check current approval status
      const isCurrentlyApproved = await tokenContract.isApprovedForAll(address, MARKETPLACE_CONTRACT);
      
      if (isCurrentlyApproved) {
        toast.success('Marketplace is already approved to manage your tokens!');
        return;
      }

      // Send approval transaction
      const approveTx = await tokenContract.setApprovalForAll(MARKETPLACE_CONTRACT, true);
      
      console.log('⏳ Approval transaction sent:', approveTx.hash);
      toast.success(`Approval transaction sent: ${approveTx.hash.slice(0, 10)}...`);
      
      // Wait for confirmation
      const approvalReceipt = await approveTx.wait();
      console.log('✅ Approval transaction confirmed:', approvalReceipt.transactionHash);
      
      toast.success('🎉 Marketplace approved successfully! You can now list your tokens for sale.');
      
    } catch (error: any) {
      console.error('❌ Marketplace approval error:', error);
      
      if (error.code === 4001) {
        toast.error('Approval transaction rejected by user');
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        toast.error('Insufficient funds for transaction');
      } else {
        toast.error(`Failed to approve marketplace: ${error.message}`);
      }
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      {/* Professional Header */}
      <header className={`${isDarkMode ? 'bg-gray-900/50 backdrop-blur-xl border-gray-800' : 'bg-white/80 backdrop-blur-xl border-gray-200'} border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Dashboard Title and Status */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Issuer Dashboard</h1>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>Manage your tokenized assets and marketplace listings</p>
              </div>
            </div>
            
            {/* Navigation and Status */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${
                  isConnected 
                    ? 'bg-green-500/10 border-green-500/20' 
                    : 'bg-red-500/10 border-red-500/20'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className={`text-sm font-medium ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                    {isConnected ? 'Wallet Connected' : 'Wallet Disconnected'}
                  </span>
                </div>
                <div className="flex items-center space-x-2 bg-green-500/10 px-3 py-2 rounded-lg border border-green-500/20">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-sm font-medium">
                    {isAuthorizedIssuer === true ? 'Authorized Issuer' : 
                     isAuthorizedIssuer === false ? 'Not Authorized' : 'Checking...'}
                  </span>
                </div>
              </div>
              
              {/* Dark Mode Toggle */}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>

              {/* Connect Wallet Button */}
              {!isConnected && (
                <Button 
                  onClick={connectWallet}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet
                </Button>
              )}
              
              <Button asChild variant="ghost" className={`${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>
                <Link to="/" className="flex items-center space-x-2">
                  <Home className="w-4 h-4" />
                  <span>Home</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" className={`${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>
                <Link to="/marketplace" className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>Marketplace</span>
                </Link>
              </Button>
              <div className={`w-8 h-8 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full flex items-center justify-center`}>
                <Users className={`w-4 h-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className={`${isDarkMode ? 'bg-gray-900/50 backdrop-blur-xl border-gray-800' : 'bg-white border-gray-200'} rounded-lg border p-6 shadow-sm`}>
            <div className="flex items-center">
              <div className={`p-2 ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-50'} rounded-lg`}>
                <Building2 className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Assets Created</p>
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>0</p>
              </div>
            </div>
          </div>
          
          <div className={`${isDarkMode ? 'bg-gray-900/50 backdrop-blur-xl border-gray-800' : 'bg-white border-gray-200'} rounded-lg border p-6 shadow-sm`}>
            <div className="flex items-center">
              <div className={`p-2 ${isDarkMode ? 'bg-green-500/20' : 'bg-green-50'} rounded-lg`}>
                <TrendingUp className={`w-5 h-5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Assets Listed</p>
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>0</p>
              </div>
            </div>
          </div>
          
          <div className={`${isDarkMode ? 'bg-gray-900/50 backdrop-blur-xl border-gray-800' : 'bg-white border-gray-200'} rounded-lg border p-6 shadow-sm`}>
            <div className="flex items-center">
              <div className={`p-2 ${isDarkMode ? 'bg-purple-500/20' : 'bg-purple-50'} rounded-lg`}>
                <BarChart3 className={`w-5 h-5 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Volume</p>
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>$0</p>
              </div>
            </div>
          </div>
          
          <div className={`${isDarkMode ? 'bg-gray-900/50 backdrop-blur-xl border-gray-800' : 'bg-white border-gray-200'} rounded-lg border p-6 shadow-sm`}>
            <div className="flex items-center">
              <div className={`p-2 ${isDarkMode ? 'bg-orange-500/20' : 'bg-orange-50'} rounded-lg`}>
                <Shield className={`w-5 h-5 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Compliance Status</p>
                <p className="text-lg font-bold text-green-400">Verified</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8 mb-8">
          {/* Asset Creation */}
          <div className={`${isDarkMode ? 'bg-gray-900/50 backdrop-blur-xl border-gray-800' : 'bg-white border-gray-200'} rounded-xl border shadow-xl`}>
            <div className={`p-6 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
              <div className="flex items-center space-x-3">
                <div className={`p-2 ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-50'} rounded-lg`}>
                  <Plus className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Tokenize & Auto-List Asset</h3>
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>Convert assets into tokens and automatically list on marketplace</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Asset Types Supported:</span>
                    <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-medium`}>5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>IPFS Storage:</span>
                    <span className="text-green-400 font-medium">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Token Standard:</span>
                    <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-medium`}>ERC 1155</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Auto-Listing:</span>
                    <span className="text-green-400 font-medium">Enabled</span>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowNFTDialog(true)}
                  disabled={!isConnected || isAuthorizedIssuer === false}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {!isConnected ? 'Connect Wallet First' : 
                   isAuthorizedIssuer === false ? 'Not Authorized' :
                   'Start Tokenization'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className={`${isDarkMode ? 'bg-gray-900/50 backdrop-blur-xl border-gray-800' : 'bg-white border-gray-200'} rounded-xl border shadow-xl mb-8`}>
          <div className="p-6">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Button 
                variant="outline" 
                className={`h-20 flex-col space-y-2 ${isDarkMode ? 'border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-800 hover:text-white' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                onClick={() => {/* Handle view portfolio */}}
              >
                <BarChart3 className="w-5 h-5" />
                <span className="text-sm font-medium">Portfolio</span>
              </Button>
              
              <Button 
                variant="outline" 
                className={`h-20 flex-col space-y-2 ${isDarkMode ? 'border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-800 hover:text-white' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                onClick={() => {/* Handle transaction history */}}
              >
                <FileText className="w-5 h-5" />
                <span className="text-sm font-medium">Transactions</span>
              </Button>
              
              <Button 
                variant="outline" 
                className={`h-20 flex-col space-y-2 ${isDarkMode ? 'border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-800 hover:text-white' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                onClick={() => {/* Handle wallet settings */}}
              >
                <Users className="w-5 h-5" />
                <span className="text-sm font-medium">Wallet</span>
              </Button>
              
              <Button 
                variant="outline" 
                className={`h-20 flex-col space-y-2 ${isDarkMode ? 'border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-800 hover:text-white' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                onClick={handleApproveMarketplace}
                disabled={!isConnected || isAuthorizedIssuer !== true}
              >
                <Shield className="w-5 h-5" />
                <span className="text-sm font-medium">Approve</span>
              </Button>
              
              <Button 
                variant="outline" 
                className={`h-20 flex-col space-y-2 ${isDarkMode ? 'border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-800 hover:text-white' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                onClick={() => {/* Handle support */}}
              >
                <Globe className="w-5 h-5" />
                <span className="text-sm font-medium">Support</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Portfolio Overview */}
        <div className="mt-8">
          <div className={`${isDarkMode ? 'bg-gray-900/50 backdrop-blur-xl border-gray-800' : 'bg-white border-gray-200'} rounded-xl border shadow-xl`}>
            <div className={`p-6 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Your Asset Portfolio</h3>
                <Button variant="outline" size="sm" className={`${isDarkMode ? 'text-gray-300 border-gray-700 hover:bg-gray-800 hover:text-white' : 'text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
              </div>
            </div>
            <div className="p-6">
              {portfolioLoading ? (
                <div className="text-center py-12">
                  <Loader2 className={`w-12 h-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-300'} mx-auto mb-4 animate-spin`} />
                  <h4 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Loading Portfolio</h4>
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Fetching your listed assets from the marketplace...</p>
                </div>
              ) : portfolioListings.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className={`w-12 h-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-300'} mx-auto mb-4`} />
                  <h4 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>No Assets Listed</h4>
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-4`}>Start by tokenizing and listing your first real-world asset</p>
                  <Button 
                    onClick={() => setShowNFTDialog(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Tokenize Asset
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Your Listed Assets ({portfolioListings.length})
                    </h4>
                    <Button 
                      onClick={() => fetchPortfolioListings()}
                      variant="outline"
                      size="sm"
                      disabled={portfolioLoading}
                      className={`${isDarkMode ? 'text-gray-300 border-gray-700 hover:bg-gray-800 hover:text-white' : 'text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${portfolioLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {portfolioListings.map((listing, index) => (
                      <div key={index} className={`p-6 rounded-lg border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'} hover:shadow-lg transition-shadow`}>
                        {/* Asset Image */}
                        <div className="aspect-square w-full mb-4 rounded-lg overflow-hidden bg-gray-200">
                          <img
                            src={listing.image}
                            alt={listing.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop';
                            }}
                          />
                        </div>
                        
                        {/* Asset Info */}
                        <div className="space-y-3">
                          <div>
                            <h5 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {listing.name}
                            </h5>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1 line-clamp-2`}>
                              {listing.description}
                            </p>
                          </div>
                          
                          {/* Asset Details */}
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Token ID:</span>
                              <span className={`font-mono ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                #{listing.tokenId}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Available:</span>
                              <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {listing.amount} tokens
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Price per Token:</span>
                              <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {ethers.utils.formatEther(listing.price)} S
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Value:</span>
                              <span className={`font-bold text-green-500`}>
                                {(parseFloat(ethers.utils.formatEther(listing.price)) * listing.amount).toFixed(4)} S
                              </span>
                            </div>
                          </div>
                          
                          {/* Asset Type Badge */}
                          <div className="flex items-center space-x-2">
                            {listing.attributes?.map((attr, attrIndex) => (
                              attr.trait_type === 'Asset Type' && (
                                <span
                                  key={attrIndex}
                                  className={`px-2 py-1 text-xs rounded-full font-medium ${
                                    isDarkMode 
                                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                                  }`}
                                >
                                  {attr.value}
                                </span>
                              )
                            ))}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center space-x-2 pt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(listing.tokenId)}
                              className={`flex-1 ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy ID
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`${NETWORK_CONFIG[ACTIVE_NETWORK].blockExplorer}/token/${listing.tokenId}`, '_blank')}
                              className={`flex-1 ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Explorer
                            </Button>
                          </div>
                          
                          {/* Remove Listing Button */}
                          <div className="pt-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeListing(listing.tokenId)}
                              className="w-full bg-red-600 hover:bg-red-700 text-white"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove Listing
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="text-center pt-6">
                    <Button 
                      onClick={() => setShowNFTDialog(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Tokenize Another Asset
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* NFT Mint Dialog */}
      <Dialog open={showNFTDialog} onOpenChange={(open) => {
          if (!open) {
            resetNFTForm();
          }
          setShowNFTDialog(open);
        }}>
          <DialogContent className={`sm:max-w-lg rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'} shadow-xl p-6 md:p-8 max-h-[90vh] overflow-hidden`}>
            <DialogHeader>
              <DialogTitle className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Create Asset Token</DialogTitle>
              <DialogDescription className={`text-base ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                {mintStep === 1
                  ? "Enter the details for your real-world asset tokenization."
                  : "Configure the token parameters for deployment."}
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto scrollbar-hide my-6 pr-2" style={{ maxHeight: 'calc(80vh - 200px)' }}>
              {mintStep === 1 ? (
                <form className="space-y-5">
                  <LabelInputContainer>
                    <Label htmlFor="nftTitle" className={`${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Asset Title</Label>
                    <Input id="nftTitle" value={nftTitle} onChange={e => setNftTitle(e.target.value)} placeholder="e.g., Manhattan Commercial Property" type="text" className={`${isDarkMode ? 'border-gray-600 bg-gray-800 text-white placeholder:text-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-500'}`} />
                  </LabelInputContainer>
                  <LabelInputContainer>
                    <Label htmlFor="nftDescription" className={`${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Description</Label>
                    <Input id="nftDescription" value={nftDescription} onChange={e => setNftDescription(e.target.value)} placeholder="Detailed asset description" type="text" className={`${isDarkMode ? 'border-gray-600 bg-gray-800 text-white placeholder:text-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-500'}`} />
                  </LabelInputContainer>
                  <LabelInputContainer>
                    <Label htmlFor="nftImage" className={`${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Asset Documentation</Label>
                    <div className="flex flex-col gap-2">
                      <Input
                        id="nftImage"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleNftImageUpload}
                        className={`${isDarkMode ? 'border-gray-600 bg-gray-800 text-white file:bg-blue-600 file:text-white hover:file:bg-blue-700' : 'border-gray-300 bg-white text-gray-900 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold`}
                      />
                      {nftImageFiles.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {nftImageFiles.map((file, index) => (
                            <div key={index} className="relative w-full h-24">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`Preview ${index + 1}`}
                                className={`rounded-lg object-cover w-full h-full border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="absolute top-1 right-1 h-6 w-6 bg-red-500 hover:bg-red-600 text-white border-0"
                                onClick={() => removeImage(index)}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </LabelInputContainer>
                  <LabelInputContainer>
                    <Label htmlFor="nftAssetType" className={`${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Asset Category</Label>
                    <select id="nftAssetType" value={nftAssetType} onChange={e => setNftAssetType(Number(e.target.value))} className={`border rounded-md px-3 py-2 ${isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300 bg-white text-gray-900'}`}>
                      {assetTypes.map((type, idx) => (
                        <option key={type} value={idx}>{type}</option>
                      ))}
                    </select>
                  </LabelInputContainer>
                  <LabelInputContainer>
                    <Label htmlFor="nftPriceToken" className={`${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Base Currency</Label>
                    <select id="nftPriceToken" value={nftPriceToken} onChange={e => setNftPriceToken(e.target.value)} className={`border rounded-md px-3 py-2 ${isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300 bg-white text-gray-900'}`}>
                      {priceTokens.map((token) => (
                        <option key={token} value={token}>{token}</option>
                      ))}
                    </select>
                  </LabelInputContainer>
                  <LabelInputContainer>
                    <Label htmlFor="nftPricePerToken" className={`${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Price per Token (S)</Label>
                    <Input 
                      id="nftPricePerToken" 
                      value={nftPricePerToken} 
                      onChange={e => setNftPricePerToken(e.target.value)} 
                      placeholder="1.0" 
                      type="number" 
                      step="0.001"
                      min="0"
                      className={`${isDarkMode ? 'border-gray-600 bg-gray-800 text-white placeholder:text-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-500'}`} 
                    />
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Price per token in S (will be used for marketplace listing)
                    </p>
                  </LabelInputContainer>
                  <LabelInputContainer>
                    <Label htmlFor="nftEarnXP">Token Rewards</Label>
                    <Input id="nftEarnXP" value={nftEarnXP} onChange={e => setNftEarnXP(e.target.value)} placeholder="32000" type="number" className="border-gray-300" />
                  </LabelInputContainer>

                  {/* Conditional fields based on asset type */}
                  {nftAssetType === 0 && ( // Real Estate
                    <>
                      <LabelInputContainer>
                        <Label htmlFor="realEstateSize">Property Size (sq ft)</Label>
                        <Input id="realEstateSize" value={realEstateSize} onChange={e => setRealEstateSize(e.target.value)} placeholder="Enter size in square feet" type="number" className="border-gray-300" />
                      </LabelInputContainer>
                      <LabelInputContainer>
                        <Label htmlFor="realEstateBedrooms">Bedrooms</Label>
                        <Input id="realEstateBedrooms" value={realEstateBedrooms} onChange={e => setRealEstateBedrooms(e.target.value)} placeholder="Number of bedrooms" type="number" className="border-gray-300" />
                      </LabelInputContainer>
                      <LabelInputContainer>
                        <Label htmlFor="realEstateLocation">Location</Label>
                        <Input id="realEstateLocation" value={realEstateLocation} onChange={e => setRealEstateLocation(e.target.value)} placeholder="Property address/location" type="text" className="border-gray-300" />
                      </LabelInputContainer>
                    </>
                  )}

                  {nftAssetType === 1 && ( // Invoice
                    <>
                      <LabelInputContainer>
                        <Label htmlFor="invoiceIssuer">Invoice Issuer</Label>
                        <Input id="invoiceIssuer" value={invoiceIssuer} onChange={e => setInvoiceIssuer(e.target.value)} placeholder="Company name" type="text" className="border-gray-300" />
                      </LabelInputContainer>
                      <LabelInputContainer>
                        <Label htmlFor="invoiceDueDate">Due Date</Label>
                        <Input id="invoiceDueDate" value={invoiceDueDate} onChange={e => setInvoiceDueDate(e.target.value)} placeholder="YYYY-MM-DD" type="date" className="border-gray-300" />
                      </LabelInputContainer>
                      <LabelInputContainer>
                        <Label htmlFor="invoiceRiskRating">Credit Rating</Label>
                        <select id="invoiceRiskRating" value={invoiceRiskRating} onChange={e => setInvoiceRiskRating(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2">
                          <option value="">Select credit rating</option>
                          <option value="AAA">AAA - Highest Quality</option>
                          <option value="AA">AA - High Quality</option>
                          <option value="A">A - Upper Medium Grade</option>
                          <option value="BBB">BBB - Medium Grade</option>
                          <option value="BB">BB - Lower Medium Grade</option>
                          <option value="B">B - Speculative</option>
                          <option value="CCC">CCC - Highly Speculative</option>
                          <option value="CC">CC - Extremely Speculative</option>
                          <option value="C">C - Default Imminent</option>
                          <option value="D">D - In Default</option>
                        </select>
                      </LabelInputContainer>
                    </>
                  )}

                  {nftAssetType === 2 && ( // Commodity
                    <>
                      <LabelInputContainer>
                        <Label htmlFor="commodityWeight">Weight/Quantity</Label>
                        <Input id="commodityWeight" value={commodityWeight} onChange={e => setCommodityWeight(e.target.value)} placeholder="Weight (kg, tons, etc.)" type="text" className="border-gray-300" />
                      </LabelInputContainer>
                      <LabelInputContainer>
                        <Label htmlFor="commodityPurity">Grade/Purity</Label>
                        <Input id="commodityPurity" value={commodityPurity} onChange={e => setCommodityPurity(e.target.value)} placeholder="Purity percentage or grade" type="text" className="border-gray-300" />
                      </LabelInputContainer>
                      <LabelInputContainer>
                        <Label htmlFor="commodityStorage">Storage Facility</Label>
                        <Input id="commodityStorage" value={commodityStorage} onChange={e => setCommodityStorage(e.target.value)} placeholder="Storage location/facility" type="text" className="border-gray-300" />
                      </LabelInputContainer>
                    </>
                  )}

                  {nftAssetType === 3 && ( // Stocks
                    <>
                      <LabelInputContainer>
                        <Label htmlFor="stockSymbol">Ticker Symbol</Label>
                        <Input id="stockSymbol" value={stockSymbol} onChange={e => setStockSymbol(e.target.value)} placeholder="Stock ticker symbol" type="text" className="border-gray-300" />
                      </LabelInputContainer>
                      <LabelInputContainer>
                        <Label htmlFor="stockExchange">Exchange</Label>
                        <Input id="stockExchange" value={stockExchange} onChange={e => setStockExchange(e.target.value)} placeholder="NYSE, NASDAQ, etc." type="text" className="border-gray-300" />
                      </LabelInputContainer>
                      <LabelInputContainer>
                        <Label htmlFor="stockSector">Industry Sector</Label>
                        <Input id="stockSector" value={stockSector} onChange={e => setStockSector(e.target.value)} placeholder="Technology, Healthcare, etc." type="text" className="border-gray-300" />
                      </LabelInputContainer>
                    </>
                  )}

                  {nftAssetType === 4 && ( // Carbon Credits
                    <>
                      <LabelInputContainer>
                        <Label htmlFor="carbonStandard">Certification Standard</Label>
                        <select id="carbonStandard" value={carbonStandard} onChange={e => setCarbonStandard(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2">
                          <option value="">Select standard</option>
                          <option value="VCS">VCS (Verified Carbon Standard)</option>
                          <option value="Gold Standard">Gold Standard</option>
                          <option value="CDM">CDM (Clean Development Mechanism)</option>
                          <option value="CAR">CAR (Climate Action Reserve)</option>
                          <option value="ACR">ACR (American Carbon Registry)</option>
                        </select>
                      </LabelInputContainer>
                      <LabelInputContainer>
                        <Label htmlFor="carbonProjectType">Project Category</Label>
                        <select id="carbonProjectType" value={carbonProjectType} onChange={e => setCarbonProjectType(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2">
                          <option value="">Select project type</option>
                          <option value="Renewable Energy">Renewable Energy</option>
                          <option value="Forestry">Forestry & Land Use</option>
                          <option value="Energy Efficiency">Energy Efficiency</option>
                          <option value="Methane Capture">Methane Capture</option>
                          <option value="Direct Air Capture">Direct Air Capture</option>
                        </select>
                      </LabelInputContainer>
                      <LabelInputContainer>
                        <Label htmlFor="carbonCO2Offset">CO2 Offset Capacity (tons)</Label>
                        <Input id="carbonCO2Offset" value={carbonCO2Offset} onChange={e => setCarbonCO2Offset(e.target.value)} placeholder="Amount of CO2 offset in tons" type="number" className="border-gray-300" />
                      </LabelInputContainer>
                    </>
                  )}
                </form>
              ) : (
                <form className="space-y-5">
                  <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-blue-50 border-blue-200'}`}>
                    <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Token Configuration</h4>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Configure the token supply and parameters. Token ID will be automatically generated by Hedera Token Service.
                    </p>
                  </div>
                  
                  <LabelInputContainer>
                    <Label htmlFor="nftAmount" className={`${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Token Supply</Label>
                    <Input 
                      id="nftAmount" 
                      value={nftAmount} 
                      onChange={e => setNftAmount(e.target.value)} 
                      placeholder="Enter total number of tokens to mint" 
                      type="number" 
                      min="1"
                      className={`${isDarkMode ? 'border-gray-600 bg-gray-800 text-white placeholder:text-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-500'}`} 
                    />
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Number of individual NFTs to create
                    </p>
                  </LabelInputContainer>

                  <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    <h5 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Summary</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Asset Name:</span>
                        <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-medium`}>{nftTitle || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Asset Type:</span>
                        <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-medium`}>{assetTypes[nftAssetType]}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Token Supply:</span>
                        <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-medium`}>{nftAmount || '0'} NFTs</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Price per Token:</span>
                        <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-medium`}>{nftPricePerToken} S</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Images:</span>
                        <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-medium`}>{nftImageFiles.length} file(s)</span>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => { resetNFTForm(); setShowNFTDialog(false); }} className={`${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                Cancel
              </Button>
              {mintStep === 1 ? (
                <Button 
  type="button" 
  onClick={() => {
    if (!nftTitle || !nftDescription || nftImageFiles.length === 0 || !nftPricePerToken) {
      toast.error('Please fill all required fields and upload documentation');
      return;
    }
    setMintStep(2);
  }} 
  className="bg-blue-600 text-white hover:bg-blue-700"
>
  Configure Token
</Button>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={() => setMintStep(1)} className={`${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                    Back
                  </Button>
                  <Button 
    type="button"
    onClick={() => {
      if (!nftAmount || parseInt(nftAmount) <= 0) {
        toast.error('Please enter a valid token supply');
        return;
      }
      if (!nftPricePerToken || parseFloat(nftPricePerToken) <= 0) {
        toast.error('Please enter a valid price per token');
        return;
      }
      handleMintNFT();
    }}
    disabled={isMinting}
    className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
  >
    <div className="flex items-center space-x-2">
      {isMinting && (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      )}
      <span>{isMinting ? 'Creating Token...' : 'Create Asset Token'}</span>
    </div>
  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Success Dialog for Minting NFT */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className={`sm:max-w-md rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'} shadow-xl p-6`}>
            <DialogHeader>
              <DialogTitle className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Asset Token Created!</DialogTitle>
              <DialogDescription className={`text-base ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                Your asset has been successfully tokenized and deployed to the blockchain.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className={`flex items-center justify-between p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex flex-col">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Asset Token ID</span>
                  <span className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} break-all`}>{mintedAssetId || 'Loading...'}</span>
                </div>
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(mintedAssetId || '')} className={`${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-500 hover:bg-gray-50'}`}>
                  <Copy className="h-5 w-5" />
                </Button>
              </div>
              <Button asChild variant="default" onClick={() => { setShowSuccessDialog(false); setMintedAssetId(null); }} className="bg-blue-600 hover:bg-blue-700">
                <Link to="/issuer" className="w-full h-full">Return to Dashboard</Link>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );
};

export default Issuer;