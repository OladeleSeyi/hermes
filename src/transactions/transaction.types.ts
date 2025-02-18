import { Op } from 'sequelize';

export interface VolumeWhereClause {
  createdAt: {
    [Op.between]: [Date, Date];
  };
  fromAddress?: string;
  toAddress?: string;
  [key: string]: any;
}
type designation = 'sender' | 'recipient';

export interface GetTotalTransferredParams {
  startDate?: string;
  endDate?: string;
  address?: string;
  as?: designation;
  fromCache?: boolean;
}

export interface GetTotalTransferredResult {
  volume: number;
  as?: designation;
}

export interface GetTotalTransferredResponse {
  data: GetTotalTransferredResult;
  message: string;
}

export interface PaginationMetadata {
  limit: number;
  page: number;
  next: number;
}

type topAccountDesignation = 'total' | 'sender' | 'recipient';

export interface GetTopAccountsParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  as?: topAccountDesignation;
  fromCache?: boolean;
}

export interface GetTopAccountsResult {
  address?: string;
  as?: designation;
  volume: string;
}

export interface GetTopAccountsResponse {
  message: string;
  data: GetTopAccountsResult[];
  metadata?: PaginationMetadata;
}

export interface TopAccountWhereClause {
  createdAt: {
    [Op.between]: [Date, Date];
  };
  fromAddress?: string;
  toAddress?: string;
  [key: string]: any;
}
