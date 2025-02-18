/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { getModelToken } from '@nestjs/sequelize';
import { Transaction } from '../database/models/transaction.model';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpException, HttpStatus } from '@nestjs/common';
import {
  GetTopAccountsParams,
  GetTopAccountsResponse,
  GetTopAccountsResult,
  GetTotalTransferredResponse,
} from './transaction.types';
import { Op } from 'sequelize';

const mockTransactionModel = {
  findAll: jest.fn(),
  sum: jest.fn(),
  sequelize: {
    fn: jest.fn(),
    col: jest.fn(),
    literal: jest.fn(),
  },
};

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn().mockResolvedValue(undefined),
  reset: jest.fn(),
  wrap: jest.fn(),
} as any as jest.Mocked<Cache>;

describe('TransactionsService', () => {
  let service: TransactionsService;
  let transactionModel: any;
  let cacheManager: Cache;
  let module: TestingModule;

  const mockDate = new Date('2025-01-15');

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getModelToken(Transaction),
          useValue: mockTransactionModel,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    transactionModel = module.get(getModelToken(Transaction));
    cacheManager = module.get<Cache>(CACHE_MANAGER);
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await module.close();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTotalTransferred', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TransactionsService,
          {
            provide: getModelToken(Transaction),
            useValue: {
              sum: jest.fn(),
            },
          },
          {
            provide: CACHE_MANAGER,
            useValue: {
              get: jest.fn(),
              set: jest.fn().mockResolvedValue(undefined),
            },
          },
        ],
      }).compile();

      service = module.get<TransactionsService>(TransactionsService);
      transactionModel = module.get<typeof Transaction>(
        getModelToken(Transaction),
      );
      cacheManager = module.get<Cache>(CACHE_MANAGER);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should fetch data from cache if available', async () => {
      const mockCacheData = {
        message: 'success',
        data: { volume: 1000, as: 'sender' },
      };
      jest.spyOn(cacheManager, 'get').mockResolvedValue(mockCacheData);

      const result = await service.getTotalTransferred({
        startDate: '2024-01-01',
        endDate: '2024-01-02',
        fromCache: true,
      });

      expect(cacheManager.get).toHaveBeenCalled();
      expect(result).toEqual(mockCacheData);
    });

    it('should query database when cache is empty', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(transactionModel, 'sum').mockResolvedValue(500);

      const result = await service.getTotalTransferred({
        startDate: '2024-01-01',
        endDate: '2024-01-02',
      });

      expect(transactionModel.sum).toHaveBeenCalledWith(
        'amount',
        expect.objectContaining({
          where: expect.any(Object),
        }),
      );
      expect(result).toEqual({
        message: 'success',
        data: { volume: 500, as: undefined },
      });
    });

    it('should handle invalid dates', async () => {
      await expect(
        service.getTotalTransferred({
          startDate: 'invalid-date',
          endDate: '2024-01-02',
        }),
      ).rejects.toThrowError('Invalid endDate');
    });

    it('should handle missing transactions gracefully', async () => {
      jest.spyOn(transactionModel, 'sum').mockResolvedValue(null);

      const result = await service.getTotalTransferred({
        startDate: '2024-01-01',
        endDate: '2024-01-02',
      });

      expect(result).toEqual({
        message: 'success',
        data: { volume: 0, as: undefined },
      });
    });

    it('should cache the computed result', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(transactionModel, 'sum').mockResolvedValue(200);

      const result = await service.getTotalTransferred({
        startDate: '2024-01-01',
        endDate: '2024-01-02',
      });

      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.any(String),
        result,
        180,
      );
    });

    it('should handle cache read errors gracefully', async () => {
      jest
        .spyOn(cacheManager, 'get')
        .mockRejectedValue(new Error('Cache error'));
      jest.spyOn(transactionModel, 'sum').mockResolvedValue(100);

      const result = await service.getTotalTransferred({
        startDate: '2024-01-01',
        endDate: '2024-01-02',
      });

      expect(transactionModel.sum).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'success',
        data: { volume: 100, as: undefined },
      });
    });

    it('should handle cache write errors gracefully', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(transactionModel, 'sum').mockResolvedValue(100);
      jest
        .spyOn(cacheManager, 'set')
        .mockRejectedValue(new Error('Cache write error'));

      const result = await service.getTotalTransferred({
        startDate: '2024-01-01',
        endDate: '2024-01-02',
      });

      expect(cacheManager.set).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'success',
        data: { volume: 100, as: undefined },
      });
    });

    it('should build correct query when "as" is sender', async () => {
      jest.spyOn(transactionModel, 'sum').mockResolvedValue(300);

      const result = await service.getTotalTransferred({
        startDate: '2024-01-01',
        endDate: '2024-01-02',
        address: '0x123',
        as: 'sender',
      });

      expect(transactionModel.sum).toHaveBeenCalledWith(
        'amount',
        expect.objectContaining({
          where: {
            createdAt: expect.any(Object),
            fromAddress: '0x123',
          },
        }),
      );
      expect(result).toEqual({
        message: 'success',
        data: { volume: 300, as: 'sender' },
      });
    });

    it('should build correct query when "as" is recipient', async () => {
      jest.spyOn(transactionModel, 'sum').mockResolvedValue(400);

      const result = await service.getTotalTransferred({
        startDate: '2024-01-01',
        endDate: '2024-01-02',
        address: '0x456',
        as: 'recipient',
      });

      expect(transactionModel.sum).toHaveBeenCalledWith(
        'amount',
        expect.objectContaining({
          where: {
            createdAt: expect.any(Object),
            toAddress: '0x456',
          },
        }),
      );
      expect(result).toEqual({
        message: 'success',
        data: { volume: 400, as: 'recipient' },
      });
    });

    it('should handle database errors gracefully', async () => {
      jest
        .spyOn(transactionModel, 'sum')
        .mockRejectedValue(new Error('Database error'));

      await expect(
        service.getTotalTransferred({
          startDate: '2024-01-01',
          endDate: '2024-01-02',
        }),
      ).rejects.toThrowError('Database error');
    });
  });

  describe('getTopAccounts', () => {
    it('should fetch and cache top accounts with correct parameters', async () => {
      const mockTopAccounts = [
        {
          address: '0x123',
          volume: '100',
          as: 'sender',
        },
      ];

      mockTransactionModel.sequelize = {
        fn: jest.fn().mockReturnValue('SUM'),
        col: jest.fn().mockReturnValue('amount'),
        literal: jest.fn().mockReturnValue('LITERAL'),
      };

      mockTransactionModel.findAll.mockResolvedValue(mockTopAccounts);
      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue(undefined);

      const params: GetTopAccountsParams = {
        page: 1,
        limit: 25,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        as: 'sender',
        fromCache: true,
      };

      const expectedWhereClause = {
        createdAt: {
          [Op.between]: [
            new Date('2025-01-01'),
            new Date('2025-01-31T23:59:59.999'),
          ],
        },
      };

      const expectedResult: GetTopAccountsResponse = {
        message: 'success',
        data: mockTopAccounts as any as GetTopAccountsResult[],
        metadata: {
          limit: 25,
          page: 1,
          next: 2,
        },
      };

      const result = await service.getTopAccounts(params);

      expect(mockCacheManager.get).toHaveBeenCalledWith(
        expect.stringContaining('top-accounts'),
      );

      expect(mockTransactionModel.findAll).toHaveBeenCalledWith({
        attributes: expect.arrayContaining([
          ['fromAddress', 'address'],
          [expect.any(String), 'volume'],
          [expect.any(String), 'as'],
        ]),
        where: expectedWhereClause,
        group: ['address'],
        order: expect.any(Array),
        limit: 25,
        offset: undefined,
        raw: true,
      });

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('top-accounts'),
        result,
        180,
      );

      expect(result).toEqual(
        expect.objectContaining({
          message: 'success',
          data: mockTopAccounts,
          metadata: expect.objectContaining({
            limit: 25,
            page: 1,
            next: expect.any(Number),
          }),
        }),
      );
      expect(result).toEqual(expectedResult);
    });

    it('should return cached data when available', async () => {
      const cachedData: GetTopAccountsResponse = {
        message: 'success',
        data: [{ address: '0xcached', volume: '200', as: 'sender' }],
        metadata: { limit: 25, page: 1, next: null },
      };

      mockCacheManager.get.mockResolvedValue(cachedData);

      const params: GetTopAccountsParams = {
        fromCache: true,
      };

      const result = await service.getTopAccounts(params);

      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockTransactionModel.findAll).not.toHaveBeenCalled();
      expect(result).toEqual(cachedData);
    });

    it('should handle invalid dates correctly', async () => {
      const params: GetTopAccountsParams = {
        startDate: 'invalid-date',
      };

      await expect(service.getTopAccounts(params)).rejects.toThrow(
        new HttpException('Invalid Date supplied', HttpStatus.BAD_REQUEST),
      );
    });
  });

  describe('getSummary', () => {
    it('should return summary from cache if available', async () => {
      const mockSummary = {
        volume: { totalVolumeToday: 100 },
        topAccounts: {
          today: { topAccounts: [], topRecievers: [], topSenders: [] },
        },
      };
      mockCacheManager.get.mockResolvedValue(mockSummary);

      const result = await service.getSummary();

      expect(cacheManager.get).toHaveBeenCalledWith('summary');
      expect(transactionModel.sum).not.toHaveBeenCalled();
      expect(result).toEqual(mockSummary);
    });

    it('should calculate summary and store it in cache if not available', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const mockTotalTransferredResponse: GetTotalTransferredResponse = {
        message: 'success',
        data: { volume: 100, as: undefined },
      };
      const mockTopAccountsResponse: GetTopAccountsResponse = {
        message: 'success',
        data: [],
        metadata: { limit: 25, page: 1, next: null },
      };

      jest
        .spyOn(service, 'getTotalTransferred')
        .mockResolvedValue(mockTotalTransferredResponse);
      jest
        .spyOn(service, 'getTopAccounts')
        .mockResolvedValue(mockTopAccountsResponse);

      const result = await service.getSummary();

      expect(cacheManager.get).toHaveBeenCalledWith('summary');
      expect(service.getTotalTransferred).toHaveBeenCalled();
      expect(service.getTopAccounts).toHaveBeenCalledTimes(3);
      expect(cacheManager.set).toHaveBeenCalledWith(
        'summary',
        expect.any(Object),
      );

      expect(result).toEqual({
        volume: { totalVolumeToday: 100 },
        topAccounts: {
          today: {
            topAccounts: [],
            topRecievers: [],
            topSenders: [],
          },
        },
      });
    });

    it('should handle and throw error when the cache throws getting the summary', async () => {
      mockCacheManager.get.mockImplementation(() => {
        throw new Error('Cache failure');
      });

      await expect(service.getSummary()).rejects.toThrow(Error);
      expect(mockTransactionModel.findAll).not.toHaveBeenCalled();
    });

    it('should handle and throw error when getTotalTransferred throws', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockTransactionModel.sum.mockImplementation(() => {
        throw new Error('getTotalTransferred failure');
      });

      await expect(service.getSummary()).rejects.toThrow(Error);
      expect(mockTransactionModel.sum).toHaveBeenCalled();
      expect(mockTransactionModel.findAll).not.toHaveBeenCalled();
    });

    it('should handle and throw error when getTopAccounts throws', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      const mockTotalTransferredResponse: GetTotalTransferredResponse = {
        message: 'success',
        data: { volume: 100, as: undefined },
      };
      jest
        .spyOn(service, 'getTotalTransferred')
        .mockResolvedValue(mockTotalTransferredResponse);
      jest
        .spyOn(service, 'getTopAccounts')
        .mockRejectedValue(new Error('getTopAccounts failure'));

      await expect(service.getSummary()).rejects.toThrow(Error);
      expect(service.getTotalTransferred).toHaveBeenCalled();
      expect(service.getTopAccounts).toHaveBeenCalledTimes(1);
    });
  });
});
