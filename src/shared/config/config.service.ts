import { Injectable } from '@nestjs/common';
import { config } from 'config/config';

@Injectable()
export class ConfigService {
  get sequelizeOrmConfig() {
    return config.database;
  }
}
