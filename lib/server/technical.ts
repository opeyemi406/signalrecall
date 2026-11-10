import type { Candle } from "@/lib/types";

export interface TechnicalIndicators {
  rsi: {
    value: number;
    interpretation: string;
  };
  ema: {
    ema9: number;
    ema20: number;
    ema50: number;
    trend: string;
    alignment: "BULLISH" | "BEARISH" | "NEUTRAL";
  };
  macd: {
    macd: number;
    signal: number;
    histogram: number;
    signalCross: "BULLISH_CROSS" | "BEARISH_CROSS" | "NEUTRAL";
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    bandwidthPercent: number;
    status: string;
  };
  levels: {
    majorSupport: number;
    majorResistance: number;
    swingLow: number;
    swingHigh: number;
  };
  atr: number;
  latestPrice: number;
}

export function calculateRSI(closes: number[], period = 14): number {
  if (closes.length <= period) return 50;

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return +(100 - 100 / (1 + rs)).toFixed(1);
}

export function calculateEMA(data: number[], period: number): number[] {
  if (data.length === 0) return [];
  const k = 2 / (period + 1);
  const ema = [data[0]];
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

export function calculateMACD(
  closes: number[],
  fast = 12,
  slow = 26,
  signal = 9
): { macd: number; signal: number; histogram: number } {
  if (closes.length < slow) {
    return { macd: 0, signal: 0, histogram: 0 };
  }
  const emaFast = calculateEMA(closes, fast);
  const emaSlow = calculateEMA(closes, slow);
  const macdLine = emaFast.map((val, i) => val - emaSlow[i]);
  const signalLine = calculateEMA(macdLine.slice(slow - 1), signal);

  const lastMacd = macdLine[macdLine.length - 1] || 0;
  const lastSignal = signalLine[signalLine.length - 1] || 0;
  return {
    macd: +lastMacd.toFixed(2),
    signal: +lastSignal.toFixed(2),
    histogram: +(lastMacd - lastSignal).toFixed(2),
  };
}

export function calculateBollingerBands(
  closes: number[],
  period = 20,
  stdDevMultiplier = 2
): { upper: number; middle: number; lower: number; bandwidth: number } {
  if (closes.length < period) {
    const last = closes[closes.length - 1] || 0;
    return { upper: last * 1.02, middle: last, lower: last * 0.98, bandwidth: 4 };
  }

  const slice = closes.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + Math.pow(b - middle, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  const upper = middle + stdDevMultiplier * stdDev;
  const lower = middle - stdDevMultiplier * stdDev;
  const bandwidth = middle > 0 ? +(((upper - lower) / middle) * 100).toFixed(2) : 0;

  return {
    upper: +upper.toFixed(2),
    middle: +middle.toFixed(2),
    lower: +lower.toFixed(2),
    bandwidth,
  };
}

export function calculateATR(candles: Candle[], period = 14): number {
  if (candles.length < 2) return 0;
  const trs: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i - 1];
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prev.close),
      Math.abs(current.low - prev.close)
    );
    trs.push(tr);
  }

  const slice = trs.slice(-period);
  const atr = slice.reduce((a, b) => a + b, 0) / (slice.length || 1);
  return +atr.toFixed(2);
}

export function calculateSupportResistance(candles: Candle[]): {
  majorSupport: number;
  majorResistance: number;
  swingLow: number;
  swingHigh: number;
} {
  if (candles.length === 0) {
    return { majorSupport: 0, majorResistance: 0, swingLow: 0, swingHigh: 0 };
  }

  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const closes = candles.map((c) => c.close);
  const latestClose = closes[closes.length - 1];

  const swingHigh = Math.max(...highs);
  const swingLow = Math.min(...lows);

  // Approximate nearest resistance above price and support below price
  const above = highs.filter((h) => h > latestClose);
  const below = lows.filter((l) => l < latestClose);

  const majorResistance = above.length > 0 ? Math.min(...above) : +(latestClose * 1.04).toFixed(2);
  const majorSupport = below.length > 0 ? Math.max(...below) : +(latestClose * 0.96).toFixed(2);

  return {
    majorSupport: +majorSupport.toFixed(2),
    majorResistance: +majorResistance.toFixed(2),
    swingLow: +swingLow.toFixed(2),
    swingHigh: +swingHigh.toFixed(2),
  };
}

