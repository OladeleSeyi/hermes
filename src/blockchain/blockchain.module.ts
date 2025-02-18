import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { BlockchainService } from './blockchain.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { Transaction } from '../database/models/transaction.model';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    SequelizeModule.forFeature([Transaction]),
  ],
  providers: [BlockchainService],
  exports: [BlockchainService],
})
export class BlockchainModule {}
