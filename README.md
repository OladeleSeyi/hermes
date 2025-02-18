## Description

This project aims to solve the problem provided
[here](https://github.com/nestjs/nest) using the Nest framework (TypeScript starter) repository.

It can be found [here](https://github.com/OladeleSeyi/hermes) and youcan interact with it [here](https://hermes.seams.cc)

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod

# production worker mode
$ npm run start:worker
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Design And Architectural Decisions

### Primary Assumptions

The app is built assumung that in the initial stages of deployment, the app would be run and used by a small team (1 -3) engineers and handle less than 1000 reqs/min. This assumption is based off the idea that the first iteration would slowly garner attention and need to be scaled up. As such it is built as a monolith with directions on how it should be improved to a master (webserver)/ worker model - I personally like to allow an app grow into its requirements - overengineering cause more probelms that solutions. The data we are returning for analytics and summary is not required to be high fidelity data. As such the data is accurate to the past 3 minutes. We rely heavily on cached data. `We can offer a paid tier to users that want more accurate data` and cache the results of thier queries for free tier users.

Within the monolith is an Api, A blockchain listener and a Scheduler (Cron)

- The Listener listens to USDC `Transfer` transactions on the Avax C-chain. It saves the relevant data from the Transaction and moves along.

- The `task schedeler` periodically runs a couple of jobs

  - An analytics cronjob that runs every 3 minutes returns the summary of all tx on the chain (all time volumes, today's volumes, all time top spender and recipient; and today's top spender and recipient) and
  - A daily cronjob that computes all time data to the past day and caches it. The idea here is that all time analytics is stale and compute intensive so we can cache it and use the data from cache instead of pulliing all time stats every time.

- The Api has three endpoints `/volume`, `/top-accounts` and `/summary`. There is no authentication, we depend on rate limits to prevent abuse. You can find the documentation and a swagger interface at `/documentation`

  - `/volume`

  - GET `/top-accounts`

    ```
      Query Params
        limit:  number          //optional
        page:   number        //optional
        startDate?:  yyyy-mm-dd        //optional
        endDate?: yyyy-mm-dd          //optional
        as?:'sender' | 'recipient' | 'total      //optional
    ```

    ```Response

      {
        "data": [
          {
            "address": "string",
            "volume": "string",
            "as": "sender"
          }
        ],
        "message": "success",
        "metadata": {
          "limit": 10,
          "page": 1,
          "next": 2
        }
      }

    ```

  - GET `/summary`

  ```Response
    {
      "summary": {
        "volume": {
          "allTime": 0,
          "totalVolumeToday": 0
        },
        "topAccounts": {
          "allTime": {
            "topAccounts": [
              {
                "address": "string",
                "volume": "string",
                "as": "sender"
              }
            ],
            "topRecievers": [
              {
                "address": "string",
                "volume": "string",
                "as": "sender"
              }
            ],
            "topSenders": [
              {
                "address": "string",
                "volume": "string",
                "as": "sender"
              }
            ]
          },
          "today": {
            "topAccounts": [
              {
                "address": "string",
                "volume": "string",
                "as": "sender"
              }
            ],
            "topRecievers": [
              {
                "address": "string",
                "volume": "string",
                "as": "sender"
              }
            ],
            "topSenders": [
              {
                "address": "string",
                "volume": "string",
                "as": "sender"
              }
            ]
          }
        }
      }
    }

  ```

## Possible improvements

- As traffic and data grows and we would need a seperate process (worker) for the Blockchain Listener and CronJob worker. This is because we want to ensure that no single "module" is blocking or overloading the nodejs process.

- The database handles a chunk of the compute - preparing analysis and responsding to queries - as such its will be the first bottle neck. we might want to scale the databse to handle analysis from a given replica and constrain API queries to a seperate replica.

## Cost

This simple version of the app can be run handling ~ 2000 - 10000 req/min at about $54 on render.

- App $25
- DB $19 - this will grow to ~$75 in two months
- Redis $10

## Project setup

```bash
$ npm install
```

## Deployment

This project can be deployed to Render via Github.

The render configuration file comments out the deployment instructions because we do not need it atm.

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
