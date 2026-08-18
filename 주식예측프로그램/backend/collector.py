"""
주식 데이터 수집기 (Stock Data Collector)
yfinance를 사용하여 한국(코스피/코스닥) 및 미국 주요 종목 주가 데이터를 수집합니다.
비용: 0원 (완전 무료)
"""

import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import time
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# 지원 종목 정의 (한국 및 미국 대표 우량주 & 지수)
STOCKS_CONFIG = [
    # 국내 대형주
    {"ticker": "005930.KS", "code": "005930", "name": "삼성전자", "market": "KOSPI", "currency": "KRW", "category": "반도체/IT"},
    {"ticker": "000660.KS", "code": "000660", "name": "SK하이닉스", "market": "KOSPI", "currency": "KRW", "category": "반도체/IT"},
    {"ticker": "005380.KS", "code": "005380", "name": "현대차", "market": "KOSPI", "currency": "KRW", "category": "자동차/모빌리티"},
    {"ticker": "035420.KS", "code": "035420", "name": "NAVER", "market": "KOSPI", "currency": "KRW", "category": "인터넷/플랫폼"},
    {"ticker": "035720.KS", "code": "035720", "name": "카카오", "market": "KOSPI", "currency": "KRW", "category": "인터넷/플랫폼"},
    {"ticker": "068270.KS", "code": "068270", "name": "셀트리온", "market": "KOSPI", "currency": "KRW", "category": "바이오/제약"},
    {"ticker": "005490.KS", "code": "005490", "name": "POSCO홀딩스", "market": "KOSPI", "currency": "KRW", "category": "2차전지/철강"},
    {"ticker": "373220.KS", "code": "373220", "name": "LG에너지솔루션", "market": "KOSPI", "currency": "KRW", "category": "2차전지"},
    {"ticker": "247540.KQ", "code": "247540", "name": "에코프로비엠", "market": "KOSDAQ", "currency": "KRW", "category": "2차전지"},
    {"ticker": "196170.KQ", "code": "196170", "name": "알테오젠", "market": "KOSDAQ", "currency": "KRW", "category": "바이오"},
    
    # 미국 빅테크 & 글로벌 대표주
    {"ticker": "NVDA", "code": "NVDA", "name": "엔비디아 (NVIDIA)", "market": "NASDAQ", "currency": "USD", "category": "AI/반도체"},
    {"ticker": "AAPL", "code": "AAPL", "name": "애플 (Apple)", "market": "NASDAQ", "currency": "USD", "category": "빅테크/하드웨어"},
    {"ticker": "TSLA", "code": "TSLA", "name": "테슬라 (Tesla)", "market": "NASDAQ", "currency": "USD", "category": "전기차/AI"},
    {"ticker": "MSFT", "code": "MSFT", "name": "마이크로소프트", "market": "NASDAQ", "currency": "USD", "category": "소프트웨어/클라우드"},
    {"ticker": "GOOGL", "code": "GOOGL", "name": "알파벳 (Google)", "market": "NASDAQ", "currency": "USD", "category": "인터넷/AI"},
    {"ticker": "AMZN", "code": "AMZN", "name": "아마존 (Amazon)", "market": "NASDAQ", "currency": "USD", "category": "이커머스/클라우드"},
    {"ticker": "META", "code": "META", "name": "메타 (Meta)", "market": "NASDAQ", "currency": "USD", "category": "소셜/AI"},
    {"ticker": "TSM", "code": "TSM", "name": "TSMC", "market": "NYSE", "currency": "USD", "category": "반도체 파운드리"}
]


def fetch_stock_data(ticker_symbol: str, period: str = "2y") -> pd.DataFrame:
    """
    지정된 종목의 일봉 OHLCV 데이터를 수집합니다.
    """
    logging.info(f"[{ticker_symbol}] 주가 데이터 다운로드 시작 (기간: {period})...")
    try:
        ticker = yf.Ticker(ticker_symbol)
        df = ticker.history(period=period, interval="1d", auto_adjust=False)
        
        if df.empty:
            logging.warning(f"[{ticker_symbol}] 데이터를 가져오지 못했습니다. 빈 데이터프레임 반환.")
            return pd.DataFrame()
            
        # 열 정리 (Adj Close, Close, High, Low, Open, Volume)
        df = df.reset_index()
        # Date를 YYYY-MM-DD 문자열로 변환
        if "Date" in df.columns:
            df["Date"] = pd.to_datetime(df["Date"]).dt.strftime("%Y-%m-%d")
        
        # 필수 컬럼만 유지
        cols = ["Date", "Open", "High", "Low", "Close", "Volume"]
        available_cols = [c for c in cols if c in df.columns]
        df = df[available_cols].copy()
        
        # 결측치 정제
        df = df.dropna().sort_values("Date").reset_index(drop=True)
        
        logging.info(f"[{ticker_symbol}] {len(df)}개 일봉 데이터 수집 완료 (최신일: {df['Date'].iloc[-1] if len(df) > 0 else 'N/A'})")
        return df
    except Exception as e:
        logging.error(f"[{ticker_symbol}] 데이터 수집 실패: {e}")
        return pd.DataFrame()


if __name__ == "__main__":
    # 테스트 실행
    sample_df = fetch_stock_data("005930.KS", period="1mo")
    print(sample_df.tail())
