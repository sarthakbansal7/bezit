import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import { useWallet } from '../../context/WalletContext';
import { MARKETPLACE_ABI } from '../../utils/marketplaceABI';
import { MARKETPLACE_CONTRACT, TOKEN_CONTRACT } from '../../lib/contractAddress';
import { toast } from 'sonner';
import { 
  BarChart3, 
  Wallet, 
  User, 
  DollarSign, 
  TrendingUp, 
  Bell, 
  Settings, 
  LogOut,
  Home,
  ChevronRight,
  Eye,
  EyeOff,
  Calendar,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ArrowDownLeft,
  Building,
  FileText,
  Coins,
  Leaf,
  Download,
  Filter,
  Check,
  Star,
  Award,
  Menu,
  HelpCircle,
  Briefcase,
  X,
  Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchTokenPrice, formatPriceInUSD } from '@/utils/priceService';

// Real data interfaces
interface UserAsset {
  tokenId: string;
  name: string;
  description: string;
  image: string;
  price: string; // in token units
  amount: number;
  seller: string;
  metadataURI: string;
  metadata?: any;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
  type: string;
}

interface PortfolioData {
  totalInvestment: number;
  currentValue: number;
  totalReturn: number;
  returnPercentage: number;
  monthlyIncome: number;
  totalAssets: number;
  activeInvestments: number;
}

// Mock data for sections not yet converted to real data
const MOCK_INCOME_HISTORY = [
  { date: "2024-03-01", asset: "Manhattan Luxury Apartment", amount: 1850, type: "Rental" },
  { date: "2024-03-01", asset: "Tech Startup Invoice #1847", amount: 425, type: "Interest" },
  { date: "2024-03-01", asset: "Carbon Credit Portfolio", amount: 315, type: "Dividend" },
  { date: "2024-02-01", asset: "Manhattan Luxury Apartment", amount: 1850, type: "Rental" },
  { date: "2024-02-01", asset: "Tech Startup Invoice #1847", amount: 425, type: "Interest" },
  { date: "2024-02-01", asset: "Carbon Credit Portfolio", amount: 315, type: "Dividend" },
];

const MOCK_TRANSACTIONS = [
  { 
    date: "2024-03-15", 
    time: "09:30 AM",
    asset: "Manhattan Luxury Apartment", 
    location: "New York, NY",
    amount: 125000, 
    type: "buy", 
    shares: 250,
    status: "completed"
  },
  { 
    date: "2024-03-10", 
    time: "11:45 AM",
    asset: "Tech Startup Invoice #1847", 
    location: "San Francisco, CA",
    amount: 8500, 
    type: "buy", 
    shares: 85,
    status: "completed"
  },
  { 
    date: "2024-03-05", 
    time: "02:15 PM",
    asset: "Gold Bullion Reserve", 
    location: "London, UK",
    amount: 45000, 
    type: "buy", 
    shares: 90,
    status: "completed"
  },
  { 
    date: "2024-02-28", 
    time: "10:20 AM",
    asset: "Carbon Credit Portfolio", 
    location: "Toronto, CA",
    amount: 15000, 
    type: "buy", 
    shares: 150,
    status: "completed"
  },
  { 
    date: "2024-02-20", 
    time: "03:45 PM",
    asset: "Previous Investment", 
    location: "Chicago, IL",
    amount: 25000, 
    type: "sell", 
    shares: 50,
    status: "completed"
  },
  { 
    date: "2024-02-15", 
    time: "12:00 PM",
    asset: "Manhattan Luxury Apartment", 
    location: "New York, NY",
    amount: 1850, 
    type: "dividend", 
    shares: 0,
    status: "completed"
  },
  { 
    date: "2024-01-25", 
    time: "01:30 PM",
    asset: "Real Estate Fund REIT", 
    location: "Miami, FL",
    amount: 35000, 
    type: "buy", 
    shares: 175,
    status: "completed"
  },
  { 
    date: "2024-01-18", 
    time: "04:20 PM",
    asset: "Green Energy Bonds", 
    location: "Austin, TX",
    amount: 22000, 
    type: "buy", 
    shares: 110,
    status: "pending"
  },
];