export function analyzeCandleSeries(candles: Candle[]): TechnicalIndicators {
  if (!candles || candles.length === 0) {
    throw new Error("Cannot analyze empty candle series.");
  }

  const closes = candles.map((c) => c.close);
  const latestPrice = closes[closes.length - 1];

  // 1. RSI
  const rsiVal = calculateRSI(closes, 14);
  let rsiInterpretation = "Neutral Zone (40–60)";
  if (rsiVal >= 70) rsiInterpretation = "Overbought Exhaustion (>70)";
  else if (rsiVal >= 55) rsiInterpretation = "Bullish Momentum (55–70)";
  else if (rsiVal <= 30) rsiInterpretation = "Oversold Absorption (<30)";
  else if (rsiVal <= 45) rsiInterpretation = "Bearish Weakness (30–45)";

  // 2. EMA 9, 20, 50
  const ema9Series = calculateEMA(closes, 9);
  const ema20Series = calculateEMA(closes, 20);
  const ema50Series = calculateEMA(closes, 50);

  const ema9 = +(ema9Series[ema9Series.length - 1] || latestPrice).toFixed(2);
  const ema20 = +(ema20Series[ema20Series.length - 1] || latestPrice).toFixed(2);
  const ema50 = +(ema50Series[ema50Series.length - 1] || latestPrice).toFixed(2);

  let emaAlignment: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
  let emaTrend = "Neutral / Sideways Choppiness";

  if (latestPrice > ema20 && ema20 >= ema50) {
    emaAlignment = "BULLISH";
    emaTrend = "Bullish Uptrend (Price > EMA 20 > EMA 50)";
  } else if (latestPrice < ema20 && ema20 <= ema50) {
    emaAlignment = "BEARISH";
    emaTrend = "Bearish Downtrend (Price < EMA 20 < EMA 50)";
  } else if (latestPrice > ema20) {
    emaAlignment = "BULLISH";
    emaTrend = "Testing Above 20 EMA";
  } else if (latestPrice < ema20) {
    emaAlignment = "BEARISH";
    emaTrend = "Testing Below 20 EMA";
  }

  // 3. MACD
  const macdData = calculateMACD(closes);
  let macdSignal: "BULLISH_CROSS" | "BEARISH_CROSS" | "NEUTRAL" = "NEUTRAL";
  if (macdData.histogram > 0 && macdData.macd > macdData.signal) {
    macdSignal = "BULLISH_CROSS";
  } else if (macdData.histogram < 0 && macdData.macd < macdData.signal) {
    macdSignal = "BEARISH_CROSS";
  }

  // 4. Bollinger Bands
  const bb = calculateBollingerBands(closes, 20, 2);
  let bbStatus = "Mid-Band Equilibrium";
  if (latestPrice >= bb.upper) bbStatus = "Touching Upper Band (Expansion/Overextended)";
  else if (latestPrice <= bb.lower) bbStatus = "Touching Lower Band (Support Sweep)";
  else if (bb.bandwidth < 3.5) bbStatus = "Volatility Squeeze (Breakout Imminent)";

  // 5. Support / Resistance & ATR
  const levels = calculateSupportResistance(candles);
  const atr = calculateATR(candles, 14);

  return {
    rsi: {
      value: rsiVal,
      interpretation: rsiInterpretation,
    },
    ema: {
      ema9,
      ema20,
      ema50,
      trend: emaTrend,
      alignment: emaAlignment,
    },
    macd: {
      ...macdData,
      signalCross: macdSignal,
    },
    bollingerBands: {
      ...bb,
      status: bbStatus,
      bandwidthPercent: bb.bandwidth,
    },
    levels,
    atr,
    latestPrice,
  };
}
