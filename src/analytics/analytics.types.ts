import { GetTopAccountsResult } from 'src/transactions/transaction.types';

export interface Summary {
  volume: {
    allTime: number;
    totalVolumeToday: number;
  };
  topAccounts: {
    allTime: {
      topAccounts: GetTopAccountsResult[];
      topRecievers: GetTopAccountsResult[];
      topSenders: GetTopAccountsResult[];
    };
    today: {
      topAccounts: GetTopAccountsResult[];
      topRecievers: GetTopAccountsResult[];
      topSenders: GetTopAccountsResult[];
    };
  };
}
