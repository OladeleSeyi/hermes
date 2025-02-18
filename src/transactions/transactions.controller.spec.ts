/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import {
  GetTopAccountsDto,
  GetTopAccountsResponseDto,
  GetVolumeDto,
  GetVolumeResponseDto,
} from './dto/transactions.dto';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ValidationPipe } from '@nestjs/common';

const mockTransactionsService = {
  getTopAccounts: jest.fn(),
  getTotalTransferred: jest.fn(),
};

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let service: TransactionsService;
  let app: INestApplication;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: TransactionsService,
          useValue: mockTransactionsService,
        },
      ],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
    service = module.get<TransactionsService>(TransactionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getTopAccounts', () => {
    it('should call the service with the correct parameters', async () => {
      const queryParams: GetTopAccountsDto = {
        page: 1,
        limit: 20,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        as: 'sender',
      };

      const expectedServiceParams = {
        page: 1,
        limit: 20,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        as: 'sender',
      };

      const mockResult: GetTopAccountsResponseDto = {
        message: 'success',
        data: [
          { address: '0x123', volume: '100', as: 'sender' },
          { address: '0x456', volume: '200', as: 'sender' },
        ],
      };

      mockTransactionsService.getTopAccounts.mockResolvedValue(mockResult);

      const result = await controller.getTopAccounts(queryParams);

      expect(mockTransactionsService.getTopAccounts).toHaveBeenCalledWith(
        expectedServiceParams,
      );
      expect(result).toEqual(mockResult);
    });

    it('should return the result from the service', async () => {
      const mockResult: GetTopAccountsResponseDto = {
        message: 'success',
        data: [
          { address: '0x123', volume: '100', as: 'sender' },
          { address: '0x456', volume: '200', as: 'sender' },
        ],
      };
      mockTransactionsService.getTopAccounts.mockResolvedValue(mockResult);

      const queryParams: GetTopAccountsDto = { limit: 10, page: 1 };
      const result = await controller.getTopAccounts(queryParams);

      expect(result).toEqual(mockResult);
    });

    it('should handle errors from the service', async () => {
      mockTransactionsService.getTopAccounts.mockRejectedValue(
        new Error('Service failed'),
      );

      const queryParams: GetTopAccountsDto = { limit: 10, page: 1 };

      await expect(controller.getTopAccounts(queryParams)).rejects.toThrow(
        'Service failed',
      );
    });
  });

  describe('getTotalTransferred', () => {
    it('should call the service with the correct parameters', async () => {
      const queryParams: GetVolumeDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        address: '0x1234567890123456789012345678901234567890',
        as: 'sender',
      };

      const expectedServiceParams = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        address: '0x1234567890123456789012345678901234567890',
        as: 'sender',
      };

      const mockResult: GetVolumeResponseDto = {
        message: 'success',
        data: {
          address: '0x1234567890123456789012345678901234567890',
          volume: 1000,
          as: 'sender',
        },
      };

      mockTransactionsService.getTotalTransferred.mockResolvedValue(mockResult);

      const result = await controller.getTotalTransferred(queryParams);

      expect(mockTransactionsService.getTotalTransferred).toHaveBeenCalledWith(
        expectedServiceParams,
      );
      expect(result).toEqual(mockResult);
    });

    it('should return the result from the service', async () => {
      const mockResult: GetVolumeResponseDto = {
        message: 'success',
        data: {
          address: '0x123',
          volume: 100,
          as: 'recipient',
        },
      };
      mockTransactionsService.getTotalTransferred.mockResolvedValue(mockResult);

      const queryParams: GetVolumeDto = {};
      const result = await controller.getTotalTransferred(queryParams);

      expect(result).toEqual(mockResult);
    });

    it('should handle errors from the service', async () => {
      mockTransactionsService.getTotalTransferred.mockRejectedValue(
        new Error('Service failed'),
      );

      const queryParams: GetVolumeDto = {};

      await expect(controller.getTotalTransferred(queryParams)).rejects.toThrow(
        'Service failed',
      );
    });
  });

  describe('e2e tests with supertest', () => {
    beforeEach(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        controllers: [TransactionsController],
        providers: [
          {
            provide: TransactionsService,
            useValue: mockTransactionsService,
          },
        ],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.useGlobalPipes(new ValidationPipe({ transform: true }));
      await app.init();
    });

    describe('/topaccount e2etests ', () => {
      it('should return 200 OK with valid parameters', async () => {
        const mockResult: GetTopAccountsResponseDto = {
          message: 'success',
          data: [
            { address: '0x123', volume: '100', as: 'sender' },
            { address: '0x456', volume: '200', as: 'sender' },
          ],
        };
        mockTransactionsService.getTopAccounts.mockResolvedValue(mockResult);

        return request(app.getHttpServer())
          .get(
            '/transactions/top-accounts?limit=10&startDate=2024-01-01&endDate=2024-01-31&as=sender',
          )
          .expect(200)
          .expect(mockResult);
      });

      it('should return 400 BAD REQUEST with invalid startDate', async () => {
        return request(app.getHttpServer())
          .get(
            '/transactions/top-accounts?limit=10&startDate=invalid-date&endDate=2024-01-31&as=sender',
          )
          .expect(400);
      });

      it('should return 400 BAD REQUEST with invalid endDate', async () => {
        return request(app.getHttpServer())
          .get(
            '/transactions/top-accounts?limit=10&startDate=2024-01-01&endDate=invalid-date&as=sender',
          )
          .expect(400);
      });

      it('should return 400 BAD REQUEST with invalid limit (not an integer)', async () => {
        return request(app.getHttpServer())
          .get(
            '/transactions/top-accounts?limit=abc&startDate=2024-01-01&endDate=2024-01-31&as=sender',
          )
          .expect(400);
      });

      it('should return 400 BAD REQUEST with invalid "as" parameter', async () => {
        return request(app.getHttpServer())
          .get(
            '/transactions/top-accounts?limit=10&startDate=2024-01-01&endDate=2024-01-31&as=invalid',
          )
          .expect(400);
      });
    });

    describe('/volume tests', () => {
      it('should return 200 OK with valid parameters', async () => {
        const mockResult: GetVolumeResponseDto = {
          message: 'success',
          data: {
            address: '0x1234567890123456789012345678901234567890',
            volume: 1000,
            as: 'sender',
          },
        };
        mockTransactionsService.getTotalTransferred.mockResolvedValue(
          mockResult,
        );

        return request(app.getHttpServer())
          .get(
            '/transactions/volume?startDate=2024-01-01&endDate=2024-01-31&address=0x1234567890123456789012345678901234567890&as=sender',
          )
          .expect(200)
          .expect(mockResult);
      });

      it('should return 400 BAD REQUEST with invalid startDate', async () => {
        return request(app.getHttpServer())
          .get(
            '/transactions/volume?startDate=invalid-date&endDate=2024-01-31&address=0x1234567890123456789012345678901234567890&as=sender',
          )
          .expect(400);
      });

      it('should return 400 BAD REQUEST with invalid endDate', async () => {
        return request(app.getHttpServer())
          .get(
            '/transactions/volume?startDate=2024-01-01&endDate=invalid-date&address=0x1234567890123456789012345678901234567890&as=sender',
          )
          .expect(400);
      });

      it('should return 400 BAD REQUEST with invalid address', async () => {
        return request(app.getHttpServer())
          .get(
            '/transactions/volume?startDate=2024-01-01&endDate=2024-01-31&address=invalid-address&as=sender',
          )
          .expect(400);
      });

      it('should return 400 BAD REQUEST with invalid "as" parameter', async () => {
        return request(app.getHttpServer())
          .get(
            '/transactions/volume?startDate=2024-01-01&endDate=2024-01-31&address=0x1234567890123456789012345678901234567890&as=invalid',
          )
          .expect(400);
      });
    });

    afterEach(async () => {
      await app.close();
    });
  });
});
