import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cron } from '@nestjs/schedule';
import { TransactionsService } from '../transactions/transactions.service';
import { Cache } from 'cache-manager';
import { GetTopAccountsResult } from 'src/transactions/transaction.types';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private transactionsService: TransactionsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Cron('0 */3 * * * *') // Runs every minute
  async computeAnalytics() {
    this.logger.log('\n\n\n Running scheduled analytics task... \n\n\n');

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    let totalVolume: number;
    const volumeTillDate = await this.cacheManager.get('volume-till-date');

    const totalVolumeToday = await this.transactionsService.getTotalTransferred(
      {
        startDate: startDate.toISOString().slice(0, 10),
      },
    );

    if (volumeTillDate) {
      try {
        totalVolume = Number(volumeTillDate) + totalVolumeToday.data.volume;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error: unknown) {
        totalVolume = (await this.transactionsService.getTotalTransferred({}))
          .data.volume;
      }
    } else {
      totalVolume = (await this.transactionsService.getTotalTransferred({}))
        .data.volume;
    }
    let topAccountsTillDate = (await this.cacheManager
      .get('topAccount-till-date')
      .catch((e) => this.logger.error(e))) as GetTopAccountsResult[];

    if (!topAccountsTillDate) {
      const info = await this.transactionsService.getTopAccounts({
        limit: 25,
      });
      topAccountsTillDate = info?.data;
    }

    let topRecieversTillDate = (await this.cacheManager
      .get('topReciever-till-date')
      .catch((e) => this.logger.error(e))) as GetTopAccountsResult[];

    if (!topRecieversTillDate) {
      const receivers = await this.transactionsService.getTopAccounts({
        limit: 25,
        as: 'recipient',
      });
      topRecieversTillDate = receivers?.data;
    }

    let topSendersTillDate = (await this.cacheManager
      .get('topSender-till-date')
      .catch((e) => this.logger.error(e))) as GetTopAccountsResult[];

    if (topSendersTillDate) {
      const senders = await this.transactionsService.getTopAccounts({
        limit: 25,
        as: 'sender',
      });
      topSendersTillDate = senders?.data;
    }

    const topAccountsToday = await this.transactionsService.getTopAccounts({
      startDate: startDate.toISOString().slice(0, 10),
      limit: 25,
    });

    const topSendersToday = await this.transactionsService.getTopAccounts({
      startDate: startDate.toISOString().slice(0, 10),
      limit: 25,
      as: 'sender',
    });

    const topRecieversToday = await this.transactionsService.getTopAccounts({
      startDate: startDate.toISOString().slice(0, 10),
      limit: 25,
      as: 'recipient',
    });

    const summary = {
      volume: {
        allTime: totalVolume,
        totalVolumeToday: totalVolumeToday.data.volume,
      },
      topAccounts: {
        allTime: {
          topAccounts: topAccountsTillDate,
          topRecievers: topRecieversTillDate,
          topSenders: topSendersTillDate,
        },
        today: {
          topAccounts: topAccountsToday.data,
          topRecievers: topSendersToday.data,
          topSenders: topRecieversToday.data,
        },
      },
    };

    await this.cacheManager.set('summary', summary);
  }

  @Cron('0 1 * * *') // At 1:00 AM every day
  async computeDataTillDate() {
    const endDate = new Date();
    endDate.setHours(endDate.getHours() - 24);
    const formattedDate = endDate.toISOString().slice(0, 10);
    const volumeTillDate = await this.transactionsService.getTotalTransferred({
      endDate: formattedDate,
    });

    const topAccountsTillDate = await this.transactionsService.getTopAccounts({
      limit: 25,
      endDate: formattedDate,
    });
    const topRecieversTillDate = await this.transactionsService.getTopAccounts({
      limit: 25,
      as: 'recipient',
      endDate: formattedDate,
    });
    const topSendersTillDate = await this.transactionsService.getTopAccounts({
      limit: 25,
      as: 'sender',
      endDate: formattedDate,
    });

    await this.cacheManager.set('volume-till-date', volumeTillDate.data.volume);
    await this.cacheManager.set(
      'topAccount-till-date',
      topAccountsTillDate.data,
    );
    await this.cacheManager.set(
      'topReciever-till-date',
      topRecieversTillDate.data,
    );
    await this.cacheManager.set('topSender-till-date', topSendersTillDate.data);
  }
}
