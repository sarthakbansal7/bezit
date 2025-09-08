import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { formatPriceInUSD } from '@/utils/priceService';
import { ethers } from 'ethers';
import { useWallet } from '@/context/WalletContext';
import { MARKETPLACE_CONTRACT, NETWORK_CONFIG, ACTIVE_NETWORK } from '@/lib/contractAddress';
import { MARKETPLACE_ABI } from '@/utils/marketplaceABI';

interface BuyModalProps {
  asset: {
    tokenId: string;
    name: string;
    description?: string;
    price: string; // Price per token in Wei
    amount: number; // Available amount
    image?: string;
    seller: string;
    metadata?: any;
  };
  onClose: () => void;
  onSuccess?: () => void;
  tokenPrice: number;
}

const BuyModal: React.FC<BuyModalProps> = ({ asset, onClose, onSuccess, tokenPrice }) => {
  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const { provider, signer, address, isConnected } = useWallet();

  // Add error state for handling rendering issues
  const [error, setError] = useState<string | null>(null);

  // Safety check for asset price
  const safePrice = asset.price && !isNaN(parseFloat(asset.price)) ? asset.price : "0";
  console.log('BuyModal - Asset data:', {
    tokenId: asset.tokenId,
    name: asset.name,
    price: asset.price,
    safePrice: safePrice,
    amount: asset.amount
  });

  // Calculate costs with platform fee
  const pricePerTokenETH = parseFloat(safePrice) / Math.pow(10, 18); // Convert Wei to S for display
  
  // Validate that we have a valid price before calculations
  if (!pricePerTokenETH || pricePerTokenETH <= 0 || !isFinite(pricePerTokenETH)) {
    console.error('Invalid price calculation:', { pricePerTokenETH, safePrice });
    return (
      <div className="modal-overlay" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <div className="modal-content" style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          maxWidth: '400px',
          width: '90%'
        }}>
          <h2>Error</h2>
          <p>Unable to calculate price for this asset. Please try again later.</p>
          <button onClick={onClose} style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>Close</button>
        </div>
      </div>
    );
  }
  
  const subtotalETH = pricePerTokenETH * quantity;
  const platformFeeETH = subtotalETH * 0.01; // 1% platform fee as per contract
  const totalCostETH = subtotalETH + platformFeeETH;
  
  // Safe conversion to Wei - handle small decimals properly
  let subtotalWei: ethers.BigNumber;
  let platformFeeWei: ethers.BigNumber;
  let totalCostWei: ethers.BigNumber;
  
  try {
    subtotalWei = ethers.BigNumber.from(safePrice).mul(quantity);
    platformFeeWei = subtotalWei.div(100); // 1% of subtotal
    totalCostWei = subtotalWei.add(platformFeeWei);
  } catch (error) {
    console.error('Error calculating Wei values:', error);
    return (
      <div className="modal-overlay" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <div className="modal-content" style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          maxWidth: '400px',
          width: '90%'
        }}>
          <h2>Error</h2>
          <p>Unable to process payment calculation. Please try again.</p>
          <button onClick={onClose} style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>Close</button>
        </div>
      </div>
    );
  }

  // Validate asset data early
  if (!asset || !asset.tokenId) {
    console.error('BuyModal: Invalid asset data', asset);
    return (
      <div className="modal-overlay" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <div className="modal-content" style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          maxWidth: '400px',
          width: '90%'
        }}>
          <h2>Error</h2>
          <p>Invalid asset data. Please try again.</p>
          <button onClick={onClose} style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>Close</button>
        </div>
      </div>
    );
  }

  // Check for valid price
  if (!safePrice || parseFloat(safePrice) <= 0) {
    console.error('BuyModal: Invalid price data', { price: asset.price, safePrice });
    return (
      <div className="modal-overlay" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <div className="modal-content" style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          maxWidth: '400px',
          width: '90%'
        }}>
          <h2>Error</h2>
          <p>Invalid price data for this asset. Please contact support.</p>
          <button onClick={onClose} style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>Close</button>
        </div>
      </div>
    );
  }

  const handlePurchase = async () => {
    if (!isConnected || !signer || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsProcessing(true);
    
    try {
      console.log('🔄 Starting asset purchase...');
      console.log('Token ID:', asset.tokenId);
      console.log('Quantity:', quantity);
      console.log('Price per token:', asset.price, 'Wei');
      console.log('Subtotal:', subtotalWei.toString(), 'Wei');
      console.log('Platform fee:', platformFeeWei.toString(), 'Wei');
      console.log('Total cost:', totalCostWei.toString(), 'Wei');
      
      // Check network
      const network = await signer.provider.getNetwork();
      if (network.chainId !== NETWORK_CONFIG[ACTIVE_NETWORK].chainId) {
        throw new Error(`Please switch to ${NETWORK_CONFIG[ACTIVE_NETWORK].name}`);
      }
      
      // Check balance
      const balance = await signer.getBalance();
      if (balance.lt(totalCostWei)) {
        throw new Error('Insufficient S balance for purchase including platform fee');
      }
      
      // Create marketplace contract instance
      const marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT, MARKETPLACE_ABI, signer);
      
      console.log('📞 Calling buyAsset on marketplace contract...');
      toast.loading(`Purchasing ${quantity} token${quantity > 1 ? 's' : ''}...`);
      
      // Call buyAsset function with total cost including platform fee
      const tx = await marketplaceContract.buyAsset(asset.tokenId, quantity, {
        value: totalCostWei,
        gasLimit: 500000 // Set gas limit to prevent estimation issues
      });
      
      console.log('⏳ Transaction sent:', tx.hash);
      toast.dismiss();
      toast.loading('Confirming transaction...');
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', receipt.transactionHash);
      
      toast.dismiss();
      toast.success(`🎉 Successfully purchased ${quantity} token${quantity > 1 ? 's' : ''} of ${asset.name}!`);
      
      if (onSuccess) {
        onSuccess();
      }
      onClose();

    } catch (error: any) {
      console.error('❌ Purchase failed:', error);
      toast.dismiss();
      
      if (error.code === 4001) {
        toast.error('Transaction rejected by user');
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        toast.error('Insufficient funds for transaction');
      } else if (error.message?.includes('Insufficient payment including platform fee')) {
        toast.error('Insufficient payment including platform fee');
      } else if (error.message?.includes('Asset not listed')) {
        toast.error('Asset is no longer available for purchase');
      } else if (error.message?.includes('Insufficient tokens')) {
        toast.error('Not enough tokens available');
      } else {
        toast.error(`Purchase failed: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Purchase Asset</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            {asset.image && (
              <img
                src={asset.image}
                alt={asset.name}
                className="w-full h-48 object-cover rounded-xl"
              />
            )}

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{asset.name}</h3>
              {asset.description && (
                <p className="text-gray-600 text-sm mb-4">{asset.description}</p>
              )}
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200/50">
                  <div className="text-blue-600 text-sm font-medium">Platform ID</div>
                  <div className="text-blue-900 font-semibold mt-1">#{asset.tokenId}</div>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border border-green-200/50">
                  <div className="text-green-600 text-sm font-medium">Available</div>
                  <div className="text-green-900 font-semibold mt-1">{asset.amount} tokens</div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/50 mb-4">
                <div className="text-gray-600 text-sm font-medium">Price per Token</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {formatPriceInUSD(pricePerTokenETH, tokenPrice)}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {pricePerTokenETH.toFixed(4)} S each
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity to Purchase
              </label>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  disabled={quantity <= 1 || isProcessing}
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max={asset.amount}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.min(asset.amount, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                  disabled={isProcessing}
                />
                <button
                  onClick={() => setQuantity(Math.min(asset.amount, quantity + 1))}
                  className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  disabled={quantity >= asset.amount || isProcessing}
                >
                  +
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Maximum: {asset.amount} tokens available
              </p>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200/50">
              <div className="space-y-3">
                {/* Subtotal */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Subtotal ({quantity} token{quantity > 1 ? 's' : ''}):</span>
                  <div className="text-right">
                    <span className="text-lg font-semibold text-gray-900 block">
                      {formatPriceInUSD(subtotalETH, tokenPrice)}
                    </span>
                    <span className="text-sm text-gray-600">
                      {subtotalETH.toFixed(4)} S
                    </span>
                  </div>
                </div>
                
                {/* Platform Fee */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Platform Fee (1%):</span>
                  <div className="text-right">
                    <span className="text-lg font-semibold text-orange-600 block">
                      {formatPriceInUSD(platformFeeETH, tokenPrice)}
                    </span>
                    <span className="text-sm text-orange-500">
                      {platformFeeETH.toFixed(4)} S
                    </span>
                  </div>
                </div>
                
                {/* Divider */}
                <hr className="border-gray-300" />
                
                {/* Total */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-900 font-bold text-lg">Total Cost:</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-gray-900 block">
                      {formatPriceInUSD(totalCostETH, tokenPrice)}
                    </span>
                    <span className="text-sm text-gray-600">
                      {totalCostETH.toFixed(4)} S
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {!isConnected ? (
              <div className="bg-red-50 rounded-xl p-4 border border-red-200/50">
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 text-red-600 mt-0.5">⚠️</div>
                  <div className="text-sm text-red-800">
                    <p className="font-medium mb-1">Wallet Not Connected:</p>
                    <p>Please connect your wallet to purchase assets.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200/50">
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 text-blue-600 mt-0.5">ℹ️</div>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Transaction Details:</p>
                    <p>This purchase will be processed on the {NETWORK_CONFIG[ACTIVE_NETWORK].name} network. The 1% platform fee helps maintain the marketplace infrastructure.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <Button
              onClick={handlePurchase}
              disabled={!isConnected || isProcessing || quantity <= 0 || quantity > asset.amount}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!isConnected 
                ? 'Connect Wallet First' 
                : isProcessing 
                  ? 'Processing...' 
                  : `Buy ${quantity} Token${quantity > 1 ? 's' : ''}`
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyModal;
