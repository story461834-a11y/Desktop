"""
전체 데이터 수집 및 AI 예측 실행 스크립트 (Pipeline Runner)
모든 대상 종목에 대해 데이터를 수집하고 예측을 수행한 후,
정적 웹사이트가 즉시 사용할 수 있도록 public/data/ 디렉토리에 JSON 파일로 저장합니다.
"""

import os
import json
import logging
from datetime import datetime
import pandas as pd

from collector import STOCKS_CONFIG, fetch_stock_data
from indicators import calculate_indicators
from predictor import predict_future_prices, calculate_ai_score_and_signals, calculate_backtest_accuracy

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "public", "data")
PREDICTIONS_DIR = os.path.join(DATA_DIR, "predictions")


def ensure_directories():
    """출력 데이터 디렉토리 생성"""
    os.makedirs(PREDICTIONS_DIR, exist_ok=True)


def run_pipeline():
    logging.info("🚀 AI 주식 예측 파이프라인 가동 시작...")
    ensure_directories()
    
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    summary_list = []
    
    # 1. stocks.json 저장
    stocks_metadata_path = os.path.join(DATA_DIR, "stocks.json")
    with open(stocks_metadata_path, "w", encoding="utf-8") as f:
        json.dump({
            "updated_at": now_str,
            "total_count": len(STOCKS_CONFIG),
            "stocks": STOCKS_CONFIG
        }, f, ensure_ascii=False, indent=2)
    logging.info(f"✅ stocks.json 저장 완료 ({len(STOCKS_CONFIG)}개 종목)")

    # 2. 각 종목별 데이터 수집 -> 지표 계산 -> AI 예측 수행
    for stock in STOCKS_CONFIG:
        ticker = stock["ticker"]
        code = stock["code"]
        name = stock["name"]
        currency = stock["currency"]
        market = stock["market"]
        
        logging.info(f"--- Processing {name} ({ticker}) ---")
        df_raw = fetch_stock_data(ticker, period="1y")
        
        if df_raw.empty or len(df_raw) < 40:
            logging.warning(f"⚠️ {name} ({ticker}) 데이터가 불충분하여 건너뜁니다.")
            continue
            
        # 보조지표 계산
        df_ind = calculate_indicators(df_raw)
        
        # AI 예측 및 투자 분석
        future_pred = predict_future_prices(df_ind, forecast_days=30)
        ai_analysis = calculate_ai_score_and_signals(df_ind)
        backtest = calculate_backtest_accuracy(df_ind)
        
        # 최근 120개 봉만 차트용으로 슬라이스 (웹 로딩 속도 최적화)
        chart_slice = df_ind.tail(120).copy()
        
        # 캔들스틱 및 차트 시리즈 데이터 구성
        candles = []
        for _, row in chart_slice.iterrows():
            candles.append({
                "date": row["Date"],
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
                "sma5": round(float(row["SMA5"]), 2) if not pd.isna(row["SMA5"]) else None,
                "sma20": round(float(row["SMA20"]), 2) if not pd.isna(row["SMA20"]) else None,
                "sma60": round(float(row["SMA60"]), 2) if not pd.isna(row["SMA60"]) else None,
                "sma120": round(float(row["SMA120"]), 2) if not pd.isna(row["SMA120"]) else None,
                "rsi": round(float(row["RSI"]), 2) if not pd.isna(row["RSI"]) else None,
                "macd": round(float(row["MACD"]), 2) if not pd.isna(row["MACD"]) else None,
                "macd_signal": round(float(row["MACD_Signal"]), 2) if not pd.isna(row["MACD_Signal"]) else None,
                "macd_hist": round(float(row["MACD_Hist"]), 2) if not pd.isna(row["MACD_Hist"]) else None,
                "bb_upper": round(float(row["BB_Upper"]), 2) if not pd.isna(row["BB_Upper"]) else None,
                "bb_middle": round(float(row["BB_Middle"]), 2) if not pd.isna(row["BB_Middle"]) else None,
                "bb_lower": round(float(row["BB_Lower"]), 2) if not pd.isna(row["BB_Lower"]) else None,
            })
            
        # 종목 상세 통계치
        latest_row = df_ind.iloc[-1]
        prev_row = df_ind.iloc[-2]
        current_price = float(latest_row["Close"])
        prev_price = float(prev_row["Close"])
        price_diff = current_price - prev_price
        change_pct = (price_diff / prev_price) * 100
        
        # 52주 최고/최저
        high_52w = float(df_ind["High"].tail(250).max())
        low_52w = float(df_ind["Low"].tail(250).min())
        
        # 7일 후 예상 주가 및 수익률
        pred_7d_price = future_pred["expected"][6] if len(future_pred["expected"]) > 6 else current_price
        pred_7d_pct = ((pred_7d_price - current_price) / current_price) * 100
        
        # 30일 후 예상 주가 및 수익률
        pred_30d_price = future_pred["expected"][-1] if len(future_pred["expected"]) > 0 else current_price
        pred_30d_pct = ((pred_30d_price - current_price) / current_price) * 100
        
        # 개별 종목 JSON 저장
        detail_data = {
            "meta": {
                **stock,
                "updated_at": now_str,
                "data_points": len(df_ind),
                "latest_date": latest_row["Date"]
            },
            "price_summary": {
                "current_price": round(current_price, 2),
                "prev_close": round(prev_price, 2),
                "diff": round(price_diff, 2),
                "change_pct": round(change_pct, 2),
                "volume": int(latest_row["Volume"]),
                "high_52w": round(high_52w, 2),
                "low_52w": round(low_52w, 2),
                "pred_7d_price": round(pred_7d_price, 2),
                "pred_7d_pct": round(pred_7d_pct, 2),
                "pred_30d_price": round(pred_30d_price, 2),
                "pred_30d_pct": round(pred_30d_pct, 2)
            },
            "ai_analysis": ai_analysis,
            "backtest": backtest,
            "future_forecast": future_pred,
            "chart_data": candles
        }
        
        detail_file_path = os.path.join(PREDICTIONS_DIR, f"{code}.json")
        with open(detail_file_path, "w", encoding="utf-8") as f:
            json.dump(detail_data, f, ensure_ascii=False, indent=2)
            
        # 요약 카드 리스트에 추가
        summary_list.append({
            "ticker": ticker,
            "code": code,
            "name": name,
            "market": market,
            "currency": currency,
            "category": stock["category"],
            "current_price": round(current_price, 2),
            "diff": round(price_diff, 2),
            "change_pct": round(change_pct, 2),
            "volume": int(latest_row["Volume"]),
            "ai_score": ai_analysis["score"],
            "signal": ai_analysis["signal"],
            "signal_ko": ai_analysis["signal_ko"],
            "pred_7d_pct": round(pred_7d_pct, 2),
            "pred_30d_pct": round(pred_30d_pct, 2),
            "rsi": round(float(latest_row["RSI"]), 1) if not pd.isna(latest_row["RSI"]) else None,
            "latest_date": latest_row["Date"]
        })
        
        logging.info(f"✅ [{name}] 예측 JSON 생성 완료 (AI 스코어: {ai_analysis['score']}점, 신호: {ai_analysis['signal_ko']})")

    # 3. latest_summary.json 저장
    summary_path = os.path.join(DATA_DIR, "latest_summary.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump({
            "updated_at": now_str,
            "market_stats": {
                "total_analyzed": len(summary_list),
                "bullish_count": len([s for s in summary_list if s["ai_score"] >= 65]),
                "neutral_count": len([s for s in summary_list if 45 <= s["ai_score"] < 65]),
                "bearish_count": len([s for s in summary_list if s["ai_score"] < 45])
            },
            "stocks": summary_list
        }, f, ensure_ascii=False, indent=2)
        
    logging.info(f"🎉 모든 주식 데이터 수집 및 AI 예측 완료! ({len(summary_list)}개 종목 요약 저장됨)")


if __name__ == "__main__":
    run_pipeline()
