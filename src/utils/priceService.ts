// Generic price service for tokenized assets
export interface PriceData {
  usd: number;
  timestamp: number;
}

let cachedPrice: PriceData | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Mock price for demo purposes - returns a stable price
export const fetchTokenPrice = async (): Promise<number> => {
  // Check cache first
  if (cachedPrice && Date.now() - cachedPrice.timestamp < CACHE_DURATION) {
    return cachedPrice.usd;
  }

  // For demo purposes, return a mock stable price
  const mockPrice = 1.25; // $1.25 per token for demo
  
  cachedPrice = {
    usd: mockPrice,
    timestamp: Date.now()
  };
  
  console.log(`Demo token price loaded: $${mockPrice}`);
  return mockPrice;
};

export const formatPriceInUSD = (tokenAmount: number, tokenPrice: number): string => {
  const usdValue = tokenAmount * tokenPrice;
  
  if (usdValue < 1) {
    return `$${usdValue.toFixed(4)}`;
  } else if (usdValue < 1000) {
    return `$${usdValue.toFixed(2)}`;
  } else {
    return `$${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
};

// Helper function for converting tokens to USD
export const convertTokenToUSD = (tokenAmount: string | number, tokenPrice: number): number => {
  const tokenValue = typeof tokenAmount === 'string' ? parseFloat(tokenAmount) : tokenAmount;
  return tokenValue * tokenPrice;
};

// Backward compatibility aliases
export const fetchETHPrice = fetchTokenPrice;
export const convertETHToUSD = convertTokenToUSD;
