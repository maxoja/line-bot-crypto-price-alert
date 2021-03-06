const CoinGecko = require('coingecko-api');
const ta = require('technicalindicators');
const settings = require('./settings')
const CoinGeckoClient = new CoinGecko();

function shrinkToHourlyData(timePoints, pricePoints) {
  return timePoints.reduce((acc, t, i) => {
    if (!acc[0].length) {
      return [[t], [pricePoints[i]]]
    } else {
      const firstTime = acc[0][0]
      const diffTime = firstTime - t
      const expectedDiff = acc[0].length * 60 * 60 * 1000
      if (diffTime >= expectedDiff) {
        acc[0].push(t)
        acc[1].push(pricePoints[i])
      }
      return acc
    }
  }, [[], []])
}

async function evaluateMarket(coinSettings) {
  const { DROP_THRESH, RSI_THRESH, RSI_PERIOD } = coinSettings
  let result = await CoinGeckoClient.coins.fetchMarketChart(coinSettings.id, {
    days: settings.windowSizeInDays,
    vs_currency: 'usd'
  });
  const numDataPoints = result.data.prices.length
  console.log('.. Retrieve', numDataPoints, 'data points')
  const pricePoints = result.data.prices.map(point => point[1]).reverse()
  const timePoints = result.data.prices.map(point => new Date(point[0])).reverse()
  console.log('.. Begin Time', timePoints[0])
  console.log('.. Endin Time', timePoints[numDataPoints - 1])
  const latest = pricePoints[0]
  const highest = Math.max(...pricePoints)
  const lowest = Math.min(...pricePoints)
  const [shrinkTime, shrinkPrices] = shrinkToHourlyData(timePoints, pricePoints)
  const lowestShrink = Math.min(...shrinkPrices)
  const rsiPoints = ta.RSI.calculate({ period: RSI_PERIOD, values: shrinkPrices.reverse() }).reverse()
  const rsi = rsiPoints[0]
  const percent = latest / highest

  const currentlyOnMinima = lowestShrink == latest
  const bearish = percent <= DROP_THRESH
  const belowRsiThresh = rsi <= RSI_THRESH
  console.log('.. Before check rules')
  console.log('.. RSI', rsi, 'PERCENT', percent)
  console.log('.. Current', latest, 'Lowest', lowestShrink)
  if (false || ((currentlyOnMinima) && bearish && belowRsiThresh)) {
    console.log('.. The market pass all criterias')
    console.log('.. Returning result')
    return {
      highest,
      lowest,
      percent,
      rsi,
      latest,
      time: timePoints[0]
    }
  }
  console.log('.. The market does not pass all criterias')
  console.log('.. Returning false')
  console.log('... On minima', currentlyOnMinima)
  console.log('... Bearish trend', bearish)
  console.log('... RSI below thresh', belowRsiThresh)
  return false
};

module.exports = {
  evaluateMarket
}
