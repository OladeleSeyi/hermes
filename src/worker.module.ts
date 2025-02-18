import { Module } from '@nestjs/common';

import { DatabaseModule } from './database/database.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { ConfigModule } from './config/config.module';
import { TransactionsModule } from './transactions/transactions.module';
import { CacheConfigModule } from './cache/cache-config.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    CacheConfigModule,
    BlockchainModule,
    TransactionsModule,
    AnalyticsModule,
  ],
})
export class WorkerModule {}
