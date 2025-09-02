import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { toast } from 'react-hot-toast';
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
  
  // Wallet and asset states
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
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

  // Connect wallet function (mock version)
  const connectWallet = async () => {
    try {
      setLoading(true);
      
      // Simulate wallet connection delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock wallet address
      const mockAddress = "0x1234567890123456789012345678901234567890";
      
      setWalletAddress(mockAddress);
      setWalletConnected(true);
      toast.success('Mock wallet connected successfully!');
      
      // Load demo assets
      await fetchUserAssets(mockAddress);
      
    } catch (error: any) {
      console.error('Mock wallet connection failed:', error);
      toast.error(`Failed to connect wallet: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user assets (mock version with demo data)
  const fetchUserAssets = async (userAddress: string) => {
    try {
      setLoading(true);
      
      console.log('🔄 Loading demo assets for:', userAddress);
      
      // Mock user assets data
      const mockAssets: UserAsset[] = [
        {
          tokenId: "1001",
          name: "Manhattan Luxury Apartment",
          description: "Premium residential complex in the heart of Manhattan with high rental yields.",
          image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop",
          price: "125000000000000000", // 0.125 ETH in Wei
          amount: 150, // User owns 150 tokens
          seller: "0x1234567890123456789012345678901234567890",
          metadataURI: "ipfs://QmExample1",
          metadata: {
            name: "Manhattan Luxury Apartment",
            description: "Premium residential complex in the heart of Manhattan with high rental yields."
          },
          attributes: [
            { trait_type: "Asset Type", value: "Real Estate" },
            { trait_type: "Location", value: "New York, NY" },
            { trait_type: "Size", value: "2500 sq ft" },
            { trait_type: "Bedrooms", value: "3" }
          ],
          type: "Real Estate"
        },
        {
          tokenId: "1002",
          name: "Tech Startup Invoice #1847",
          description: "High-grade invoice financing opportunity from established tech company.",
          image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop",
          price: "85000000000000000", // 0.085 ETH in Wei
          amount: 75, // User owns 75 tokens
          seller: "0x2345678901234567890123456789012345678901",
          metadataURI: "ipfs://QmExample2",
          metadata: {
            name: "Tech Startup Invoice #1847",
            description: "High-grade invoice financing opportunity from established tech company."
          },
          attributes: [
            { trait_type: "Asset Type", value: "Invoice" },
            { trait_type: "Issuer", value: "TechCorp Inc." },
            { trait_type: "Due Date", value: "2025-01-15" },
            { trait_type: "Risk Rating", value: "A+" }
          ],
          type: "Invoice"
        },
        {
          tokenId: "1003",
          name: "Gold Reserve Portfolio",
          description: "Physical gold bullion stored in Swiss vaults with full insurance.",
          image: "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=800&h=600&fit=crop",
          price: "180000000000000000", // 0.18 ETH in Wei
          amount: 200, // User owns 200 tokens
          seller: "0x3456789012345678901234567890123456789012",
          metadataURI: "ipfs://QmExample3",
          metadata: {
            name: "Gold Reserve Portfolio",
            description: "Physical gold bullion stored in Swiss vaults with full insurance."
          },
          attributes: [
            { trait_type: "Asset Type", value: "Commodity" },
            { trait_type: "Weight", value: "100 oz" },
            { trait_type: "Purity", value: "99.99%" },
            { trait_type: "Storage", value: "Swiss Vault" }
          ],
          type: "Commodity"
        }
      ];

      setUserAssets(mockAssets);
      console.log('✅ Demo assets loaded:', mockAssets.length);
      
      // Calculate portfolio data
      calculatePortfolioData(mockAssets);
      
      toast.success(`Loaded ${mockAssets.length} assets from your portfolio`);
    } catch (error) {
      console.error('❌ Failed to load demo assets:', error);
      setUserAssets([]);
      calculatePortfolioData([]);
      toast.error('Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate portfolio analytics
  const calculatePortfolioData = (assets: UserAsset[]) => {
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
    // Price is in tinybar (8 decimals), convert to HBAR by dividing by 10^8
    const totalValueHBAR = assets.reduce((sum, asset) => {
      const pricePerTokenHBAR = parseFloat(asset.price) / Math.pow(10, 8); // Convert tinybar to HBAR (8 decimals)
      const assetTotalValue = pricePerTokenHBAR * asset.amount;
      console.log(`Asset ${asset.tokenId}: ${asset.amount} tokens × ${pricePerTokenHBAR.toFixed(6)} HBAR = ${assetTotalValue.toFixed(6)} HBAR`);
      return sum + assetTotalValue;
    }, 0);

    console.log(`Total portfolio value: ${totalValueHBAR.toFixed(6)} HBAR`);

    // Use total value as current investment (real portfolio value)
    const totalInvestment = totalValueHBAR;
    const currentValue = totalValueHBAR;
    
    // For now, assume no gains/losses (can be updated later with historical data)
    const totalReturn = 0;
    const returnPercentage = 0;
    
    // Monthly income = 10% of total investment per year / 12 months
    const monthlyIncome = (totalInvestment * 0.10) / 12;

    console.log(`Monthly income calculation: (${totalInvestment.toFixed(6)} HBAR × 0.10) / 12 = ${monthlyIncome.toFixed(6)} HBAR`);

    setPortfolioData({
      totalInvestment,
      currentValue,
      totalReturn,
      returnPercentage,
      monthlyIncome,
      totalAssets: assets.length,
      activeInvestments: assets.filter(asset => parseFloat(asset.price) > 0).length
    });
  };

  // Sell asset function
  const sellAsset = async () => {
    if (!selectedAsset || !sellAmount || !walletConnected) {
      toast.error('Please enter a valid amount');
      return;
    }

    const amount = parseInt(sellAmount);
    if (amount <= 0 || amount > selectedAsset.amount) {
      toast.error(`Amount must be between 1 and ${selectedAsset.amount}`);
      return;
    }

    try {
      setSellLoading(true);
      
      console.log(`🔄 Mock selling ${amount} tokens of asset ${selectedAsset.tokenId}`);
      
      // Simulate transaction delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Calculate ETH/token value received (mock calculation)
      const pricePerToken = parseFloat(selectedAsset.price) / Math.pow(10, 18); // Convert from Wei
      const totalTokenValue = pricePerToken * amount;
      
      toast.success(`Successfully sold ${amount} tokens for ${totalTokenValue.toFixed(4)} ETH!`);
      
      // Close modal and reset
      setSellModalOpen(false);
      setSelectedAsset(null);
      setSellAmount('');
      
      // Refresh user assets to show updated portfolio
      await fetchUserAssets(walletAddress);
      
    } catch (error: any) {
      console.error('❌ Failed to sell asset:', error);
      toast.error(`Failed to sell asset: ${error.message || 'Unknown error'}`);
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

  // Check wallet connection on mount
  useEffect(() => {
    const checkWalletConnection = async () => {
      // Mock wallet connection check
      try {
        // Simulate checking for existing wallet connection
        if (window.ethereum) {
          // Use demo wallet address
          const demoAddress = "0x742D35Cc6635Cf532793FAa14d4A6ce8D8c5D93e";
          setWalletAddress(demoAddress);
          setWalletConnected(true);
          await fetchUserAssets(demoAddress);
        } else {
          console.log('No wallet provider found');
        }
      } catch (error) {
        console.log('Mock wallet connection failed');
      }
    };

    checkWalletConnection();
  }, []);

  // Simple chart placeholder component matching marketplace theme
  const SimpleChart: React.FC<{ type: 'line' | 'doughnut' }> = ({ type }) => (
    <div className="h-full w-full bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center">
      <div className="text-center">
        {type === 'line' ? (
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        ) : (
          <PieChart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        )}
        <p className="text-gray-600 font-medium">
          {type === 'line' ? 'Portfolio Growth Chart' : 'Asset Allocation Chart'}
        </p>
        <p className="text-gray-400 text-sm mt-1">Chart data coming soon</p>
      </div>
    </div>
  );

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-xs md:text-sm font-medium text-gray-600 mb-2">TOTAL INVESTMENT</p>
                      <div className="flex items-center space-x-2 mb-2">
                        <p className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-900">
                          {balanceVisible ? `${portfolioData.totalInvestment.toFixed(4)} HBAR` : '••••••'}
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
                        {walletConnected ? '+2.4% from last month' : 'Connect wallet to view'}
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
                      <p className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-900 mb-2">
                        {balanceVisible ? `${portfolioData.currentValue.toFixed(4)} HBAR` : '••••••'}
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
                        <p className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-900">
                          {balanceVisible ? `${portfolioData.totalReturn.toFixed(4)} HBAR` : '••••••'}
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
                      <p className="text-xs md:text-sm font-medium text-gray-600 mb-2">MONTHLY INCOME</p>
                      <p className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-900 mb-2">
                        {balanceVisible ? `${portfolioData.monthlyIncome.toFixed(4)} HBAR` : '••••••'}
                      </p>
                      <p className="text-green-600 text-xs md:text-sm">15.6% yield annually</p>
                    </div>
                    <div className="p-1.5 md:p-2 bg-gray-100 rounded-lg flex-shrink-0">
                      <DollarSign className="w-4 md:w-5 h-4 md:h-5 text-gray-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-lg md:text-xl font-bold text-gray-900">Portfolio Performance</span>
                      <p className="text-gray-600 text-sm">6-month growth trajectory</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Live</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 md:h-80">
                    <SimpleChart type="line" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle>
                    <span className="text-lg md:text-xl font-bold text-gray-900">Asset Allocation</span>
                    <p className="text-gray-600 text-sm">Portfolio distribution</p>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 md:h-80">
                    <SimpleChart type="doughnut" />
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
                  onClick={() => walletConnected && fetchUserAssets(walletAddress)}
                  disabled={loading || !walletConnected}
                >
                  <PieChart className="w-4 h-4 mr-2" />
                  {loading ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
            </div>

            {!walletConnected ? (
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
                  const assetValueHBAR = (parseFloat(asset.price) / Math.pow(10, 8)) * asset.amount; // Convert tinybar to HBAR
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
                            <img
                              src={asset.image}
                              alt={asset.name}
                              className="w-full h-32 object-cover rounded-lg"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
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
                            <p className="text-sm md:text-lg font-bold text-green-600">{assetValueHBAR.toFixed(4)} HBAR</p>
                          </div>
                          <div className="bg-gray-50 p-2 md:p-3 rounded-lg">
                            <p className="text-xs font-medium text-gray-600 mb-1">PRICE PER TOKEN</p>
                            <p className="text-sm md:text-lg font-bold text-gray-900">
                              {(parseFloat(asset.price) / Math.pow(10, 8)).toFixed(4)} HBAR
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
                          <Button variant="outline" className="flex-1 text-sm">
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
                    <p className="text-xs md:text-sm font-medium text-gray-600">MONTHLY INCOME</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900">
                      {walletConnected ? `${portfolioData.monthlyIncome.toFixed(4)} HBAR` : 'Connect Wallet'}
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
                  {walletConnected ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Investor'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 md:space-x-4">
              {/* Wallet Connection */}
              {!walletConnected ? (
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
                    onClick={() => fetchUserAssets(walletAddress)}
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
                      {(parseFloat(selectedAsset.price) / Math.pow(10, 8)).toFixed(4)} HBAR
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

              {/* Estimated Return */}
              {sellAmount && parseInt(sellAmount) > 0 && parseInt(sellAmount) <= selectedAsset.amount && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700 font-medium">Estimated Return</p>
                  <p className="text-lg font-bold text-green-600">
                    {((parseFloat(selectedAsset.price) / Math.pow(10, 8)) * parseInt(sellAmount)).toFixed(4)} HBAR
                  </p>
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
