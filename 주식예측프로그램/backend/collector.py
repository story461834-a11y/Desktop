"""
주식 데이터 수집기 (Stock Data Collector) - 미국 주식 전용 (US Equities Only)
yfinance를 사용하여 미국 대표 빅테크 및 AI/반도체/성장주 데이터를 수집합니다.
비용: 0원 (완전 무료)
"""

import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# 미국 대표 핵심 종목 리스트 (AI/반도체, 빅테크, 플랫폼, 성장주)
STOCKS_CONFIG = [
    {"ticker": "NVDA", "code": "NVDA", "name": "엔비디아 (NVIDIA)", "market": "NASDAQ", "currency": "USD", "category": "AI / GPU"},
    {"ticker": "AAPL", "code": "AAPL", "name": "애플 (Apple)", "market": "NASDAQ", "currency": "USD", "category": "빅테크 / 모바일"},
    {"ticker": "TSLA", "code": "TSLA", "name": "테슬라 (Tesla)", "market": "NASDAQ", "currency": "USD", "category": "전기차 / AI"},
    {"ticker": "MSFT", "code": "MSFT", "name": "마이크로소프트", "market": "NASDAQ", "currency": "USD", "category": "클라우드 / AI"},
    {"ticker": "GOOGL", "code": "GOOGL", "name": "알파벳 (Google)", "market": "NASDAQ", "currency": "USD", "category": "검색 / AI"},
    {"ticker": "AMZN", "code": "AMZN", "name": "아마존 (Amazon)", "market": "NASDAQ", "currency": "USD", "category": "이커머스 / 클라우드"},
    {"ticker": "META", "code": "META", "name": "메타 (Meta)", "market": "NASDAQ", "currency": "USD", "category": "SNS / 메타버스"},
    {"ticker": "TSM", "code": "TSM", "name": "TSMC", "market": "NYSE", "currency": "USD", "category": "반도체 파운드리"},
    {"ticker": "AMD", "code": "AMD", "name": "AMD", "market": "NASDAQ", "currency": "USD", "category": "CPU / GPU"},
    {"ticker": "AVGO", "code": "AVGO", "name": "브로드컴 (Broadcom)", "market": "NASDAQ", "currency": "USD", "category": "통신 / 반도체"},
    {"ticker": "PLTR", "code": "PLTR", "name": "팔란티어 (Palantir)", "market": "NYSE", "currency": "USD", "category": "AI 빅데이터"},
    {"ticker": "NFLX", "code": "NFLX", "name": "넷플릭스 (Netflix)", "market": "NASDAQ", "currency": "USD", "category": "엔터 / OTT"},
    {"ticker": "COIN", "code": "COIN", "name": "코인베이스 (Coinbase)", "market": "NASDAQ", "currency": "USD", "category": "가상자산 / 핀테크"},
    {"ticker": "QQQ", "code": "QQQ", "name": "나스닥100 ETF (Invesco)", "market": "NASDAQ", "currency": "USD", "category": "대표 지수 ETF"},
    {"ticker": "SPY", "code": "SPY", "name": "S&P 500 ETF (SPDR)", "market": "NYSE", "currency": "USD", "category": "시장 대표 ETF"}
]


def fetch_stock_data(ticker_symbol: str, period: str = "2y") -> pd.DataFrame:
    """
    미국 주식 일봉 OHLCV 데이터를 수집합니다.
    """
    logging.info(f"[{ticker_symbol}] 미국 주가 데이터 다운로드 (기간: {period})...")
    try:
        ticker = yf.Ticker(ticker_symbol)
        df = ticker.history(period=period, interval="1d", auto_adjust=False)
        
        if df.empty:
            logging.warning(f"[{ticker_symbol}] 데이터를 가져오지 못했습니다.")
            return pd.DataFrame()
            
        df = df.reset_index()
        if "Date" in df.columns:
            df["Date"] = pd.to_datetime(df["Date"]).dt.strftime("%Y-%m-%d")
        
        cols = ["Date", "Open", "High", "Low", "Close", "Volume"]
        available_cols = [c for c in cols if c in df.columns]
        df = df[available_cols].copy()
        
        df = df.dropna().sort_values("Date").reset_index(drop=True)
        logging.info(f"[{ticker_symbol}] {len(df)}개 일봉 수집 완료 (최신일: {df['Date'].iloc[-1]})")
        return df
    except Exception as e:
        logging.error(f"[{ticker_symbol}] 데이터 수집 실패: {e}")
        return pd.DataFrame()


if __name__ == "__main__":
    df = fetch_stock_data("NVDA", period="1mo")
    print(df.tail())
