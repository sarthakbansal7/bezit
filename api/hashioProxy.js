// API proxy for Hedera Hashio RPC to avoid CORS issues
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PROXY_PORT || 3001;
const HASHIO_URL = process.env.VITE_HEDERA_TESTNET_RPC || 'https://testnet.hashio.io/api';

// Enable CORS for frontend requests
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'],
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Hedera Proxy API', timestamp: new Date().toISOString() });
});

// Proxy endpoint for Hedera JSON-RPC calls
app.post('/api/hashio-proxy', async (req, res) => {
  try {
    console.log('🚀 Proxying request to Hedera:', req.body?.method || 'unknown method');
    
    const hashioResponse = await fetch(HASHIO_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    if (!hashioResponse.ok) {
      throw new Error(`Hedera RPC error: ${hashioResponse.status} ${hashioResponse.statusText}`);
    }

    const data = await hashioResponse.json();
    
    console.log('✅ Hedera response received:', data?.result ? 'Success' : 'Error');
    res.status(200).json(data);
    
  } catch (error) {
    console.error('❌ Proxy error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch from Hedera RPC', 
      details: error.message,
      jsonrpc: '2.0',
      id: req.body?.id || null
    });
  }
});

// Contract interaction proxy (for direct contract calls)
app.post('/api/contract-call', async (req, res) => {
  try {
    const { contractAddress, method, params = [], abi } = req.body;
    
    console.log(`🔧 Contract call: ${method} on ${contractAddress}`);
    
    // This endpoint can be expanded to handle specific contract interactions
    // For now, it proxies the JSON-RPC call
    const rpcPayload = {
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [
        {
          to: contractAddress,
          data: req.body.data // Encoded function call data
        },
        'latest'
      ],
      id: Date.now()
    };

    const hashioResponse = await fetch(HASHIO_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rpcPayload),
    });

    const data = await hashioResponse.json();
    res.status(200).json(data);
    
  } catch (error) {
    console.error('❌ Contract call error:', error.message);
    res.status(500).json({ 
      error: 'Failed to call contract', 
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🌐 Hedera Proxy API running on http://localhost:${PORT}`);
  console.log(`🔗 Proxying to: ${HASHIO_URL}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
});

export default app;
