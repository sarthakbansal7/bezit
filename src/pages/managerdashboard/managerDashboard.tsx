import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';
import { useWallet } from '../../context/WalletContext';
import { ADMIN_ABI } from '../../utils/adminABI';
import { MARKETPLACE_ABI } from '../../utils/marketplaceABI';
import { PAYMENT_SPLITTER_ABI } from '../../utils/paymentSplitterABI';
import { ADMIN_CONTRACT, TOKEN_CONTRACT, MARKETPLACE_CONTRACT, PAYMENT_SPLITTER_CONTRACT } from '../../lib/contractAddress';
import { toast } from 'sonner';
import { 
  Building2, 
  Coins, 
  TrendingUp, 
  Users, 
  Shield, 
  FileText,
  BarChart3,
  Globe,
  DollarSign,
  Activity,
  CheckCircle,
  AlertCircle,
  Plus,
  Eye,
  Download,
  Filter,
  Search,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  Bell,
  Home,
  Sun,
  Moon,
  Zap,
  Lock,
  Unlock,
  RefreshCw,
  PieChart,
  TrendingDown,
  Clock,
  MapPin,
  Camera,
  Upload,
  Calculator,
  CreditCard,
  Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';

// Types for Asset Management
interface AssignedAsset {
  tokenId: string;
  name: string;
  type: 'real-estate' | 'commodity' | 'bonds' | 'equity';
  location: string;
  totalTokens: number;
  soldTokens: number;
  currentValue: number;
  monthlyIncome: number;
  occupancyRate: number;
  lastInspection: string;
  nextPayment: string;
  status: 'active' | 'maintenance' | 'vacancy' | 'development';
  metadataURI: string;
  images: string[];
}

interface RentalSubmission {
  tokenId: string;
  assetName: string;
  amount: number; // Amount in ETH (supports decimals like 0.002)
  month: string;
  type: 'rental' | 'dividend' | 'interest';
  notes: string;
  receipts: File[];
}

interface IncomeHistory {
  id: string;
  tokenId: string;
  assetName: string;
  amount: number;
  perToken: number;
  submittedDate: string;
  distributedDate: string;
  type: string;
  status: 'pending' | 'distributed' | 'failed';
}

const ManagerDashboard: React.FC = () => {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Wallet context
  const { provider, signer, address, isConnected } = useWallet();
  
  // Authorization state
  const [isAuthorizedManager, setIsAuthorizedManager] = useState<boolean | null>(null);
  const [authCheckLoading, setAuthCheckLoading] = useState(false);
  
  // Contract state
  const [adminContract, setAdminContract] = useState<ethers.Contract | null>(null);
  const [tokenContract, setTokenContract] = useState<ethers.Contract | null>(null);
  const [marketplaceContract, setMarketplaceContract] = useState<ethers.Contract | null>(null);
  const [paymentSplitterContract, setPaymentSplitterContract] = useState<ethers.Contract | null>(null);
  
  // Manager assets state
  const [assignedTokenIds, setAssignedTokenIds] = useState<string[]>([]);
  const [assignedAssets, setAssignedAssets] = useState<AssignedAsset[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Main state
  const [selectedAsset, setSelectedAsset] = useState<AssignedAsset | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Dialog states
  const [showRentalDialog, setShowRentalDialog] = useState(false);
  const [showAssetDetails, setShowAssetDetails] = useState(false);
  const [showIncomeHistory, setShowIncomeHistory] = useState(false);
  
  // Form states
  const [rentalForm, setRentalForm] = useState<RentalSubmission>({
    tokenId: '',
    assetName: '',
    amount: 0,
    month: '',
    type: 'rental',
    notes: '',
    receipts: []
  });
  
  // Data states
  const [incomeHistory, setIncomeHistory] = useState<IncomeHistory[]>([]);
  const [totalManaged, setTotalManaged] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Check manager authorization on wallet connection
  useEffect(() => {
    const initializeContractAndCheckAuth = async () => {
      if (!isConnected || !address || !signer) {
        console.log('Wallet not connected, resetting manager state');
        setIsAuthorizedManager(null);
        setAssignedAssets([]);
        setAssignedTokenIds([]);
        return;
      }

      setAuthCheckLoading(true);
      console.log('🔍 Starting contract initialization and manager authorization check for:', address);
      
      try {
        await initializeAdminContract();
      } catch (error) {
        console.error('❌ Error during initialization:', error);
        toast.error('Failed to initialize contracts');
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
        console.log('❌ Wallet not connected or signer not available');
        return;
      }

      console.log('🔄 Initializing admin contract...');
      console.log('Contract address:', ADMIN_CONTRACT);
      
      // Create contract instance
      const contract = new ethers.Contract(ADMIN_CONTRACT, ADMIN_ABI, signer);
      
      // Verify contract exists
      try {
        const code = await signer.provider.getCode(ADMIN_CONTRACT);
        if (code === '0x') {
          throw new Error('Contract not deployed at this address');
        }
      } catch (error) {
        console.error('❌ Contract verification failed:', error);
        throw error;
      }
      
      setAdminContract(contract);
      console.log('✅ Admin contract initialized successfully');
      
      // Initialize token contract for metadata fetching
      const TOKEN_ABI = [
        "function uri(uint256 tokenId) external view returns (string memory)",
        "function tokenMetadata(uint256 tokenId) external view returns (string memory)",
        "function tokenPrice(uint256 tokenId) external view returns (uint256)",
        "function tokenIssuer(uint256 tokenId) external view returns (address)"
      ];
      
      try {
        const tokenContractInstance = new ethers.Contract(TOKEN_CONTRACT, TOKEN_ABI, signer);
        setTokenContract(tokenContractInstance);
        console.log('✅ Token contract initialized successfully');
      } catch (tokenError) {
        console.warn('⚠️ Token contract initialization failed:', tokenError);
      }
      
      // Initialize marketplace contract
      try {
        const marketplaceContractInstance = new ethers.Contract(MARKETPLACE_CONTRACT, MARKETPLACE_ABI, signer);
        setMarketplaceContract(marketplaceContractInstance);
        console.log('✅ Marketplace contract initialized successfully');
      } catch (marketplaceError) {
        console.warn('⚠️ Marketplace contract initialization failed:', marketplaceError);
      }
      
      // Initialize payment splitter contract
      try {
        const paymentSplitterContractInstance = new ethers.Contract(PAYMENT_SPLITTER_CONTRACT, PAYMENT_SPLITTER_ABI, signer);
        setPaymentSplitterContract(paymentSplitterContractInstance);
        console.log('✅ Payment splitter contract initialized successfully');
      } catch (paymentError) {
        console.warn('⚠️ Payment splitter contract initialization failed:', paymentError);
      }
      
      // Check manager authorization and fetch assigned assets
      await checkManagerAuthAndFetchAssets(contract);
      
    } catch (error) {
      console.error('❌ Error initializing admin contract:', error);
      toast.error('Failed to initialize admin contract');
    }
  };

  // Check if user is authorized manager and fetch assigned assets
  const checkManagerAuthAndFetchAssets = async (contract?: ethers.Contract) => {
    const contractToUse = contract || adminContract;
    
    if (!contractToUse || !address) {
      console.log('❌ Admin contract not initialized or address not available');
      return;
    }
    
    try {
      console.log('🔄 Checking manager authorization for:', address);
      
      // Call getAllManagers from admin contract
      let managersData;
      try {
        managersData = await contractToUse.getAllManagers();
        console.log('📋 All managers from contract:', managersData);
      } catch (error) {
        console.error('❌ Error calling getAllManagers:', error);
        toast.error('Failed to fetch managers from contract');
        setIsAuthorizedManager(false);
        return;
      }

      // Check if connected wallet is in managers list
      const managerAddresses = managersData || [];
      const isManager = managerAddresses.some((managerAddr: string) => 
        managerAddr.toLowerCase() === address.toLowerCase()
      );
      
      setIsAuthorizedManager(isManager);
      
      if (isManager) {
        console.log('✅ User is authorized manager');
        toast.success('Manager authorization confirmed!');
        
        // Fetch assigned tokens for this manager
        await fetchAssignedAssets(contractToUse);
      } else {
        console.log('❌ User is not an authorized manager');
        toast.error('You are not authorized as a manager');
        setAssignedAssets([]);
        setAssignedTokenIds([]);
      }

      console.log(`🎯 Manager check completed. Authorized: ${isManager}`);
      console.log(`📊 Total Managers: ${managerAddresses.length}`);
      
    } catch (error: any) {
      console.error('❌ Error checking manager authorization:', error);
      setIsAuthorizedManager(false);
      toast.error('Failed to check manager authorization');
    }
  };

  // Fetch assigned assets for the manager
  const fetchAssignedAssets = async (contract?: ethers.Contract) => {
    const contractToUse = contract || adminContract;
    
    if (!contractToUse || !address) {
      console.log('❌ Contract not initialized or address not available');
      return;
    }
    
    try {
      setLoading(true);
      console.log('🔄 Fetching assigned assets for manager:', address);
      
      // Get manager's assigned token IDs
      const assignedTokenIds = await contractToUse.getManagerTokens(address);
      console.log('📋 Assigned token IDs:', assignedTokenIds.map((id: ethers.BigNumber) => id.toString()));
      
      const tokenIdStrings = assignedTokenIds.map((id: ethers.BigNumber) => id.toString());
      setAssignedTokenIds(tokenIdStrings);
      
      if (tokenIdStrings.length === 0) {
        console.log('ℹ️ No assets assigned to this manager');
        setAssignedAssets([]);
        return;
      }
      
      // Fetch metadata for each assigned token
      const assetsWithMetadata: AssignedAsset[] = [];
      
      for (const tokenId of tokenIdStrings) {
        try {
          console.log(`🔄 Processing metadata for token ${tokenId}...`);
          
          // Get basic token info
          let metadata: any = {};
          let price = ethers.BigNumber.from(0);
          let issuer = '';
          
          if (tokenContract) {
            try {
              const metadataURI = await tokenContract.tokenMetadata(tokenId);
              price = await tokenContract.tokenPrice(tokenId);
              issuer = await tokenContract.tokenIssuer(tokenId);
              
              // Parse metadata if it's IPFS URI
              if (metadataURI.startsWith('ipfs://')) {
                const ipfsHash = metadataURI.replace('ipfs://', '');
                const metadataResponse = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
                if (metadataResponse.ok) {
                  metadata = await metadataResponse.json();
                }
              }
            } catch (tokenError) {
              console.warn(`⚠️ Could not fetch metadata for token ${tokenId}:`, tokenError);
            }
          }
          
          // Fetch marketplace data for this token
          let totalTokens = 1000; // Default fallback
          let soldTokens = 0; // Default fallback
          
          if (marketplaceContract) {
            try {
              // Get total tokens listed for this token ID
              const totalListed = await marketplaceContract.totalTokensListed(tokenId);
              totalTokens = parseInt(totalListed.toString());
              
              // For soldTokens, we need to calculate how many have been sold
              // This would be totalTokens - availableTokens, but we'll use totalListed as available for now
              soldTokens = totalTokens; // All listed tokens are considered "sold" to the marketplace
              
              console.log(`📊 Token ${tokenId} marketplace data: ${soldTokens}/${totalTokens} listed`);
            } catch (marketplaceError) {
              console.warn(`⚠️ Could not fetch marketplace data for token ${tokenId}:`, marketplaceError);
            }
          }
          
          // Create asset object with available data
          const asset: AssignedAsset = {
            tokenId: tokenId,
            name: metadata?.name || `Asset #${tokenId}`,
            type: getAssetTypeFromMetadata(metadata) as any,
            location: getLocationFromMetadata(metadata),
            totalTokens: totalTokens,
            soldTokens: soldTokens,
            currentValue: parseFloat(ethers.utils.formatEther(price)),
            monthlyIncome: 0, // Calculate based on historical data
            occupancyRate: 85, // This would come from manager reports
            lastInspection: '2024-03-01', // This would come from manager records
            nextPayment: '2024-04-01', // Calculate based on payment schedule
            status: 'active' as any,
            metadataURI: metadata ? `ipfs://token${tokenId}` : '',
            images: metadata?.images || []
          };
          
          assetsWithMetadata.push(asset);
          console.log(`✅ Processed asset ${tokenId}:`, asset.name);
          
        } catch (assetError) {
          console.error(`❌ Error processing asset ${tokenId}:`, assetError);
          
          // Add basic asset info even if metadata fetch fails
          assetsWithMetadata.push({
            tokenId: tokenId,
            name: `Asset #${tokenId}`,
            type: 'real-estate',
            location: 'Unknown',
            totalTokens: 1000,
            soldTokens: 750,
            currentValue: 0,
            monthlyIncome: 0,
            occupancyRate: 0,
            lastInspection: '2024-03-01',
            nextPayment: '2024-04-01',
            status: 'active',
            metadataURI: '',
            images: []
          });
        }
      }
      
      setAssignedAssets(assetsWithMetadata);
      console.log(`✅ Loaded ${assetsWithMetadata.length} assigned assets`);
      
      // Update metrics
      setTotalManaged(assetsWithMetadata.length);
      
      // Calculate total income from assigned assets
      const totalIncomeAmount = assetsWithMetadata.reduce((sum, asset) => sum + asset.monthlyIncome, 0);
      setTotalIncome(totalIncomeAmount);
      
    } catch (error: any) {
      console.error('❌ Error fetching assigned assets:', error);
      toast.error(`Failed to load assigned assets: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for metadata parsing
  const getAssetTypeFromMetadata = (metadata: any): string => {
    if (!metadata?.attributes) return 'real-estate';
    
    const assetTypeAttr = metadata.attributes.find((attr: any) => 
      attr.trait_type === 'Asset Type' || attr.trait_type === 'asset_type'
    );
    
    if (assetTypeAttr?.value) {
      const value = assetTypeAttr.value.toLowerCase();
      if (value.includes('real') || value.includes('estate')) return 'real-estate';
      if (value.includes('commodity') || value.includes('gold')) return 'commodity';
      if (value.includes('bond')) return 'bonds';
      if (value.includes('stock') || value.includes('equity')) return 'equity';
    }
    
    return 'real-estate';
  };

  const getLocationFromMetadata = (metadata: any): string => {
    if (!metadata?.assetDetails) return 'Unknown Location';
    
    const details = metadata.assetDetails;
    if (details.location) return details.location;
    if (details.city && details.state) return `${details.city}, ${details.state}`;
    if (details.address) return details.address;
    
    return 'Unknown Location';
  };

  // Connect wallet function (for legacy compatibility)
  const connectWallet = async () => {
    try {
      if (!isConnected) {
        toast.error('Please connect your wallet first');
        return;
      }
      
      toast.success('Wallet connected successfully!');
      
    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      toast.error(`Failed to connect wallet: ${error.message || 'Unknown error'}`);
    }
  };

  // Legacy functions for backwards compatibility
  const checkWalletConnection = async () => {
    // This is now handled by the useEffect with wallet context
    console.log('checkWalletConnection called - using wallet context instead');
  };

  const checkManagerAuthorization = async (address: string) => {
    // This is now handled by checkManagerAuthAndFetchAssets
    console.log('checkManagerAuthorization called - using contract integration instead');
  };

  const fetchManagerAssets = async (managerAddress: string) => {
    // This is now handled by fetchAssignedAssets
    console.log('fetchManagerAssets called - using contract integration instead');
    if (isAuthorizedManager) {
      await fetchAssignedAssets();
    }
  };

  // Load demo data function (for fallback)
  const loadDemoData = () => {
    const demoAssets: AssignedAsset[] = [
      {
        tokenId: "1001",
        name: "Manhattan Office Complex",
        type: "real-estate",
        location: "New York, NY",
        totalTokens: 1000,
        soldTokens: 750,
        currentValue: 2500000,
        monthlyIncome: 18500,
        occupancyRate: 94,
        lastInspection: "2024-11-15",
        nextPayment: "2025-01-01",
        status: "active",
        metadataURI: "ipfs://QmExample1",
        images: ["/api/placeholder/400/300"]
      },
      {
        tokenId: "1002", 
        name: "Gold Reserve Portfolio",
        type: "commodity",
        location: "Swiss Vault, Geneva",
        totalTokens: 500,
        soldTokens: 400,
        currentValue: 1800000,
        monthlyIncome: 8200,
        occupancyRate: 100,
        lastInspection: "2024-12-01",
        nextPayment: "2025-01-05",
        status: "active",
        metadataURI: "ipfs://QmExample2",
        images: ["/api/placeholder/400/300"]
      },
      {
        tokenId: "1003",
        name: "Miami Residential Complex",
        type: "real-estate", 
        location: "Miami, FL",
        totalTokens: 800,
        soldTokens: 600,
        currentValue: 1200000,
        monthlyIncome: 12000,
        occupancyRate: 88,
        lastInspection: "2024-10-20",
        nextPayment: "2025-01-01",
        status: "maintenance",
        metadataURI: "ipfs://QmExample3",
        images: ["/api/placeholder/400/300"]
      }
    ];
    
    setAssignedAssets(demoAssets);
    setTotalManaged(demoAssets.length);
    setTotalIncome(demoAssets.reduce((sum, asset) => sum + asset.monthlyIncome, 0));
    
    // Demo income history
    const demoHistory: IncomeHistory[] = [
      {
        id: "inc_001",
        tokenId: "1001",
        assetName: "Manhattan Office Complex",
        amount: 18500,
        perToken: 18.5,
        submittedDate: "2024-12-01",
        distributedDate: "2024-12-02",
        type: "rental",
        status: "distributed"
      },
      {
        id: "inc_002",
        tokenId: "1002",
        assetName: "Gold Reserve Portfolio", 
        amount: 8200,
        perToken: 16.4,
        submittedDate: "2024-12-01",
        distributedDate: "2024-12-02",
        type: "dividend",
        status: "distributed"
      }
    ];
    
    setIncomeHistory(demoHistory);
  };

  const handleRentalSubmission = async () => {
    if (!rentalForm.tokenId || !rentalForm.amount || !rentalForm.month) {
      toast.error('Please fill all required fields');
      return;
    }

    if (!paymentSplitterContract || !signer) {
      toast.error('Payment splitter contract not initialized or wallet not connected');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('🔄 Submitting rental income to payment splitter...');
      console.log('Token ID:', rentalForm.tokenId);
      console.log('Amount (ETH):', rentalForm.amount);
      
      // Convert ETH amount to wei for the contract call
      const amountInWei = ethers.utils.parseEther(rentalForm.amount.toString());
      console.log('Amount in Wei:', amountInWei.toString());
      
      // Call submitRental on PaymentSplitter contract with the ETH amount
      const tx = await paymentSplitterContract.submitRental(rentalForm.tokenId, {
        value: amountInWei,
        gasLimit: 500000 // Set a reasonable gas limit
      });
      
      console.log('📤 Transaction sent:', tx.hash);
      toast.info('Transaction submitted. Waiting for confirmation...');
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', receipt.transactionHash);
      
      // Create income history record
      const newIncome: IncomeHistory = {
        id: `inc_${Date.now()}`,
        tokenId: rentalForm.tokenId,
        assetName: rentalForm.assetName,
        amount: rentalForm.amount,
        perToken: 0, // Will be calculated by the contract
        submittedDate: new Date().toISOString().split('T')[0],
        distributedDate: new Date().toISOString().split('T')[0], // Distributed immediately
        type: rentalForm.type,
        status: 'distributed'
      };
      
      setIncomeHistory(prev => [newIncome, ...prev]);
      setShowRentalDialog(false);
      setRentalForm({
        tokenId: '',
        assetName: '',
        amount: 0,
        month: '',
        type: 'rental',
        notes: '',
        receipts: []
      });
      
      toast.success(`Rental income of ${rentalForm.amount} ETH distributed successfully!`);
      
    } catch (error: any) {
      console.error('❌ Error submitting rental income:', error);
      
      let errorMessage = 'Failed to submit rental income';
      if (error.code === 4001) {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.reason) {
        errorMessage = `Transaction failed: ${error.reason}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'maintenance': return 'bg-yellow-500';
      case 'vacancy': return 'bg-red-500';
      case 'development': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'real-estate': return Building2;
      case 'commodity': return Coins;
      case 'bonds': return FileText;
      case 'equity': return TrendingUp;
      default: return Building2;
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`${isDarkMode ? 'bg-gray-900/50 backdrop-blur-xl border-gray-800' : 'bg-white/80 backdrop-blur-xl border-gray-200'} border-b sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Asset Manager</h1>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Portfolio Management Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
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
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 bg-green-500/10 px-3 py-2 rounded-lg border border-green-500/20">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-green-400 text-sm font-medium">
                      {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Unknown'}
                    </span>
                  </div>
                  
                  {isAuthorizedManager ? (
                    <div className="flex items-center space-x-2 bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400 text-sm font-medium">Authorized Manager</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span className="text-red-400 text-sm font-medium">Not Authorized</span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  <span className="text-emerald-400 text-sm font-medium">Active Manager</span>
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              
              <Button variant="ghost" size="icon" className={`${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>
                <Bell className="w-4 h-4" />
              </Button>
              
              <Button asChild variant="ghost" className={`${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>
                <Link to="/" className="flex items-center space-x-2">
                  <Home className="w-4 h-4" />
                  <span>Home</span>
                </Link>
              </Button>
              
              <Avatar className="h-8 w-8">
                <AvatarFallback>AM</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!isConnected ? (
          /* Wallet Connection Required */
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className={`max-w-md w-full ${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Connect Your Wallet
                </h2>
                <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Connect your wallet to access the Asset Manager Dashboard and manage your assigned properties.
                </p>
                <Button 
                  onClick={connectWallet}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  {loading ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : authCheckLoading ? (
          /* Authorization Check Loading */
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className={`max-w-md w-full ${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
                <h2 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Checking Authorization
                </h2>
                <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Verifying manager permissions...
                </p>
                <p className={`text-xs mb-6 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Connected: {address ? `${address.slice(0, 10)}...${address.slice(-8)}` : 'Unknown'}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : isAuthorizedManager === false ? (
          /* Not Authorized */
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className={`max-w-md w-full ${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-red-500" />
                </div>
                <h2 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Access Restricted
                </h2>
                <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Your wallet address is not authorized to access the Asset Manager Dashboard.
                </p>
                <p className={`text-xs mb-6 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Connected: {address ? `${address.slice(0, 10)}...${address.slice(-8)}` : 'Unknown'}
                </p>
                <Button 
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                  className="w-full"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Return to Home
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Authorized Manager Dashboard */
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full grid-cols-4 ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="assets">My Assets</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className={`${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Assets Managed</p>
                      <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {isConnected && isAuthorizedManager ? totalManaged : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-500/10 rounded-lg">
                      <Building2 className="w-6 h-6 text-blue-500" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-500">
                      {isConnected ? 'Real-time data' : 'Connect wallet to view'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className={`${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Monthly Income</p>
                      <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {isConnected && isAuthorizedManager ? `$${totalIncome.toLocaleString()}` : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-500/10 rounded-lg">
                      <DollarSign className="w-6 h-6 text-emerald-500" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-500">
                      {isConnected ? 'From assigned assets' : 'Connect wallet to view'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className={`${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Avg Occupancy</p>
                      <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {isConnected && isAuthorizedManager && assignedAssets.length > 0 
                          ? `${Math.round(assignedAssets.reduce((sum, asset) => sum + asset.occupancyRate, 0) / assignedAssets.length)}%`
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <div className="p-3 bg-purple-500/10 rounded-lg">
                      <PieChart className="w-6 h-6 text-purple-500" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-500">+3% from last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card className={`${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Value</p>
                      <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {isConnected && isAuthorizedManager 
                          ? `$${(assignedAssets.reduce((sum, asset) => sum + asset.currentValue, 0) / 1000000).toFixed(1)}M`
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <div className="p-3 bg-orange-500/10 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-orange-500" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-500">+15.2% from last month</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className={`${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
              <CardHeader>
                <CardTitle className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button 
                    onClick={() => setShowRentalDialog(true)}
                    className="h-24 flex-col space-y-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <DollarSign className="w-6 h-6" />
                    <span className="text-sm font-medium">Submit Income</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className={`h-24 flex-col space-y-2 ${isDarkMode ? 'border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-800 hover:text-white' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                    onClick={() => setShowIncomeHistory(true)}
                  >
                    <BarChart3 className="w-6 h-6" />
                    <span className="text-sm font-medium">View History</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className={`h-24 flex-col space-y-2 ${isDarkMode ? 'border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-800 hover:text-white' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                  >
                    <FileText className="w-6 h-6" />
                    <span className="text-sm font-medium">Generate Report</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className={`h-24 flex-col space-y-2 ${isDarkMode ? 'border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-800 hover:text-white' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                  >
                    <Calendar className="w-6 h-6" />
                    <span className="text-sm font-medium">Schedule Inspection</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className={`${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
              <CardHeader>
                <CardTitle className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {incomeHistory.slice(0, 3).map((income) => (
                    <div key={income.id} className={`flex items-center justify-between p-4 rounded-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${income.status === 'distributed' ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                        <div>
                          <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {income.type.charAt(0).toUpperCase() + income.type.slice(1)} - {income.assetName}
                          </p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            ${income.amount.toLocaleString()} distributed
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={income.status === 'distributed' ? 'default' : 'secondary'}>
                          {income.status}
                        </Badge>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                          {income.submittedDate}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assets Tab */}
          <TabsContent value="assets" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>My Assigned Assets</h2>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => isConnected && fetchManagerAssets(address || '')}
                  disabled={loading || !isConnected}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Loading...' : 'Refresh'}
                </Button>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assignedAssets.length === 0 ? (
                <div className="col-span-full">
                  <Card className={`${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <CardContent className="p-12 text-center">
                      <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Building2 className="w-8 h-8 text-blue-500" />
                      </div>
                      <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        No Assets Assigned
                      </h3>
                      <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {isConnected ? 
                          'You currently have no assets assigned to manage. Contact the admin to get assets assigned.' :
                          'Connect your wallet to view assigned assets.'
                        }
                      </p>
                      {isConnected && (
                        <Button 
                          onClick={() => fetchManagerAssets(address || '')}
                          disabled={loading}
                          variant="outline"
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                          {loading ? 'Checking...' : 'Check Again'}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                assignedAssets.map((asset) => {
                const IconComponent = getTypeIcon(asset.type);
                return (
                  <Card key={asset.tokenId} className={`${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'} cursor-pointer hover:shadow-lg transition-shadow`}
                    onClick={() => {
                      setSelectedAsset(asset);
                      setShowAssetDetails(true);
                    }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-500/10 rounded-lg">
                            <IconComponent className="w-5 h-5 text-blue-500" />
                          </div>
                          <div>
                            <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{asset.name}</h3>
                            <p className={`text-sm flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              <MapPin className="w-3 h-3 mr-1" />
                              {asset.location}
                            </p>
                          </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(asset.status)}`}></div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tokens Sold</span>
                          <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {asset.soldTokens}/{asset.totalTokens}
                          </span>
                        </div>
                        
                        <Progress 
                          value={(asset.soldTokens / asset.totalTokens) * 100} 
                          className="h-2"
                        />

                        <div className="flex justify-between">
                          <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Monthly Income</span>
                          <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            ${asset.monthlyIncome.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Occupancy</span>
                          <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {asset.occupancyRate}%
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Next Payment</span>
                          <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {asset.nextPayment}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRentalForm(prev => ({
                              ...prev,
                              tokenId: asset.tokenId,
                              assetName: asset.name
                            }));
                            setShowRentalDialog(true);
                          }}
                        >
                          Submit Income
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
              )}
            </div>
          </TabsContent>

          {/* Income Tab */}
          <TabsContent value="income" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Income Management</h2>
              <Button onClick={() => setShowRentalDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Submit New Income
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card className={`${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>This Month</p>
                      <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>$38,700</p>
                    </div>
                    <div className="p-3 bg-green-500/10 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Pending</p>
                      <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>$0</p>
                    </div>
                    <div className="p-3 bg-yellow-500/10 rounded-lg">
                      <Clock className="w-6 h-6 text-yellow-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>YTD Total</p>
                      <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>$428,400</p>
                    </div>
                    <div className="p-3 bg-blue-500/10 rounded-lg">
                      <BarChart3 className="w-6 h-6 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className={`${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
              <CardHeader>
                <CardTitle className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Income History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {incomeHistory.map((income) => (
                    <div key={income.id} className={`flex items-center justify-between p-4 rounded-lg border ${isDarkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          income.type === 'rental' ? 'bg-blue-500/10' : 
                          income.type === 'dividend' ? 'bg-emerald-500/10' : 'bg-purple-500/10'
                        }`}>
                          {income.type === 'rental' ? <Building2 className="w-5 h-5 text-blue-500" /> :
                           income.type === 'dividend' ? <Coins className="w-5 h-5 text-emerald-500" /> :
                           <FileText className="w-5 h-5 text-purple-500" />}
                        </div>
                        <div>
                          <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {income.assetName}
                          </p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {income.type.charAt(0).toUpperCase() + income.type.slice(1)} • Token ID: {income.tokenId}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          ${income.amount.toLocaleString()}
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          ${income.perToken}/token
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-1">
                        <Badge variant={income.status === 'distributed' ? 'default' : income.status === 'pending' ? 'secondary' : 'destructive'}>
                          {income.status}
                        </Badge>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {income.submittedDate}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Reports & Analytics</h2>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Reports
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className={`${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
                <CardHeader>
                  <CardTitle className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Performance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Assets Under Management</span>
                      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>3</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Combined Asset Value</span>
                      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>$5.5M</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Average Monthly Income</span>
                      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>$38.7K</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Portfolio Yield</span>
                      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>8.4%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
                <CardHeader>
                  <CardTitle className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Quick Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="w-4 h-4 mr-2" />
                      Monthly Income Report
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Asset Performance Analysis
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Occupancy Trends
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <PieChart className="w-4 h-4 mr-2" />
                      Portfolio Distribution
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        )}
      </main>

      {/* Submit Rental Income Dialog */}
      <Dialog open={showRentalDialog} onOpenChange={setShowRentalDialog}>
        <DialogContent className={`sm:max-w-lg ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
          <DialogHeader>
            <DialogTitle className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Submit Income</DialogTitle>
            <DialogDescription className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Submit rental income or dividends for distribution to token holders.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="asset-select" className={`${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Select Asset</Label>
              <Select 
                value={rentalForm.tokenId} 
                onValueChange={(value) => {
                  const asset = assignedAssets.find(a => a.tokenId === value);
                  setRentalForm(prev => ({
                    ...prev,
                    tokenId: value,
                    assetName: asset?.name || ''
                  }));
                }}
              >
                <SelectTrigger className={`${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
                  <SelectValue placeholder="Choose an asset" />
                </SelectTrigger>
                <SelectContent>
                  {assignedAssets.map(asset => (
                    <SelectItem key={asset.tokenId} value={asset.tokenId}>
                      {asset.name} (ID: {asset.tokenId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="income-type" className={`${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Income Type</Label>
              <Select 
                value={rentalForm.type} 
                onValueChange={(value: 'rental' | 'dividend' | 'interest') => 
                  setRentalForm(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger className={`${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rental">Rental Income</SelectItem>
                  <SelectItem value="dividend">Dividend</SelectItem>
                  <SelectItem value="interest">Interest Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount" className={`${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Amount (ETH)</Label>
              <Input
                id="amount"
                type="number"
                step="0.001"
                min="0"
                placeholder="Enter amount in ETH (e.g., 0.002)"
                value={rentalForm.amount || ''}
                onChange={(e) => setRentalForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                className={`${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
              />
            </div>

            <div>
              <Label htmlFor="month" className={`${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Period</Label>
              <Input
                id="month"
                type="month"
                value={rentalForm.month}
                onChange={(e) => setRentalForm(prev => ({ ...prev, month: e.target.value }))}
                className={`${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
              />
            </div>

            <div>
              <Label htmlFor="notes" className={`${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes or details"
                value={rentalForm.notes}
                onChange={(e) => setRentalForm(prev => ({ ...prev, notes: e.target.value }))}
                className={`${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRentalDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRentalSubmission} disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Income'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Asset Details Dialog */}
      <Dialog open={showAssetDetails} onOpenChange={setShowAssetDetails}>
        <DialogContent className={`sm:max-w-2xl ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
          {selectedAsset && (
            <>
              <DialogHeader>
                <DialogTitle className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedAsset.name}</DialogTitle>
                <DialogDescription className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Asset Details and Management
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Token ID</p>
                    <p className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedAsset.tokenId}</p>
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Location</p>
                    <p className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedAsset.location}</p>
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Current Value</p>
                    <p className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>${selectedAsset.currentValue.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Monthly Income</p>
                    <p className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>${selectedAsset.monthlyIncome.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tokens</p>
                    <p className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {selectedAsset.soldTokens} / {selectedAsset.totalTokens} sold
                    </p>
                    <Progress value={(selectedAsset.soldTokens / selectedAsset.totalTokens) * 100} className="mt-2" />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Occupancy Rate</p>
                    <p className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedAsset.occupancyRate}%</p>
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Last Inspection</p>
                    <p className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedAsset.lastInspection}</p>
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Next Payment</p>
                    <p className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedAsset.nextPayment}</p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAssetDetails(false)}>
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    setRentalForm(prev => ({
                      ...prev,
                      tokenId: selectedAsset.tokenId,
                      assetName: selectedAsset.name
                    }));
                    setShowAssetDetails(false);
                    setShowRentalDialog(true);
                  }}
                >
                  Submit Income
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagerDashboard;
