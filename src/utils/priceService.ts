// Generic price service for tokenized assets
export interface PriceData {
  usd: number;
  timestamp: number;
}

let cachedETHPrice: PriceData | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch ETH price from CoinGecko API
export const fetchETHPrice = async (): Promise<number> => {
  // Check cache first
  if (cachedETHPrice && Date.now() - cachedETHPrice.timestamp < CACHE_DURATION) {
    console.log(`Using cached ETH price: $${cachedETHPrice.usd}`);
    return cachedETHPrice.usd;
  }

  try {
    console.log('🔄 Fetching ETH price from CoinGecko...');
    
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const ethPrice = data.ethereum?.usd;

    if (!ethPrice || typeof ethPrice !== 'number') {
      throw new Error('Invalid ETH price data from CoinGecko');
    }

    cachedETHPrice = {
      usd: ethPrice,
      timestamp: Date.now()
    };

    console.log(`✅ ETH price fetched from CoinGecko: $${ethPrice}`);
    return ethPrice;

  } catch (error) {
    console.error('❌ Error fetching ETH price from CoinGecko:', error);
    
    // Fallback to a reasonable ETH price if API fails
    const fallbackPrice = 2500; // ~$2500 USD as fallback
    console.log(`⚠️ Using fallback ETH price: $${fallbackPrice}`);
    
    cachedETHPrice = {
      usd: fallbackPrice,
      timestamp: Date.now()
    };
    
    return fallbackPrice;
  }
};

// Backward compatibility - use ETH price as token price
export const fetchTokenPrice = fetchETHPrice;

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

// Helper function to convert ETH wei to USD
export const convertETHToUSD = (ethAmount: string, ethPrice: number): number => {
  const ethValue = parseFloat(ethAmount);
  return ethValue * ethPrice;
};

// Format ETH amount with USD equivalent
export const formatETHWithUSD = (ethAmount: string, ethPrice: number): string => {
  const ethValue = parseFloat(ethAmount);
  const usdValue = ethValue * ethPrice;
  
  return `${ethValue.toFixed(4)} ETH (~$${usdValue.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })})`;
};
