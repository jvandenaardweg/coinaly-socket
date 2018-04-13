# Cryptocurrency Tickers Websocket
Cryptocurrency exchange tickers streamed over websockets of all supported exchanges in the CCXT library.

Using the CCXT library and available exchange websockets to create streaming exchange data that uses the CCXT data model. So it can be used in other parts of your application that use CCXT.

When an exchange has no websocket itself, or that websocket just lacks data, it will fallback to polling the tickers using the “fetchTickers” method build in CCXT and by providing a configurable interval. The script will respect the API’s rate limiting by using the build in rate limiter of CCXT.

The script is split up in several workers. Each exchange has a worker. When errors occur a worker will automatically try to fix it, or else notify you in a specified Slack channel.

The websocket data will automatically be transformed by de data model used by CCXT. How this works can be found in ``

The solution is split up in 2 processes: one for the workers, one for the websocket. Both need to run for this script to work.

Note: Supports all exchanges supported by CCXT that have a “fetchTickers” method.

## How to run?
1. Start the websocket: `npm start`
2. Then start the exchange workers: `npm run start:workers`
3. Websocket is available at `http://localhost:3000/socketcluster`
4. Subscribe to exchange data changes by using channel: `tickers--EXCHANGE`, like: `tickers--binance`

## Why did we create this?
I needed a way to get exchange tickers data from multiple exchanges but not flood the exchange API's. Some exchanges provide websockets, others don't. CCXT already has a unified way to talk with cryptocurrency exchanges. We use that structure to transform available exchange websocket tickers to the CCXT data model. So it can be used in other parts of your application that use CCXT.
If an exchange has no websocket available, but CCXT has a "fetchTickers" method for that exchange, we use that and stream the results over websockets. So the exchange API does not get flooded with requests.

## What are the unique features of this?
- Data is unified leading the CCXT architecture. A consistent data model through all websocket streams.
- Ability to get all market ticker changes on an exchange, not just one.
- Provides a websocket for exchanges that don't have a websocket and/or lack information in their websocket streams.
- Market data is steamed over Websockets and stored in Redis. So you can also build upon this data in different ways.
- Internally falls back to polling the API if an exchange has no websocket, respecting the API rate limitations.
- If the Websocket data lacks information, we enrich it with the data we get from "fetchTickers".

Thanks:
CCXT
All exchanges
