/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, OnModuleInit } from '@nestjs/common';
import Web3 from 'web3';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction } from '../database/models/transaction.model';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BlockchainService implements OnModuleInit {
  private web3: Web3;
  private usdcContract: any;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Transaction)
    private readonly transactionModel: typeof Transaction,
  ) {}

  async onModuleInit() {
    try {
      await this.setupWeb3();
      await this.setupContract();
      await this.subscribeToUSDCTransfers();
    } catch (error) {
      console.error('Blockchain service initialization failed:', error);
      throw error;
    }
  }

  private async setupWeb3() {
    const providerUrl = this.configService.get<string>('AVAX_RPC_URL');
    if (!providerUrl) {
      throw new Error('Missing AVAX_RPC_URL in environment');
    }

    const provider = new Web3.providers.WebsocketProvider(providerUrl);
    provider.on('end', (error) => {
      console.error(
        '\n\n\n WebSocket connection closed. Reconnecting... \n\n\n',
        error,
      );
      this.setupWeb3()
        .then(() => this.setupContract())
        .then(() => this.subscribeToUSDCTransfers())
        .catch((err) => console.error('Reconnection failed:', err));
    });
    this.web3 = new Web3(provider);

    const connected = await this.web3.eth.net.isListening();
    if (!connected) {
      throw new Error('Failed to connect to Web3 provider');
    }
  }

  private async setupContract(): Promise<void> {
    const usdcContractAddress = this.configService.get<string>(
      'USDC_CONTRACT_ADDRESS',
    );
    const usdcAbiString = this.configService.get<string>('USDC_ABI');

    if (!usdcContractAddress || !usdcAbiString) {
      throw new Error('Missing USDC contract configuration');
    }

    try {
      const usdcAbi = JSON.parse(usdcAbiString);
      this.usdcContract = new this.web3.eth.Contract(
        usdcAbi,
        usdcContractAddress,
      );

      if (!this.usdcContract.methods) {
        throw new Error('Contract initialization failed');
      }
    } catch (error) {
      throw new Error(`Contract setup failed: ${error.message}`);
    }
  }

  private async subscribeToUSDCTransfers(): Promise<unknown> {
    if (!this.usdcContract?.events?.Transfer) {
      throw new Error('Contract Transfer event not available');
    }

    const subscription = this.usdcContract.events.Transfer({
      fromBlock: 'latest',
    });

    subscription.on('data', async (event) => {
      await this.transactionModel.create({
        txHash: event.transactionHash,
        fromAddress: event.returnValues.from,
        toAddress: event.returnValues.to,
        amount: parseFloat(
          Web3.utils.fromWei(event.returnValues.value as string, 'mwei'),
        ),
        blockNumber: event.blockNumber,
      });
    });

    return subscription;
  }
}
