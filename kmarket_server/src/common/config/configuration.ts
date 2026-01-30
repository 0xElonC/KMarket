export default () => ({
  // Server
  port: parseInt(process.env.PORT || '3000', 10),

  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    name: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },

  // Blockchain
  chain: {
    rpcUrl: process.env.RPC_URL || 'https://polygon-rpc.com',
    rpcWsUrl: process.env.RPC_WS_URL || '',
    vaultAddress: process.env.VAULT_ADDRESS || '',
    serverPrivateKey: process.env.SERVER_PRIVATE_KEY || '',
    chainId: parseInt(process.env.CHAIN_ID || '137', 10),
    startBlock: parseInt(process.env.START_BLOCK || '0', 10),
    pollInterval: parseInt(process.env.POLL_INTERVAL || '5000', 10),
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'kmarket-dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Third-party APIs
  exchange: {
    binanceWsUrl: process.env.BINANCE_WS_URL || 'wss://stream.binance.com:9443/ws',
    okxWsUrl: process.env.OKX_WS_URL || 'wss://ws.okx.com:8443/ws/v5/public',
  },
});
