const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
module.exports = {
  dialect: 'postgres',
  url: process.env.DATABASE_URL,
  dialectOptions:
    process.env.NODE_ENV !== 'production'
      ? null
      : {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        },
};
