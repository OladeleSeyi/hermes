import { Dialect } from 'sequelize';

const config = () => ({
  database: {
    dialect: 'postgres' as Dialect,
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    logging: process.env.DB_LOGGING === 'true',
  },
  avaxRpcUrl: process.env.AVAX_RPC_URL,
  usdcData: {
    abi: process.env.USDC_ABI,
    address: process.env.USDC_CONTRACT_ADDRESS,
    tokenName: 'USDC',
    decimals: 6,
  },
});

export default config;
