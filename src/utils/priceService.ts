// Generic price service for tokenized assets
export interface PriceData {
  usd: number;
  timestamp: number;
}

let cachedTokenPrice: PriceData | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch native token price (S) from CoinGecko API
// Currently using ETH price as fallback since Sonic (S) may not be available on CoinGecko yet
export const fetchETHPrice = async (): Promise<number> => {
  // Check cache first
  if (cachedTokenPrice && Date.now() - cachedTokenPrice.timestamp < CACHE_DURATION) {
    console.log(`Using cached token price: $${cachedTokenPrice.usd}`);
    return cachedTokenPrice.usd;
  }

  try {
    console.log('🔄 Fetching token price from CoinGecko...');
    
    // Using Sonic token ID from CoinGecko
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=sonic-3&vs_currencies=usd',
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
    const tokenPrice = data['sonic-3']?.usd;

    if (!tokenPrice || typeof tokenPrice !== 'number') {
      throw new Error('Invalid token price data from CoinGecko');
    }

    cachedTokenPrice = {
      usd: tokenPrice,
      timestamp: Date.now()
    };

    console.log(`✅ Token price fetched from CoinGecko: $${tokenPrice}`);
    return tokenPrice;

  } catch (error) {
    console.error('❌ Error fetching token price from CoinGecko:', error);
    
    // Fallback to a reasonable token price if API fails
    const fallbackPrice = 2500; // ~$2500 USD as fallback (using ETH reference price)
    console.log(`⚠️ Using fallback token price: $${fallbackPrice}`);
    
    cachedTokenPrice = {
      usd: fallbackPrice,
      timestamp: Date.now()
    };
    
    return fallbackPrice;
  }
};

// Backward compatibility - use token price as native token price
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

// Helper function to convert native token (S) wei to USD
export const convertETHToUSD = (tokenAmount: string, tokenPrice: number): number => {
  const tokenValue = parseFloat(tokenAmount);
  return tokenValue * tokenPrice;
};

// Format native token amount with USD equivalent
export const formatETHWithUSD = (tokenAmount: string, tokenPrice: number): string => {
  const tokenValue = parseFloat(tokenAmount);
  const usdValue = tokenValue * tokenPrice;
  
  return `${tokenValue.toFixed(4)} S (~$${usdValue.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })})`;
};
