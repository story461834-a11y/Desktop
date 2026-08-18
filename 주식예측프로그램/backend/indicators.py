"""
기술적 지표 계산 모듈 (Technical Indicators Calculator)
RSI, MACD, 볼린저 밴드, 이동평균선(5/20/60/120), 스토캐스틱, ATR 등
"""

import pandas as pd
import numpy as np


def calculate_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    일봉 데이터프레임(OHLCV)을 받아 주요 보조지표를 계산하여 반환합니다.
    """
    if df.empty or len(df) < 30:
        return df

    df = df.copy()

    # 1. 이동평균선 (Simple Moving Averages)
    df["SMA5"] = df["Close"].rolling(window=5).mean()
    df["SMA20"] = df["Close"].rolling(window=20).mean()
    df["SMA60"] = df["Close"].rolling(window=60).mean()
    df["SMA120"] = df["Close"].rolling(window=120).mean()

    # 지수이동평균선 (Exponential Moving Averages)
    df["EMA12"] = df["Close"].ewm(span=12, adjust=False).mean()
    df["EMA26"] = df["Close"].ewm(span=26, adjust=False).mean()

    # 2. MACD (Moving Average Convergence Divergence)
    df["MACD"] = df["EMA12"] - df["EMA26"]
    df["MACD_Signal"] = df["MACD"].ewm(span=9, adjust=False).mean()
    df["MACD_Hist"] = df["MACD"] - df["MACD_Signal"]

    # 3. RSI (Relative Strength Index, 14일)
    delta = df["Close"].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / (loss + 1e-9)
    df["RSI"] = 100 - (100 / (1 + rs))

    # 4. 볼린저 밴드 (Bollinger Bands, 20일, 2-std)
    df["BB_Middle"] = df["SMA20"]
    bb_std = df["Close"].rolling(window=20).std()
    df["BB_Upper"] = df["BB_Middle"] + (bb_std * 2)
    df["BB_Lower"] = df["BB_Middle"] - (bb_std * 2)
    df["BB_Width"] = (df["BB_Upper"] - df["BB_Lower"]) / (df["BB_Middle"] + 1e-9)
    df["BB_Percent"] = (df["Close"] - df["BB_Lower"]) / (df["BB_Upper"] - df["BB_Lower"] + 1e-9)

    # 5. 스토캐스틱 슬로우 (Stochastic %K, %D)
    low14 = df["Low"].rolling(window=14).min()
    high14 = df["High"].rolling(window=14).max()
    fast_k = 100 * ((df["Close"] - low14) / (high14 - low14 + 1e-9))
    df["Stoch_K"] = fast_k.rolling(window=3).mean()
    df["Stoch_D"] = df["Stoch_K"].rolling(window=3).mean()

    # 6. ATR (Average True Range, 14일 변동성 지표)
    high_low = df["High"] - df["Low"]
    high_close_prev = (df["High"] - df["Close"].shift(1)).abs()
    low_close_prev = (df["Low"] - df["Close"].shift(1)).abs()
    tr = pd.concat([high_low, high_close_prev, low_close_prev], axis=1).max(axis=1)
    df["ATR"] = tr.rolling(window=14).mean()
    df["ATR_Ratio"] = (df["ATR"] / df["Close"]) * 100

    # 7. 거래량 지표 (Volume SMA & Ratio)
    df["Vol_SMA5"] = df["Volume"].rolling(window=5).mean()
    df["Vol_SMA20"] = df["Volume"].rolling(window=20).mean()
    df["Vol_Ratio"] = df["Volume"] / (df["Vol_SMA20"] + 1e-9)

    # 8. 일일 변동률 (%)
    df["Change_Pct"] = df["Close"].pct_change() * 100

    # NaN 채우기 (처음 구간)
    df = df.bfill().ffill()

    return df


if __name__ == "__main__":
    from collector import fetch_stock_data
    df = fetch_stock_data("005930.KS", period="3mo")
    df_ind = calculate_indicators(df)
    print(df_ind[["Date", "Close", "RSI", "MACD", "BB_Upper", "BB_Lower"]].tail())
