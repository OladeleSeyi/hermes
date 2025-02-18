import { Module, Type } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { Transaction } from '../database/models/transaction.model';
import { CacheConfigModule } from 'src/cache/cache-config.module';

@Module({
  imports: [SequelizeModule.forFeature([Transaction]), CacheConfigModule],
  controllers: [TransactionsController as Type<any>],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
