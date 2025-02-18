import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AnalyticsService } from './analytics.service';
import { TransactionsModule } from '../transactions/transactions.module';

import { CacheConfigModule } from 'src/cache/cache-config.module';

@Module({
  imports: [ScheduleModule.forRoot(), TransactionsModule, CacheConfigModule],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
