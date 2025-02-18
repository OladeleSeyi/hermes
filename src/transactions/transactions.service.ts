import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction } from '../database/models/transaction.model';
import { Op } from 'sequelize';
import { Literal } from 'sequelize/types/utils';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  GetTopAccountsParams,
  GetTopAccountsResponse,
  GetTopAccountsResult,
  GetTotalTransferredParams,
  GetTotalTransferredResponse,
  PaginationMetadata,
  TopAccountWhereClause,
  VolumeWhereClause,
} from './transaction.types';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction) private transactionModel: typeof Transaction,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getTotalTransferred({
    startDate,
    endDate,
    address,
    as,
    fromCache = true,
  }: GetTotalTransferredParams): Promise<GetTotalTransferredResponse> {
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(new Date(endDate)) : new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid endDate');
    }

    end.setHours(23, 59, 59, 999);

    const cacheKey = address
      ? `volume-${start.getTime()}-${end.getTime()}-${address}-${as}`
      : `volume-${start.getTime()}-${end.getTime()}`;

    if (fromCache) {
      try {
        const cachedValue = await this.cacheManager.get(cacheKey);
        if (cachedValue) return cachedValue as GetTotalTransferredResponse;
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error(`Cache read failed: ${error.message}`, error.stack);
        } else {
          console.error('Cache read failed with unknown error:', error);
        }
      }
    }

    const whereClause: VolumeWhereClause = {
      createdAt: {
        [Op.between]: [start, end],
      },
    };

    if (address && as) {
      if (as === 'sender') {
        whereClause.fromAddress = address;
      } else if (as === 'recipient') {
        whereClause.toAddress = address;
      }
    } else if (address && !as) {
      whereClause[Op.or as unknown as keyof VolumeWhereClause] = [
        { fromAddress: address },
        { toAddress: address },
      ];
    }

    const total = await this.transactionModel.sum('amount', {
      where: whereClause,
      logging: true,
    });

    const result = { message: 'success', data: { volume: total || 0, as } };

    void this.cacheManager
      .set(cacheKey, result, 150)
      .catch((error: Error) =>
        console.error(`Cache write failed: ${error.message}`, error.stack),
      );

    return result;
  }

  async getTopAccounts({
    page = 1,
    limit = 25,
    startDate,
    endDate,
    as,
    fromCache,
  }: GetTopAccountsParams): Promise<GetTopAccountsResponse> {
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new HttpException('Invalid Date supplied', HttpStatus.BAD_REQUEST);
    }
    end.setHours(23, 59, 59, 999);

    const cacheKey = `top-accounts-${start.getTime()}-${end.getTime()}-${page}-${as ?? 'default'}`;

    if (fromCache) {
      try {
        const cachedValue =
          await this.cacheManager.get<GetTopAccountsResponse>(cacheKey);
        if (cachedValue) return cachedValue;
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error(`Cache read failed: ${error.message}`, error.stack);
        } else {
          console.error('Cache read failed with unknown error:', error);
        }
      }
    }

    const whereClause: TopAccountWhereClause = {
      createdAt: {
        [Op.between]: [start, end],
      },
    };

    let addressField: string | Literal;
    let designation: string;

    if (as === 'total') {
      addressField = this.transactionModel.sequelize.literal(
        'CASE WHEN "fromAddress" IS NOT NULL THEN "fromAddress" ELSE "toAddress" END',
      );
      whereClause[Op.or as unknown as keyof TopAccountWhereClause] = [
        { fromAddress: { [Op.ne]: null } },
        { toAddress: { [Op.ne]: null } },
      ];
      designation = 'total volume';
    } else {
      addressField = as === 'sender' ? 'fromAddress' : 'toAddress';
      designation = addressField === 'fromAddress' ? 'sender' : 'recipient';
    }

    const totalCount = 100;
    const offset = (page - 1) * limit;
    const metadata: PaginationMetadata = {
      limit,
      page,
      next: totalCount > offset + limit ? page + 1 : null,
    };

    try {
      const topAccounts = (await this.transactionModel.findAll({
        attributes: [
          [addressField, 'address'],
          [
            this.transactionModel.sequelize.fn(
              'SUM',
              this.transactionModel.sequelize.col('amount'),
            ),
            'volume',
          ],
          [this.transactionModel.sequelize.literal(`'${designation}'`), 'as'],
        ],
        where: whereClause,
        group: ['address'],
        order: [[this.transactionModel.sequelize.col('volume'), 'DESC']],
        limit,
        offset: page > 1 ? offset : undefined,
        raw: true,
      })) as unknown as GetTopAccountsResult[];

      const result: GetTopAccountsResponse = {
        message: 'success',
        data: topAccounts,
        metadata,
      };

      void this.cacheManager
        .set(cacheKey, result, 150)
        .catch((error: unknown) => {
          if (error instanceof Error) {
            console.error(`Cache write failed: ${error.message}`, error.stack);
          } else {
            console.error('Cache write failed with unknown error:', error);
          }
        });

      return result;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error in getTopAccounts:', error.message, error.stack);
      } else {
        console.error('Unknown error in getTopAccounts:', error);
      }
      throw new HttpException(
        'Failed to fetch top accounts',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async getSummary() {
    try {
      let summary = await this.cacheManager.get('summary');

      if (summary) {
        return summary;
      }

      const startDate = new Date();
      startDate.setHours(startDate.getHours() - 24);

      const totalVolumeToday = await this.getTotalTransferred({
        startDate: startDate.toISOString(),
      });
      const topAccountsToday = await this.getTopAccounts({
        startDate: startDate.toISOString(),
        limit: 25,
      });

      const topSendersToday = await this.getTopAccounts({
        limit: 25,
        as: 'sender',
      });

      const topRecieversToday = await this.getTopAccounts({
        limit: 25,
        as: 'recipient',
      });

      summary = {
        volume: {
          totalVolumeToday: totalVolumeToday.data.volume,
        },
        topAccounts: {
          today: {
            topAccounts: topAccountsToday.data,
            topRecievers: topSendersToday.data,
            topSenders: topRecieversToday.data,
          },
        },
      };

      await this.cacheManager.set('summary', summary);
      return summary;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(
          'Error in Error in summary: ',
          error.message,
          error.stack,
        );
      } else {
        console.error('Unknown error in Error in summary: ', error);
      }
      throw new HttpException(
        'Failed to fetch top accounts',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