const SIDEBAR_ITEMS = [
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'portfolio', label: 'Owned Assets', icon: Wallet },
  { id: 'income', label: 'My Income', icon: DollarSign },
  { id: 'transactions', label: 'Transactions', icon: Activity },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const Dashboard: React.FC = () => {
  const [activeSection, setActiveSection] = useState('analytics');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  // Wallet context
  const { provider, signer, address, isConnected } = useWallet();
  
  // Asset states
  const [userAssets, setUserAssets] = useState<UserAsset[]>([]);
  const [portfolioData, setPortfolioData] = useState<PortfolioData>({
    totalInvestment: 0,
    currentValue: 0,
    totalReturn: 0,
    returnPercentage: 0,
    monthlyIncome: 0,
    totalAssets: 0,
    activeInvestments: 0
  });
  const [loading, setLoading] = useState(false);

  // Sell modal states
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<UserAsset | null>(null);
  const [sellAmount, setSellAmount] = useState('');
  const [sellLoading, setSellLoading] = useState(false);

  // Asset details modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedAssetForDetails, setSelectedAssetForDetails] = useState<UserAsset | null>(null);

  // Connect wallet function
  const connectWallet = async () => {
    try {
      setLoading(true);
      
      if (!isConnected) {
        toast.error('Please connect your wallet first');
        return;
      }
      
      toast.success('Wallet connected successfully!');
      
      // Load real assets from blockchain
      await fetchUserAssetsFromBlockchain();
      
    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      toast.error(`Failed to connect wallet: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user assets from blockchain with proper metadata and images
  const fetchUserAssetsFromBlockchain = async () => {
    if (!isConnected || !provider || !address || !signer) {
      console.log('Wallet not connected or signer not available');
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Loading assets from blockchain for:', address);

      // Create marketplace contract instance with SIGNER (not just provider)
      const marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT, MARKETPLACE_ABI, signer);
      
      // 1. Get user's assets from getMyAssets (uses msg.sender)
      console.log('📞 Calling getMyAssets with signer...');
      const myAssetsResult = await marketplaceContract.getMyAssets();
      const [myTokenIds, myAmounts] = myAssetsResult;
      console.log('✅ My assets:', { 
        tokenIds: myTokenIds.map((id: ethers.BigNumber) => id.toString()), 
        amounts: myAmounts.map((amt: ethers.BigNumber) => amt.toString()) 
      });

      // 2. Get all listings to get prices
      console.log('📞 Calling getAllListings...');
      const allListingsResult = await marketplaceContract.getAllListings();
      const [allTokenIds, allIssuers, allAmounts, allPrices] = allListingsResult;
      console.log('✅ All listings:', { 
        tokenIds: allTokenIds.map((id: ethers.BigNumber) => id.toString()),
        prices: allPrices.map((price: ethers.BigNumber) => price.toString())
      });

      // 2.5. Debug: Check user balance for each token manually
      console.log('🔍 Debugging: Checking user balance for each token...');
      for (let i = 0; i < allTokenIds.length; i++) {
        const tokenId = allTokenIds[i];
        try {
          const balance = await marketplaceContract.getUserBalance(address, tokenId);
          console.log(`Token ${tokenId.toString()}: User balance = ${balance.toString()}`);
        } catch (err) {
          console.log(`Error checking balance for token ${tokenId.toString()}:`, err);
        }
      }

      // 3. Create price mapping for easy lookup
      const priceMap = new Map();
      for (let i = 0; i < allTokenIds.length; i++) {
        priceMap.set(allTokenIds[i].toString(), allPrices[i]);
      }

      // 4. Initialize token contract for metadata fetching
      const TOKEN_ABI = [
        "function uri(uint256 tokenId) external view returns (string memory)",
        "function tokenMetadata(uint256 tokenId) external view returns (string memory)",
        "function tokenPrice(uint256 tokenId) external view returns (uint256)"
      ];
      
      let tokenContract;
      try {
        const signerOrProvider = signer || provider;
        tokenContract = new ethers.Contract(TOKEN_CONTRACT, TOKEN_ABI, signerOrProvider);
      } catch (tokenContractError) {
        console.error('❌ Failed to initialize token contract:', tokenContractError);
      }

      // 5. Process metadata and images for each owned asset
      const processAssetMetadata = async (tokenId: string): Promise<{ imageUrl: string; metadata: any; assetType: string }> => {
        try {
          // Fetch metadata URI from token contract
          let metadataURI = '';
          if (tokenContract) {
            try {
              metadataURI = await tokenContract.uri(tokenId);
              console.log(`📋 Metadata URI for token ${tokenId}:`, metadataURI);
            } catch (e) {
              console.warn(`⚠️ Failed to get metadata URI for token ${tokenId}`);
            }
          }

          // Fetch metadata from IPFS
          let metadata = null;
          if (metadataURI && metadataURI.startsWith('ipfs://')) {
            try {
              const ipfsHash = metadataURI.replace('ipfs://', '');
              const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
              
              const response = await Promise.race([
                fetch(ipfsUrl, { method: 'GET', headers: { 'Accept': 'application/json' } }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
              ]) as Response;
              
              if (response.ok) {
                metadata = await response.json();
                console.log(`✅ Metadata fetched for token ${tokenId}:`, metadata);
              }
            } catch (e) {
              console.warn(`⚠️ Failed to fetch metadata for token ${tokenId}`);
            }
          }

          // Determine asset type
          let assetType = 'Real World Asset';
          if (metadata?.attributes) {
            const assetTypeAttr = metadata.attributes.find((attr: any) => 
              attr.trait_type === 'Asset Type'
            );
            assetType = assetTypeAttr?.value || assetType;
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

          // Fallback images based on asset type
          if (!imageUrl || imageUrl.includes('placeholder')) {
            const fallbackImages = {
              'Real Estate': 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop',
              'Invoice': 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop',
              'Stocks': 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop',
              'Commodity': 'https://images.unsplash.com/photo-1622976520928-53c6b59f4e7e?w=800&h=600&fit=crop',
              'CarbonCredit': 'https://images.unsplash.com/photo-1569163139342-de0874c4e2c5?w=800&h=600&fit=crop',
              'Real World Asset': 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop'
            };
            imageUrl = fallbackImages[assetType as keyof typeof fallbackImages] || fallbackImages['Real World Asset'];
          }

          return { imageUrl, metadata, assetType };
        } catch (error) {
          console.error(`❌ Error processing metadata for token ${tokenId}:`, error);
          return {
            imageUrl: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop',
            metadata: null,
            assetType: 'Real World Asset'
          };
        }
      };

      // 6. Build user assets array with real metadata and images (with deduplication)
      const userAssetsArray: UserAsset[] = [];
      const processedTokenIds = new Set<string>(); // Track processed tokens to prevent duplicates
      
      for (let i = 0; i < myTokenIds.length; i++) {
        const tokenId = myTokenIds[i].toString();
        const amount = myAmounts[i].toNumber();
        const price = priceMap.get(tokenId) || ethers.BigNumber.from(0);

        // Skip if amount is 0 or token already processed
        if (amount <= 0) {
          console.log(`⏭️ Skipping token ${tokenId} - zero balance`);
          continue;
        }
        
        if (processedTokenIds.has(tokenId)) {
          console.log(`⏭️ Skipping duplicate token ${tokenId} - already processed`);
          continue;
        }

        // Mark token as processed
        processedTokenIds.add(tokenId);
        console.log(`🔄 Processing metadata for token ${tokenId}...`);
        
        const { imageUrl, metadata, assetType } = await processAssetMetadata(tokenId);

        userAssetsArray.push({
          tokenId: tokenId,
          name: metadata?.name || `Asset #${tokenId}`,
          description: metadata?.description || `A tokenized asset with ID ${tokenId}`,
          image: imageUrl,
          price: price.toString(), // Price in Wei
          amount: amount,
          seller: allIssuers[allTokenIds.findIndex((id: ethers.BigNumber) => id.toString() === tokenId)] || address,
          metadataURI: metadata ? `ipfs://token${tokenId}` : '',
          metadata: metadata || {
            name: `Asset #${tokenId}`,
            description: `A tokenized asset with ID ${tokenId}`
          },
          attributes: metadata?.attributes || [
            { trait_type: "Asset Type", value: assetType },
            { trait_type: "Token ID", value: tokenId }
          ],
          type: assetType
        });
      }

      setUserAssets(userAssetsArray);
      console.log('✅ Loaded', userAssetsArray.length, 'assets from blockchain with metadata');
      
      // Calculate portfolio data with real blockchain data
      calculatePortfolioDataFromBlockchain(userAssetsArray, priceMap);
      
      if (userAssetsArray.length === 0) {
        toast.info('No assets found. Make sure you have purchased tokens and the transaction is confirmed.');
      } else {
        toast.success(`Loaded ${userAssetsArray.length} assets from blockchain`);
      }
    } catch (error: any) {
      console.error('❌ Failed to load assets from blockchain:', error);
      setUserAssets([]);
      calculatePortfolioDataFromBlockchain([], new Map());
      toast.error(`Failed to load portfolio data: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Calculate portfolio analytics from blockchain data
  const calculatePortfolioDataFromBlockchain = (assets: UserAsset[], priceMap: Map<string, ethers.BigNumber>) => {
    if (assets.length === 0) {
      setPortfolioData({
        totalInvestment: 0,
        currentValue: 0,
        totalReturn: 0,
        returnPercentage: 0,
        monthlyIncome: 0,
        totalAssets: 0,
        activeInvestments: 0
      });
      return;
    }

    // Calculate total value by summing (amount * price) for all assets
    // Price is in Wei, convert to ETH by dividing by 10^18
    const totalValueETH = assets.reduce((sum, asset) => {
      const pricePerTokenWei = ethers.BigNumber.from(asset.price);
      const pricePerTokenETH = parseFloat(ethers.utils.formatEther(pricePerTokenWei)); // Convert Wei to ETH
      const assetTotalValue = pricePerTokenETH * asset.amount;
      console.log(`Asset ${asset.tokenId}: ${asset.amount} tokens × ${pricePerTokenETH.toFixed(6)} ETH = ${assetTotalValue.toFixed(6)} ETH`);
      return sum + assetTotalValue;
    }, 0);

    console.log(`Total portfolio value: ${totalValueETH.toFixed(6)} ETH`);

    // Use total value as current investment (real portfolio value)
    const totalInvestment = totalValueETH;
    const currentValue = totalValueETH;
    
    // For now, assume no gains/losses (can be updated later with historical data)
    const totalReturn = 0;
    const returnPercentage = 0;
    
    // Yearly income = 8% of current value per year
    const yearlyIncome = currentValue * 0.08;

    console.log(`Yearly income calculation: ${currentValue.toFixed(6)} ETH × 0.08 = ${yearlyIncome.toFixed(6)} ETH`);

    setPortfolioData({
      totalInvestment,
      currentValue,
      totalReturn,
      returnPercentage,
      monthlyIncome: yearlyIncome, // We'll rename this to yearlyIncome in the UI
      totalAssets: assets.length,
      activeInvestments: assets.filter(asset => parseFloat(asset.price) > 0).length
    });
  };

  // Sell asset function with real blockchain interaction
  const sellAsset = async () => {
    if (!selectedAsset || !sellAmount || !isConnected || !signer) {
      toast.error('Please enter a valid amount and ensure wallet is connected');
      return;
    }

    const amount = parseInt(sellAmount);
    if (amount <= 0 || amount > selectedAsset.amount) {
      toast.error(`Amount must be between 1 and ${selectedAsset.amount}`);
      return;
    }

    try {
      setSellLoading(true);
      
      console.log(`🔄 Selling ${amount} tokens of asset ${selectedAsset.tokenId} via marketplace contract...`);
      
      // Create marketplace contract instance
      const marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT, MARKETPLACE_ABI, signer);
      
      // Get token price from blockchain
      const tokenPrice = ethers.BigNumber.from(selectedAsset.price); // Price in Wei
      const totalValue = tokenPrice.mul(amount); // Total value for the amount being sold
      const platformFee = totalValue.mul(1).div(100); // 1% platform fee
      
      console.log('💰 Transaction details:', {
        tokenId: selectedAsset.tokenId,
        amount: amount,
        tokenPrice: ethers.utils.formatEther(tokenPrice) + ' ETH',
        totalValue: ethers.utils.formatEther(totalValue) + ' ETH',
        platformFee: ethers.utils.formatEther(platformFee) + ' ETH'
      });
      
      // Call sellAsset function on marketplace contract
      // The user pays the platform fee as msg.value
      console.log('📞 Calling sellAsset on marketplace contract...');
      const tx = await marketplaceContract.sellAsset(
        selectedAsset.tokenId,
        amount,
        {
          value: platformFee, // Pay 1% platform fee
          gasLimit: 500000 // Set gas limit
        }
      );
      
      console.log('⏳ Transaction submitted:', tx.hash);
      toast.info(`Transaction submitted: ${tx.hash.substring(0, 10)}...`);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', receipt);
      
      // Calculate final amounts
      const totalEthReceived = parseFloat(ethers.utils.formatEther(totalValue));
      const platformFeeEth = parseFloat(ethers.utils.formatEther(platformFee));
      
      toast.success(
        `Successfully sold ${amount} tokens for ${totalEthReceived.toFixed(4)} ETH! Platform fee: ${platformFeeEth.toFixed(4)} ETH`,
        { duration: 5000 }
      );
      
      // Close modal and reset
      setSellModalOpen(false);
      setSelectedAsset(null);
      setSellAmount('');
      
      // Refresh user assets to show updated portfolio
      console.log('🔄 Refreshing portfolio after successful sale...');
      await fetchUserAssetsFromBlockchain();
      
    } catch (error: any) {
      console.error('❌ Failed to sell asset:', error);
      
      let errorMessage = 'Failed to sell asset';
      if (error.message?.includes('Insufficient balance')) {
        errorMessage = 'Insufficient token balance for this transaction';
      } else if (error.message?.includes('Insufficient marketplace funds')) {
        errorMessage = 'Marketplace has insufficient funds to buy back this asset';
      } else if (error.message?.includes('Must pay platform fee')) {
        errorMessage = 'Failed to pay platform fee. Please ensure sufficient ETH balance.';
      } else if (error.code === 'ACTION_REJECTED') {
        errorMessage = 'Transaction was cancelled by user';
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient ETH for gas fees and platform fee';
      } else {
        errorMessage = `Transaction failed: ${error.message || 'Unknown error'}`;
      }
      
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setSellLoading(false);
    }
  };

  // Open sell modal
  const openSellModal = (asset: UserAsset) => {
    setSelectedAsset(asset);
    setSellAmount('');
    setSellModalOpen(true);
  };

  // Open details modal
  const openDetailsModal = (asset: UserAsset) => {
    setSelectedAssetForDetails(asset);
    setDetailsModalOpen(true);
  };

  // Check wallet connection on mount and load assets
  useEffect(() => {
    if (isConnected && address) {
      console.log('Wallet connected, loading assets...');
      fetchUserAssetsFromBlockchain();
    }
  }, [isConnected, address]);

  // Robust Image Component with fallbacks (same as marketplace)
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

  // Portfolio performance chart with real data visualization - RESPONSIVE
  const PortfolioChart: React.FC = () => {
    // Generate sample data points for the last 6 months
    const generateChartData = () => {
      const currentValue = portfolioData.currentValue || 1; // Fallback to 1 if 0
      const baseValue = currentValue * 0.85; // Start 15% lower to show growth
      
      const dataPoints = [];
      for (let i = 0; i < 24; i++) { // 24 points for smooth curve
        const progress = i / 23;
        const randomVariation = (Math.random() - 0.5) * 0.1; // ±5% random variation
        const growthFactor = 1 + (progress * 0.15) + randomVariation; // 15% overall growth
        const value = Math.max(baseValue * growthFactor, 0.001); // Ensure positive values
        dataPoints.push(value);
      }
      return dataPoints;
    };

    const chartData = generateChartData();
    const maxValue = Math.max(...chartData);
    const minValue = Math.min(...chartData);
    const valueRange = maxValue - minValue || 1; // Prevent division by zero

    // Fixed SVG dimensions for proper scaling
    const width = 800;
    const height = 300;
    const padding = 40;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);

    // Create SVG path
    const createPath = () => {
      let path = '';
      chartData.forEach((value, index) => {
        const x = (index / (chartData.length - 1)) * chartWidth + padding;
        const y = height - padding - ((value - minValue) / valueRange) * chartHeight;
        
        if (index === 0) {
          path += `M ${x} ${y}`;
        } else {
          path += ` L ${x} ${y}`;
        }
      });
      return path;
    };

    // Create gradient area path
    const createAreaPath = () => {
      let path = createPath();
      const lastX = chartWidth + padding;
      const bottomY = height - padding;
      path += ` L ${lastX} ${bottomY} L ${padding} ${bottomY} Z`;
      return path;
    };

    const currentGrowth = ((chartData[chartData.length - 1] - chartData[0]) / chartData[0] * 100).toFixed(1);

    return (
      <div className="w-full h-full flex flex-col">
        {/* Chart Header - Mobile Friendly */}
        <div className="mb-3 md:mb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="text-sm md:text-base font-semibold text-gray-900">Portfolio Value</h3>
            <p className="text-base md:text-xl font-bold text-gray-900">
              {chartData[chartData.length - 1].toFixed(4)} ETH
            </p>
            <p className={`text-xs md:text-sm ${parseFloat(currentGrowth) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {parseFloat(currentGrowth) >= 0 ? '+' : ''}{currentGrowth}% (6 months)
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs md:text-sm">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">Portfolio Value</span>
          </div>
        </div>
        
        {/* Chart Container - Responsive */}
        <div className="flex-1 min-h-0 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${width} ${height}`}
              className="max-w-full max-h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Definitions */}
              <defs>
                <pattern id="gridPattern" width="40" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#f1f5f9" strokeWidth="1"/>
                </pattern>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              
              {/* Grid background */}
              <rect 
                x={padding} 
                y={padding} 
                width={chartWidth} 
                height={chartHeight} 
                fill="url(#gridPattern)" 
                opacity="0.5"
              />
              
              {/* Area under curve */}
              <path
                d={createAreaPath()}
                fill="url(#areaGradient)"
              />
              
              {/* Main line */}
              <path
                d={createPath()}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Data points */}
              {chartData.map((value, index) => {
                if (index % 4 === 0) { // Show every 4th point to avoid crowding
                  const x = (index / (chartData.length - 1)) * chartWidth + padding;
                  const y = height - padding - ((value - minValue) / valueRange) * chartHeight;
                  
                  return (
                    <circle
                      key={index}
                      cx={x}
                      cy={y}
                      r="4"
                      fill="#3b82f6"
                      stroke="white"
                      strokeWidth="2"
                      className="drop-shadow-sm"
                    >
                      <title>{value.toFixed(4)} ETH</title>
                    </circle>
                  );
                }
                return null;
              })}
              
              {/* Y-axis labels */}
              <text x={padding - 10} y={padding + 5} textAnchor="end" className="text-xs fill-gray-500 font-medium">
                {maxValue.toFixed(3)} ETH
              </text>
              <text x={padding - 10} y={height - padding + 5} textAnchor="end" className="text-xs fill-gray-500 font-medium">
                {minValue.toFixed(3)} ETH
              </text>
              
              {/* X-axis labels */}
              <text x={padding} y={height - 10} textAnchor="start" className="text-xs fill-gray-500 font-medium">
                6 months ago
              </text>
              <text x={width - padding} y={height - 10} textAnchor="end" className="text-xs fill-gray-500 font-medium">
                Today
              </text>
            </svg>
          </div>
        </div>
        
        {/* Chart Stats - Mobile Friendly Grid */}
        <div className="mt-3 md:mt-4 grid grid-cols-3 gap-2 md:gap-4 pt-3 border-t border-gray-100">
          <div className="text-center">
            <p className="text-xs text-gray-500 font-medium">HIGHEST</p>
            <p className="text-xs md:text-sm font-bold text-gray-900">{maxValue.toFixed(4)} ETH</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 font-medium">LOWEST</p>
            <p className="text-xs md:text-sm font-bold text-gray-900">{minValue.toFixed(4)} ETH</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 font-medium">GROWTH</p>
            <p className={`text-xs md:text-sm font-bold ${parseFloat(currentGrowth) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {parseFloat(currentGrowth) >= 0 ? '+' : ''}{currentGrowth}%
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Asset allocation doughnut chart - RESPONSIVE
  const AssetAllocationChart: React.FC = () => {
    const assetTypes = userAssets.reduce((acc, asset) => {
      const type = asset.type || 'Other';
      if (!acc[type]) acc[type] = 0;
      const assetValue = parseFloat(ethers.utils.formatEther(asset.price)) * asset.amount;
      acc[type] += assetValue;
      return acc;
    }, {} as Record<string, number>);

    const total = Object.values(assetTypes).reduce((sum, value) => sum + value, 0);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    
    if (total === 0) {
      return (
        <div className="w-full h-full flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <PieChart className="w-12 md:w-16 h-12 md:h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium text-sm md:text-base">Asset Allocation</p>
              <p className="text-gray-400 text-xs md:text-sm mt-1">No assets to display</p>
            </div>
          </div>
        </div>
      );
    }

    let cumulativePercentage = 0;
    const radius = 80;
    const centerX = 140;
    const centerY = 120;
    const width = 280;
    const height = 240;

    return (
      <div className="w-full h-full flex flex-col">
        {/* Chart Header */}
        <div className="mb-3 md:mb-4 text-center">
          <h3 className="text-sm md:text-base font-semibold text-gray-900">Asset Distribution</h3>
          <p className="text-base md:text-xl font-bold text-gray-900">{userAssets.length} Assets</p>
          <p className="text-xs md:text-sm text-gray-600">{total.toFixed(4)} ETH Total</p>
        </div>
        
        {/* Chart Container */}
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div className="relative w-full h-full max-w-xs">
            <svg 
              width="100%" 
              height="100%"
              viewBox={`0 0 ${width} ${height}`}
              className="max-w-full max-h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              {Object.entries(assetTypes).map(([type, value], index) => {
                const percentage = (value / total) * 100;
                const startAngle = (cumulativePercentage / 100) * 360;
                const endAngle = ((cumulativePercentage + percentage) / 100) * 360;
                
                const startAngleRad = (startAngle - 90) * (Math.PI / 180);
                const endAngleRad = (endAngle - 90) * (Math.PI / 180);
                
                const x1 = centerX + radius * Math.cos(startAngleRad);
                const y1 = centerY + radius * Math.sin(startAngleRad);
                const x2 = centerX + radius * Math.cos(endAngleRad);
                const y2 = centerY + radius * Math.sin(endAngleRad);
                
                const largeArcFlag = percentage > 50 ? 1 : 0;
                
                const pathData = [
                  `M ${centerX} ${centerY}`,
                  `L ${x1} ${y1}`,
                  `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                  'Z'
                ].join(' ');
                
                cumulativePercentage += percentage;
                
                return (
                  <g key={type}>
                    <path
                      d={pathData}
                      fill={colors[index % colors.length]}
                      className="hover:opacity-80 transition-opacity cursor-pointer drop-shadow-sm"
                    >
                      <title>{type}: {percentage.toFixed(1)}%</title>
                    </path>
                  </g>
                );
              })}
              
              {/* Center circle */}
              <circle cx={centerX} cy={centerY} r={radius * 0.55} fill="white" className="drop-shadow-sm" />
              <text x={centerX} y={centerY - 5} textAnchor="middle" className="text-xs fill-gray-500 font-medium">
                Total Value
              </text>
              <text x={centerX} y={centerY + 8} textAnchor="middle" className="text-xs md:text-sm fill-gray-900 font-bold">
                {total.toFixed(3)} ETH
              </text>
            </svg>
          </div>
        </div>
        
        {/* Legend */}
        <div className="mt-3 md:mt-4 space-y-1 md:space-y-2 pt-3 border-t border-gray-100">
          {Object.entries(assetTypes).map(([type, value], index) => {
            const percentage = (value / total) * 100;
            return (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: colors[index % colors.length] }}
                  ></div>
                  <span className="text-xs md:text-sm font-medium text-gray-700 truncate">{type}</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs md:text-sm font-bold text-gray-900">{percentage.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">{value.toFixed(3)} ETH</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'analytics':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Analytics Overview</h1>
                <p className="text-gray-600 mt-1">Portfolio insights and performance metrics</p>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">Live</span>
                </div>
                <Button variant="outline" size="sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  Last 30 days
                </Button>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
              <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-xs md:text-sm font-medium text-gray-600 mb-2">TOTAL INVESTMENT</p>
                      <div className="flex items-center space-x-2 mb-2">
                        <p className="text-base md:text-lg lg:text-xl font-bold text-gray-900 truncate">
                          {balanceVisible ? `${portfolioData.totalInvestment.toFixed(4)} ETH` : '••••••'}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setBalanceVisible(!balanceVisible)}
                          className="h-5 w-5 p-0 flex-shrink-0"
                        >
                          {balanceVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </Button>
                      </div>
                      <p className="text-green-600 text-xs md:text-sm">
                        {isConnected ? '+2.4% from last month' : 'Connect wallet to view'}
                      </p>
                    </div>
                    <div className="p-1.5 md:p-2 bg-gray-100 rounded-lg flex-shrink-0">
                      <TrendingUp className="w-4 md:w-5 h-4 md:h-5 text-gray-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-xs md:text-sm font-medium text-gray-600 mb-2">CURRENT VALUE</p>
                      <p className="text-base md:text-lg lg:text-xl font-bold text-gray-900 mb-2 truncate">
                        {balanceVisible ? `${portfolioData.currentValue.toFixed(4)} ETH` : '••••••'}
                      </p>
                      <p className="text-green-600 text-xs md:text-sm">
                        +{portfolioData.returnPercentage.toFixed(2)}% total return
                      </p>
                    </div>
                    <div className="p-1.5 md:p-2 bg-gray-100 rounded-lg flex-shrink-0">
                      <ArrowUpRight className="w-4 md:w-5 h-4 md:h-5 text-gray-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-xs md:text-sm font-medium text-gray-600 mb-2">TOTAL RETURN</p>
                      <div className="flex flex-col space-y-1 mb-2">
                        <p className="text-base md:text-lg lg:text-xl font-bold text-gray-900 truncate">
                          {balanceVisible ? `${portfolioData.totalReturn.toFixed(4)} ETH` : '••••••'}
                        </p>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs w-fit">
                          +{portfolioData.returnPercentage.toFixed(2)}%
                        </Badge>
                      </div>
                      <p className="text-green-600 text-xs md:text-sm">Above market average</p>
                    </div>
                    <div className="p-1.5 md:p-2 bg-gray-100 rounded-lg flex-shrink-0">
                      <TrendingUp className="w-4 md:w-5 h-4 md:h-5 text-gray-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-xs md:text-sm font-medium text-gray-600 mb-2">YEARLY INCOME</p>
                      <p className="text-base md:text-lg lg:text-xl font-bold text-gray-900 mb-2 truncate">
                        {balanceVisible ? `${portfolioData.monthlyIncome.toFixed(4)} ETH` : '••••••'}
                      </p>
                      <p className="text-green-600 text-xs md:text-sm">8% yield annually</p>
                    </div>
                    <div className="p-1.5 md:p-2 bg-gray-100 rounded-lg flex-shrink-0">
                      <DollarSign className="w-4 md:w-5 h-4 md:h-5 text-gray-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section - Improved Responsive Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <Card className="xl:col-span-2 border border-gray-200 shadow-sm flex flex-col min-h-[400px] lg:min-h-[500px]">
                <CardHeader className="pb-4 flex-shrink-0">
                  <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-lg md:text-xl font-bold text-gray-900">Portfolio Performance</span>
                      <p className="text-gray-600 text-sm">6-month growth trajectory</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-gray-600">Live</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 p-4 md:p-6">
                  <div className="h-full w-full">
                    <PortfolioChart />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm flex flex-col min-h-[400px] lg:min-h-[500px]">
                <CardHeader className="pb-4 flex-shrink-0">
                  <CardTitle>
                    <span className="text-lg md:text-xl font-bold text-gray-900">Asset Allocation</span>
                    <p className="text-gray-600 text-sm">Portfolio distribution</p>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 p-4 md:p-6">
                  <div className="h-full w-full">
                    <AssetAllocationChart />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'portfolio':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Owned Assets</h1>
                <p className="text-gray-600 mt-1">Your tokenized real-world asset portfolio</p>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                <Badge variant="secondary" className="bg-gray-100 text-gray-900 px-3 py-1">
                  <Wallet className="w-4 h-4 mr-2" />
                  {userAssets.length} Assets
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => isConnected && fetchUserAssetsFromBlockchain()}
                  disabled={loading || !isConnected}
                >
                  <PieChart className="w-4 h-4 mr-2" />
                  {loading ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
            </div>

            {!isConnected ? (
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-12 text-center">
                  <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Connect Your Wallet</h3>
                  <p className="text-gray-600 mb-6">Connect your wallet to view your owned assets</p>
                  <Button onClick={connectWallet} disabled={loading}>
                    <Wallet className="w-4 h-4 mr-2" />
                    {loading ? 'Connecting...' : 'Connect Wallet'}
                  </Button>
                </CardContent>
              </Card>
            ) : userAssets.length === 0 ? (
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-12 text-center">
                  <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Assets Found</h3>
                  <p className="text-gray-600 mb-6">
                    {loading ? 'Loading your assets...' : 'You don\'t own any tokenized assets yet'}
                  </p>
                  {!loading && (
                    <Button variant="outline" onClick={() => window.open('/marketplace', '_blank')}>
                      <Building className="w-4 h-4 mr-2" />
                      Browse Marketplace
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {userAssets.map((asset, index) => {
                  const assetValueETH = parseFloat(ethers.utils.formatEther(asset.price)) * asset.amount; // Convert Wei to ETH
                  const IconComponent = asset.type === 'Real Estate' ? Building : 
                                       asset.type === 'Invoice' ? FileText :
                                       asset.type === 'Commodity' ? Coins : Leaf;
                  
                  return (
                    <Card key={asset.tokenId} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4 md:p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="p-2 md:p-3 bg-gray-100 rounded-lg flex-shrink-0">
                              <IconComponent className="w-5 md:w-6 h-5 md:h-6 text-gray-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-base md:text-lg font-bold text-gray-900 truncate">{asset.name}</h3>
                              <p className="text-gray-600 text-sm truncate">{asset.type}</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-3">
                            <Badge variant="outline" className="mb-2 text-xs">
                              {asset.amount} tokens
                            </Badge>
                            <div className="flex items-center text-green-600">
                              <ArrowUpRight className="w-3 h-3 mr-1" />
                              <span className="font-medium text-xs">+5.0%</span>
                            </div>
                          </div>
                        </div>

                        {asset.image && (
                          <div className="mb-4">
                            <RobustImage
                              src={asset.image}
                              alt={asset.name}
                              className="w-full h-32 object-cover rounded-lg"
                              fallbackSrc="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop"
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4">
                          <div className="bg-gray-50 p-2 md:p-3 rounded-lg">
                            <p className="text-xs font-medium text-gray-600 mb-1">TOKEN ID</p>
                            <p className="text-sm md:text-lg font-bold text-gray-900">#{asset.tokenId}</p>
                          </div>
                          <div className="bg-gray-50 p-2 md:p-3 rounded-lg">
                            <p className="text-xs font-medium text-gray-600 mb-1">TOTAL VALUE</p>
                            <p className="text-sm md:text-lg font-bold text-green-600">{assetValueETH.toFixed(4)} ETH</p>
                          </div>
                          <div className="bg-gray-50 p-2 md:p-3 rounded-lg">
                            <p className="text-xs font-medium text-gray-600 mb-1">PRICE PER TOKEN</p>
                            <p className="text-sm md:text-lg font-bold text-gray-900">
                              {parseFloat(ethers.utils.formatEther(asset.price)).toFixed(4)} ETH
                            </p>
                          </div>
                          <div className="bg-gray-50 p-2 md:p-3 rounded-lg">
                            <p className="text-xs font-medium text-gray-600 mb-1">PERFORMANCE</p>
                            <p className="text-sm md:text-lg font-bold text-green-600">+5.0%</p>
                          </div>
                        </div>

                        {asset.description && (
                          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-xs font-medium text-blue-600 mb-1">DESCRIPTION</p>
                            <p className="text-sm text-blue-800">{asset.description}</p>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                          <Button 
                            variant="outline" 
                            className="flex-1 text-sm"
                            onClick={() => openDetailsModal(asset)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                          <Button 
                            variant="destructive" 
                            className="flex-1 text-sm"
                            onClick={() => openSellModal(asset)}
                          >
                            <DollarSign className="w-4 h-4 mr-2" />
                            Sell Asset
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'income':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Income</h1>
                <p className="text-gray-600 mt-1">Track your passive income from tokenized assets</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 md:px-6 py-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-900 rounded-lg">
                    <DollarSign className="w-4 md:w-5 h-4 md:h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-medium text-gray-600">YEARLY INCOME</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900">
                      {isConnected ? `${portfolioData.monthlyIncome.toFixed(4)} ETH` : 'Connect Wallet'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-900 rounded-lg">
                      <Activity className="w-5 md:w-6 h-5 md:h-6 text-white" />
                    </div>
                    <div>
                      <span className="text-lg md:text-2xl font-bold text-gray-900">Recent Income</span>
                      <p className="text-gray-600 text-sm">Last 60 days earnings</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600 font-medium">Auto-credited</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {MOCK_INCOME_HISTORY.map((income, index) => (
                    <div key={index} className="group">
                      <div className="flex items-center justify-between p-4 md:p-6 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                          <div className="p-2 md:p-3 bg-green-100 rounded-lg flex-shrink-0">
                            <DollarSign className="w-5 md:w-6 h-5 md:h-6 text-green-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-gray-900 text-sm md:text-lg truncate">{income.asset}</p>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mt-1">
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs w-fit">
                                {income.type}
                              </Badge>
                              <span className="text-gray-500 text-xs md:text-sm font-medium mt-1 sm:mt-0">{income.date}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="text-xl md:text-3xl font-bold text-green-600">+${income.amount.toLocaleString()}</p>
                          <div className="flex items-center justify-end space-x-1 text-green-500 mt-1">
                            <ArrowUpRight className="w-3 h-3" />
                            <span className="text-xs font-medium">Credited</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 p-4 md:p-6 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2">Income Analytics</h3>
                      <p className="text-gray-600 text-sm">Your passive income is performing 23% above market average</p>
                    </div>
                    <Button className="bg-gray-900 hover:bg-gray-800 text-white w-fit">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'transactions':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Transaction History</h1>
                <p className="text-gray-600 mt-1">View your complete trading and investment history</p>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>

            {/* Transaction Filters */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-gray-100 text-gray-900">All Transactions</Badge>
              <Badge variant="outline">Buys</Badge>
              <Badge variant="outline">Sells</Badge>
              <Badge variant="outline">Dividends</Badge>
            </div>

            {/* Transactions List */}
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left py-3 px-4 md:px-6 text-xs md:text-sm font-medium text-gray-600 uppercase tracking-wide">Date</th>
                        <th className="text-left py-3 px-4 md:px-6 text-xs md:text-sm font-medium text-gray-600 uppercase tracking-wide">Asset</th>
                        <th className="text-left py-3 px-4 md:px-6 text-xs md:text-sm font-medium text-gray-600 uppercase tracking-wide">Type</th>
                        <th className="text-right py-3 px-4 md:px-6 text-xs md:text-sm font-medium text-gray-600 uppercase tracking-wide">Amount</th>
                        <th className="text-right py-3 px-4 md:px-6 text-xs md:text-sm font-medium text-gray-600 uppercase tracking-wide">Price</th>
                        <th className="text-center py-3 px-4 md:px-6 text-xs md:text-sm font-medium text-gray-600 uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {MOCK_TRANSACTIONS.map((transaction, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 md:px-6 text-xs md:text-sm text-gray-900">
                            <div>
                              <div className="font-medium">{transaction.date}</div>
                              <div className="text-gray-500 text-xs">{transaction.time}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4 md:px-6">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Building className="w-4 md:w-5 h-4 md:h-5 text-gray-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs md:text-sm font-medium text-gray-900 truncate">{transaction.asset}</p>
                                <p className="text-xs text-gray-500 truncate">{transaction.location}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 md:px-6">
                            <Badge 
                              variant={transaction.type === 'buy' ? 'default' : transaction.type === 'sell' ? 'secondary' : 'outline'}
                              className={`text-xs ${
                                transaction.type === 'buy' ? 'bg-green-100 text-green-800' :
                                transaction.type === 'sell' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 md:px-6 text-right text-xs md:text-sm font-medium text-gray-900">
                            {transaction.shares} {transaction.shares === 1 ? 'share' : 'shares'}
                          </td>
                          <td className="py-3 px-4 md:px-6 text-right text-xs md:text-sm font-bold text-gray-900">
                            ${transaction.amount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 md:px-6 text-center">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                transaction.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                transaction.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                'bg-red-50 text-red-700 border-red-200'
                              }`}
                            >
                              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Load More */}
                <div className="border-t border-gray-200 p-4 md:p-6 text-center">
                  <Button variant="outline" size="sm">
                    Load More Transactions
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Transaction Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">TOTAL BOUGHT</p>
                      <p className="text-xl md:text-2xl font-bold text-gray-900">
                        ${MOCK_TRANSACTIONS
                          .filter(t => t.type === 'buy')
                          .reduce((sum, t) => sum + t.amount, 0)
                          .toLocaleString()}
                      </p>
                      <p className="text-gray-500 text-xs md:text-sm mt-1">
                        {MOCK_TRANSACTIONS.filter(t => t.type === 'buy').length} transactions
                      </p>
                    </div>
                    <div className="p-2 md:p-3 bg-green-100 rounded-lg">
                      <ArrowUpRight className="w-5 md:w-6 h-5 md:h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">TOTAL SOLD</p>
                      <p className="text-xl md:text-2xl font-bold text-gray-900">
                        ${MOCK_TRANSACTIONS
                          .filter(t => t.type === 'sell')
                          .reduce((sum, t) => sum + t.amount, 0)
                          .toLocaleString()}
                      </p>
                      <p className="text-gray-500 text-xs md:text-sm mt-1">
                        {MOCK_TRANSACTIONS.filter(t => t.type === 'sell').length} transactions
                      </p>
                    </div>
                    <div className="p-2 md:p-3 bg-red-100 rounded-lg">
                      <ArrowDownRight className="w-5 md:w-6 h-5 md:h-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">DIVIDEND INCOME</p>
                      <p className="text-xl md:text-2xl font-bold text-gray-900">
                        ${MOCK_TRANSACTIONS
                          .filter(t => t.type === 'dividend')
                          .reduce((sum, t) => sum + t.amount, 0)
                          .toLocaleString()}
                      </p>
                      <p className="text-gray-500 text-xs md:text-sm mt-1">
                        {MOCK_TRANSACTIONS.filter(t => t.type === 'dividend').length} payments
                      </p>
                    </div>
                    <div className="p-2 md:p-3 bg-blue-100 rounded-lg">
                      <DollarSign className="w-5 md:w-6 h-5 md:h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Profile Settings</h1>
                <p className="text-gray-600 mt-1">Manage your account and preferences</p>
              </div>
              <Button className="bg-gray-900 hover:bg-gray-800 text-white w-fit">
                <Settings className="w-4 h-4 mr-2" />
                Advanced Settings
              </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profile Info Card */}
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-900 rounded-lg">
                      <User className="w-5 md:w-6 h-5 md:h-6 text-white" />
                    </div>
                    <div>
                      <span className="text-lg md:text-2xl font-bold text-gray-900">Profile Information</span>
                      <p className="text-gray-600 text-sm">Your account details</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                    <div className="relative">
                      <Avatar className="w-20 h-20 md:w-24 md:h-24 border-4 border-gray-200">
                        <AvatarImage src="/placeholder-avatar.jpg" />
                        <AvatarFallback className="bg-gray-900 text-white text-xl md:text-2xl font-bold">
                          JD
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-2 -right-2 p-1.5 md:p-2 bg-green-500 rounded-full shadow-lg">
                        <Check className="w-3 h-3 md:w-4 md:h-4 text-white" />
                      </div>
                    </div>
                    <div className="space-y-2 text-center sm:text-left">
                      <h3 className="text-xl md:text-2xl font-bold text-gray-900">John Investor</h3>
                      <p className="text-gray-600">Premium Account Holder</p>
                      <Badge className="bg-green-50 text-green-700 border-green-200">
                        <Star className="w-3 h-3 mr-1" />
                        Verified Investor
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">Email Address</p>
                          <p className="text-gray-600 text-sm">john.investor@example.com</p>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Verified
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">Phone Number</p>
                          <p className="text-gray-600 text-sm">+1 (555) 123-4567</p>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Verified
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">Member Since</p>
                          <p className="text-gray-600 text-sm">January 2024</p>
                        </div>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          8 months
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Account Stats Card */}
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-900 rounded-lg">
                      <BarChart3 className="w-5 md:w-6 h-5 md:h-6 text-white" />
                    </div>
                    <div>
                      <span className="text-lg md:text-2xl font-bold text-gray-900">Account Statistics</span>
                      <p className="text-gray-600 text-sm">Your investment journey</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 md:p-4 bg-green-50 rounded-lg border border-green-200 text-center">
                      <div className="p-2 bg-green-100 rounded-lg w-fit mx-auto mb-3">
                        <TrendingUp className="w-4 md:w-5 h-4 md:h-5 text-green-600" />
                      </div>
                      <p className="text-lg md:text-2xl font-bold text-green-600">47</p>
                      <p className="text-green-700 text-xs md:text-sm font-medium">Assets Owned</p>
                    </div>
                    
                    <div className="p-3 md:p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
                      <div className="p-2 bg-blue-100 rounded-lg w-fit mx-auto mb-3">
                        <Activity className="w-4 md:w-5 h-4 md:h-5 text-blue-600" />
                      </div>
                      <p className="text-lg md:text-2xl font-bold text-blue-600">127</p>
                      <p className="text-blue-700 text-xs md:text-sm font-medium">Transactions</p>
                    </div>
                    
                    <div className="p-3 md:p-4 bg-orange-50 rounded-lg border border-orange-200 text-center">
                      <div className="p-2 bg-orange-100 rounded-lg w-fit mx-auto mb-3">
                        <Calendar className="w-4 md:w-5 h-4 md:h-5 text-orange-600" />
                      </div>
                      <p className="text-lg md:text-2xl font-bold text-orange-600">8</p>
                      <p className="text-orange-700 text-xs md:text-sm font-medium">Months Active</p>
                    </div>
                    
                    <div className="p-3 md:p-4 bg-purple-50 rounded-lg border border-purple-200 text-center">
                      <div className="p-2 bg-purple-100 rounded-lg w-fit mx-auto mb-3">
                        <Award className="w-4 md:w-5 h-4 md:h-5 text-purple-600" />
                      </div>
                      <p className="text-lg md:text-2xl font-bold text-purple-600">Gold</p>
                      <p className="text-purple-700 text-xs md:text-sm font-medium">Tier Status</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900 text-sm">Investment Level</span>
                      <Badge className="bg-yellow-50 text-orange-700 border-orange-200">
                        <Award className="w-3 h-3 mr-1" />
                        Premium Investor
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900 text-sm">Risk Profile</span>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Moderate
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900 text-sm">Preferred Assets</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Real Estate
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Settings & Preferences */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-900 rounded-lg">
                    <Settings className="w-5 md:w-6 h-5 md:h-6 text-white" />
                  </div>
                  <div>
                    <span className="text-lg md:text-2xl font-bold text-gray-900">Preferences & Settings</span>
                    <p className="text-gray-600 text-sm">Customize your experience</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 text-base md:text-lg">Notifications</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <p className="font-medium text-gray-900">Email Notifications</p>
                          <p className="text-sm text-gray-600">Receive updates via email</p>
                        </div>
                        <div className="w-12 h-6 bg-green-500 rounded-full relative">
                          <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <p className="font-medium text-gray-900">Push Notifications</p>
                          <p className="text-sm text-gray-600">Real-time alerts</p>
                        </div>
                        <div className="w-12 h-6 bg-gray-300 rounded-full relative">
                          <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5 shadow-sm"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 text-base md:text-lg">Privacy</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <p className="font-medium text-gray-900">Portfolio Visibility</p>
                          <p className="text-sm text-gray-600">Show portfolio to others</p>
                        </div>
                        <div className="w-12 h-6 bg-gray-300 rounded-full relative">
                          <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5 shadow-sm"></div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <p className="font-medium text-gray-900">Analytics Tracking</p>
                          <p className="text-sm text-gray-600">Help improve our service</p>
                        </div>
                        <div className="w-12 h-6 bg-green-500 rounded-full relative">
                          <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">
              {SIDEBAR_ITEMS.find(item => item.id === activeSection)?.label}
            </h1>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <p className="text-gray-600">This section is coming soon...</p>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className={`min-h-screen flex ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.div
        className={`fixed left-0 top-0 h-full shadow-lg z-50 transition-all duration-300 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'
        } ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        } ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
        initial={false}
        animate={{ 
          width: sidebarCollapsed ? 64 : 256
        }}
      >
        {/* Logo */}
        <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                darkMode ? 'bg-gray-100' : 'bg-gray-900'
              }`}>
                <Home className={`w-5 h-5 ${darkMode ? 'text-gray-900' : 'text-white'}`} />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <p className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>AssetDash</p>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Portfolio Manager</p>
                </div>
              )}
            </div>
            {/* Mobile Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4">
          <div className="space-y-2">
            {SIDEBAR_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  setMobileMenuOpen(false); // Close mobile menu when item is selected
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  activeSection === item.id
                    ? `${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`
                    : `${darkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
                }`}
              >
                <item.icon className="w-5 h-5" />
                {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
              </button>
            ))}
          </div>
        </nav>

        {/* Collapse Button - Desktop Only */}
        <div className="absolute bottom-4 left-4 right-4 hidden lg:block">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full justify-center hover:bg-gray-100"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
          </Button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      } ml-0`}>
        {/* Header */}
        <header className={`border-b px-4 md:px-6 py-4 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Welcome back,</p>
                <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {isConnected && address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Investor'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 md:space-x-4">
              {/* Wallet Connection */}
              {!isConnected ? (
                <Button 
                  onClick={connectWallet}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  {loading ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-green-50 border border-green-200 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-700">Connected</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchUserAssetsFromBlockchain()}
                    disabled={loading}
                    className="hidden md:flex"
                  >
                    {loading ? 'Loading...' : 'Refresh'}
                  </Button>
                </div>
              )}
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setDarkMode(!darkMode)}
                className={`hidden md:flex ${
                  darkMode ? 'hover:bg-gray-700 text-yellow-400' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <Lightbulb className={`w-5 h-5 ${darkMode ? 'fill-current' : ''}`} />
              </Button>
              <Button variant="ghost" size="sm" className="hidden md:flex">
                <Bell className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm" className="hidden md:flex">
                <Settings className="w-5 h-5" />
              </Button>
              <Separator orientation="vertical" className="h-6 hidden md:block" />
              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className={`p-4 md:p-6 ${darkMode ? 'bg-gray-900' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className={darkMode ? 'text-white' : ''}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Asset Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Eye className="w-5 h-5 text-blue-600" />
              <span>Asset Details</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedAssetForDetails && (
            <div className="space-y-6">
              {/* Asset Image */}
              <div className="w-full h-48 rounded-lg overflow-hidden">
                <RobustImage
                  src={selectedAssetForDetails.image}
                  alt={selectedAssetForDetails.name}
                  className="w-full h-full object-cover"
                  fallbackSrc="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop"
                />
              </div>

              {/* Basic Info */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedAssetForDetails.name}</h3>
                <p className="text-gray-600 leading-relaxed">{selectedAssetForDetails.description}</p>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs font-medium text-gray-600 mb-1">TOKEN ID</p>
                  <p className="text-lg font-bold text-gray-900">#{selectedAssetForDetails.tokenId}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs font-medium text-gray-600 mb-1">OWNED TOKENS</p>
                  <p className="text-lg font-bold text-blue-600">{selectedAssetForDetails.amount}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs font-medium text-gray-600 mb-1">PRICE PER TOKEN</p>
                  <p className="text-lg font-bold text-green-600">
                    {parseFloat(ethers.utils.formatEther(selectedAssetForDetails.price)).toFixed(6)} ETH
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs font-medium text-gray-600 mb-1">TOTAL VALUE</p>
                  <p className="text-lg font-bold text-green-600">
                    {(parseFloat(ethers.utils.formatEther(selectedAssetForDetails.price)) * selectedAssetForDetails.amount).toFixed(6)} ETH
                  </p>
                </div>
              </div>

              {/* Asset Attributes */}
              {selectedAssetForDetails.attributes && selectedAssetForDetails.attributes.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Asset Properties</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedAssetForDetails.attributes.map((attr, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <span className="text-sm font-medium text-blue-700">{attr.trait_type}:</span>
                        <span className="text-sm font-bold text-blue-900">{attr.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Blockchain Info */}
              <div className="bg-gray-900 text-white p-4 rounded-lg">
                <h4 className="text-lg font-semibold mb-3 flex items-center">
                  <Building className="w-5 h-5 mr-2" />
                  Blockchain Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Contract:</span>
                    <span className="font-mono bg-gray-800 px-2 py-1 rounded">
                      {selectedAssetForDetails.seller.substring(0, 10)}...{selectedAssetForDetails.seller.substring(selectedAssetForDetails.seller.length - 8)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Asset Type:</span>
                    <span className="font-medium">{selectedAssetForDetails.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Network:</span>
                    <span className="font-medium">Arbitrum Sepolia</span>
                  </div>
                  {selectedAssetForDetails.metadataURI && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">Metadata:</span>
                      <span className="font-mono bg-gray-800 px-2 py-1 rounded text-xs">IPFS</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Performance & Yield
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-green-700 font-medium">Current Performance</p>
                    <p className="text-xl font-bold text-green-600">+5.2%</p>
                    <p className="text-xs text-green-600">Since purchase</p>
                  </div>
                  <div className="text-center">
                    <p className="text-green-700 font-medium">Estimated Yearly Yield</p>
                    <p className="text-xl font-bold text-green-600">8.0%</p>
                    <p className="text-xs text-green-600">Based on asset type</p>
                  </div>
                  <div className="text-center">
                    <p className="text-green-700 font-medium">Monthly Income</p>
                    <p className="text-xl font-bold text-green-600">
                      {((parseFloat(ethers.utils.formatEther(selectedAssetForDetails.price)) * selectedAssetForDetails.amount) * 0.08 / 12).toFixed(6)} ETH
                    </p>
                    <p className="text-xs text-green-600">Estimated</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setDetailsModalOpen(false)}
                >
                  Close
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={() => {
                    setDetailsModalOpen(false);
                    openSellModal(selectedAssetForDetails);
                  }}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Sell Asset
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sell Asset Modal */}
      <Dialog open={sellModalOpen} onOpenChange={setSellModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-red-600" />
              <span>Sell Asset</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedAsset && (
            <div className="space-y-4">
              {/* Asset Info */}
              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Building className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{selectedAsset.name}</h3>
                    <p className="text-sm text-gray-600">Token ID: #{selectedAsset.tokenId}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Owned Tokens</p>
                    <p className="font-bold text-gray-900">{selectedAsset.amount}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Price per Token</p>
                    <p className="font-bold text-green-600">
                      {(parseFloat(selectedAsset.price) / Math.pow(10, 8)).toFixed(4)} ETH
                    </p>
                  </div>
                </div>
              </div>

              {/* Sell Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="sellAmount">Amount to Sell</Label>
                <Input
                  id="sellAmount"
                  type="number"
                  placeholder="Enter amount"
                  value={sellAmount}
                  onChange={(e) => setSellAmount(e.target.value)}
                  min="1"
                  max={selectedAsset.amount.toString()}
                />
                <p className="text-xs text-gray-500">
                  Maximum: {selectedAsset.amount} tokens
                </p>
              </div>

              {/* Transaction Summary with Platform Fee */}
              {sellAmount && parseInt(sellAmount) > 0 && parseInt(sellAmount) <= selectedAsset.amount && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-3">Transaction Summary</h4>
                  {(() => {
                    const amount = parseInt(sellAmount);
                    const tokenPrice = ethers.BigNumber.from(selectedAsset.price);
                    const totalValue = tokenPrice.mul(amount);
                    const platformFee = totalValue.mul(1).div(100); // 1% platform fee
                    const youReceive = totalValue; // User receives the full value
                    
                    return (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-700">Selling:</span>
                          <span className="font-medium text-blue-900">{amount} tokens</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Price per token:</span>
                          <span className="font-medium text-blue-900">
                            {parseFloat(ethers.utils.formatEther(tokenPrice)).toFixed(6)} ETH
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Total value:</span>
                          <span className="font-medium text-blue-900">
                            {parseFloat(ethers.utils.formatEther(totalValue)).toFixed(6)} ETH
                          </span>
                        </div>
                        <div className="border-t border-blue-200 pt-2">
                          <div className="flex justify-between text-red-600">
                            <span>Platform fee (1%):</span>
                            <span className="font-medium">
                              -{parseFloat(ethers.utils.formatEther(platformFee)).toFixed(6)} ETH
                            </span>
                          </div>
                          <div className="flex justify-between font-bold text-green-600 mt-1">
                            <span>You receive:</span>
                            <span>{parseFloat(ethers.utils.formatEther(youReceive)).toFixed(6)} ETH</span>
                          </div>
                        </div>
                        <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                          <p className="text-xs text-yellow-800">
                            <strong>Note:</strong> You will pay {parseFloat(ethers.utils.formatEther(platformFee)).toFixed(6)} ETH as platform fee when confirming this transaction.
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setSellModalOpen(false)}
                  disabled={sellLoading}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={sellAsset}
                  disabled={sellLoading || !sellAmount || parseInt(sellAmount) <= 0 || parseInt(sellAmount) > selectedAsset.amount}
                >
                  {sellLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Selling...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4 mr-2" />
                      Sell {sellAmount || '0'} Tokens
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
