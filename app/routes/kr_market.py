import csv
import glob
import json
import os
import re
import time
from datetime import datetime
from functools import wraps

import requests
from bs4 import BeautifulSoup
import yfinance as yf
from flask import Blueprint, Response, jsonify, request

from app.utils.price_cache import PriceCache

kr_bp = Blueprint('kr', __name__)

_cache = {}


def _cached_response(ttl_seconds=300):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            key = f"{fn.__name__}:{request.full_path}"
            now = time.time()
            if key in _cache:
                data, expires_at = _cache[key]
                if now < expires_at:
                    return data
            result = fn(*args, **kwargs)
            _cache[key] = (result, now + ttl_seconds)
            return result
        return wrapper
    return decorator


DATA_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'data')


@kr_bp.route('/health')
def health():
    return jsonify({"status": "ok"})


@kr_bp.route('/signals')
@_cached_response(ttl_seconds=300)
def signals():
    try:
        filepath = os.path.join(DATA_DIR, 'jongga_v2_latest.json')

        if not os.path.exists(filepath):
            return jsonify({"signals": [], "count": 0, "message": "시그널 데이터가 없습니다."})

        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        signal_list = data.get('signals', [])
        signal_list.sort(key=lambda s: s.get('score', {}).get('total', 0) if isinstance(s.get('score'), dict) else s.get('score', 0), reverse=True)

        return jsonify({
            "signals": signal_list,
            "count": len(signal_list),
            "generated_at": data.get("date", ""),
            "source": "json_live",
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


def _find_latest_results_file():
    """jongga_v2_results_*.json 중 최신 파일 경로를 반환."""
    pattern = os.path.join(DATA_DIR, 'jongga_v2_results_*.json')
    files = glob.glob(pattern)
    if not files:
        return None
    files.sort(reverse=True)
    return files[0]


def _extract_dates_from_results():
    """jongga_v2_results_*.json 파일명에서 날짜를 추출하여 최신순 반환."""
    pattern = os.path.join(DATA_DIR, 'jongga_v2_results_*.json')
    files = glob.glob(pattern)
    dates = []
    for f in files:
        m = re.search(r'jongga_v2_results_(\d{8})\.json$', f)
        if m:
            dates.append(m.group(1))
    dates.sort(reverse=True)
    return dates


@kr_bp.route('/jongga-v2/latest')
@_cached_response(ttl_seconds=300)
def jongga_v2_latest():
    try:
        filepath = os.path.join(DATA_DIR, 'jongga_v2_latest.json')

        if not os.path.exists(filepath):
            filepath = _find_latest_results_file()

        if not filepath:
            return jsonify({"signals": [], "message": "No data"})

        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        return jsonify(data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@kr_bp.route('/jongga-v2/dates')
@_cached_response(ttl_seconds=300)
def jongga_v2_dates():
    try:
        dates = _extract_dates_from_results()
        return jsonify({"dates": dates, "count": len(dates)})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@kr_bp.route('/jongga-v2/history/<date_str>')
@_cached_response(ttl_seconds=300)
def jongga_v2_history(date_str):
    try:
        if not re.match(r'^\d{8}$', date_str):
            return jsonify({"error": "Invalid date format. Use YYYYMMDD."}), 400

        filepath = os.path.join(DATA_DIR, f'jongga_v2_results_{date_str}.json')

        if not os.path.exists(filepath):
            return jsonify({"error": f"No data for date {date_str}"}), 404

        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        return jsonify(data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── market-gate helpers ──────────────────────────────────────────

_NAVER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
}


def _parse_int(val):
    try:
        return int(str(val).replace(",", ""))
    except (ValueError, TypeError):
        return 0


def _fetch_chart_closes(code, days=220):
    """네이버 금융에서 일봉 종가 리스트를 가져온다 (날짜 오름차순)."""
    base_url = f"https://finance.naver.com/item/sise_day.naver?code={code}"
    headers = {**_NAVER_HEADERS, "Referer": base_url}
    rows = []
    page = 1

    while len(rows) < days:
        resp = requests.get(f"{base_url}&page={page}", headers=headers, timeout=5)
        resp.encoding = "euc-kr"
        soup = BeautifulSoup(resp.text, "html.parser")
        table = soup.find("table", class_="type2")
        if not table:
            break

        found = False
        for tr in table.find_all("tr"):
            cols = tr.find_all("td")
            if len(cols) < 7:
                continue
            date_text = cols[0].get_text(strip=True)
            if not date_text:
                continue
            found = True
            rows.append({
                "date": date_text,
                "close": _parse_int(cols[1].get_text()),
            })
            if len(rows) >= days:
                break

        if not found:
            break
        page += 1
        time.sleep(0.15)

    rows.reverse()
    return rows


def _calc_ma(closes, window):
    """종가 리스트에서 이동평균 계산."""
    if len(closes) < window:
        return None
    return round(sum(closes[-window:]) / window)


def _fetch_sector_changes():
    """네이버 증권 업종별 시세에서 섹터 등락률을 가져온다."""
    url = "https://finance.naver.com/sise/sise_group.naver?type=upjong"
    resp = requests.get(url, headers=_NAVER_HEADERS, timeout=5)
    resp.encoding = "euc-kr"
    soup = BeautifulSoup(resp.text, "html.parser")

    sectors = []
    table = soup.find("table", class_="type_1")
    if not table:
        return sectors

    for tr in table.find_all("tr"):
        cols = tr.find_all("td")
        if len(cols) < 2:
            continue
        a_tag = cols[0].find("a")
        if not a_tag:
            continue
        name = a_tag.get_text(strip=True)
        if not name:
            continue
        change_text = cols[1].get_text(strip=True).replace("%", "")
        try:
            change_pct = float(change_text)
        except ValueError:
            change_pct = 0.0
        sectors.append({"name": name, "change_pct": change_pct})

    sectors.sort(key=lambda s: s["change_pct"], reverse=True)
    return sectors


# ── market-gate endpoint ─────────────────────────────────────────

@kr_bp.route('/market-gate')
@_cached_response(ttl_seconds=300)
def market_gate():
    try:
        # 1. KODEX 200 일봉 데이터 (MA200 계산을 위해 220일)
        rows = _fetch_chart_closes("069500", days=220)
        if not rows:
            return jsonify({"error": "Failed to fetch KODEX 200 data"}), 502

        closes = [r["close"] for r in rows]
        current_price = closes[-1]

        # 2. MA 계산
        ma20 = _calc_ma(closes, 20)
        ma50 = _calc_ma(closes, 50)
        ma200 = _calc_ma(closes, 200)

        # 3. 시장 상태 판단
        if ma200 is None or ma50 is None or ma20 is None:
            regime = "UNKNOWN"
        elif current_price > ma200 and ma20 > ma50:
            regime = "RISK_ON"
        elif current_price < ma200 and ma20 < ma50:
            regime = "RISK_OFF"
        else:
            regime = "NEUTRAL"

        # 4. 섹터별 등락률
        sectors = _fetch_sector_changes()

        return jsonify({
            "date": rows[-1]["date"],
            "kodex200": {
                "code": "069500",
                "price": current_price,
                "ma20": ma20,
                "ma50": ma50,
                "ma200": ma200,
            },
            "regime": regime,
            "regime_detail": {
                "price_above_ma200": current_price > ma200 if ma200 else None,
                "ma20_above_ma50": ma20 > ma50 if (ma20 and ma50) else None,
            },
            "sectors": sectors,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── realtime price helpers ───────────────────────────────────────

def _yfinance_suffix(code: str) -> str:
    """한국 종목코드를 yfinance 티커로 변환 (e.g. 005930 → 005930.KS)."""
    return f"{code}.KS"


def _fetch_yfinance_fallback(tickers: list[str]) -> dict[str, dict]:
    """캐시 미스 ticker들을 yfinance로 조회하여 PriceCache에 저장 후 반환."""
    if not tickers:
        return {}

    yf_symbols = [_yfinance_suffix(t) for t in tickers]
    result = {}

    try:
        data = yf.download(
            yf_symbols,
            period="1d",
            group_by="ticker",
            progress=False,
            threads=True,
        )

        for ticker, yf_sym in zip(tickers, yf_symbols):
            try:
                if len(yf_symbols) == 1:
                    row = data
                else:
                    row = data[yf_sym]

                if row.empty:
                    continue

                last = row.iloc[-1]
                close = float(last["Close"])
                prev_close = float(last["Open"])
                change_pct = round((close - prev_close) / prev_close * 100, 2) if prev_close else 0.0
                volume = int(last["Volume"])

                result[ticker.upper()] = {
                    "price": close,
                    "change_pct": change_pct,
                    "volume": volume,
                }
            except (KeyError, IndexError):
                continue
    except Exception:
        pass

    if result:
        cache = PriceCache.get_instance()
        cache.bulk_update(result)

    return result


# ── realtime price endpoints ─────────────────────────────────────

@kr_bp.route('/realtime-prices', methods=['POST'])
def realtime_prices():
    body = request.get_json(silent=True) or {}
    tickers = body.get("tickers", [])

    if not tickers or not isinstance(tickers, list):
        return jsonify({"error": "tickers list is required"}), 400

    cache = PriceCache.get_instance()
    cached = cache.get_prices(tickers)

    missing = [t for t in tickers if t.upper() not in cached]

    if missing:
        fallback = _fetch_yfinance_fallback(missing)
        cached.update(fallback)

    return jsonify({
        "prices": cached,
        "version": cache.get_version(),
    })


@kr_bp.route('/price-stream')
def price_stream():
    tickers_param = request.args.get("tickers", "")
    tickers = [t.strip() for t in tickers_param.split(",") if t.strip()] or None

    def generate():
        cache = PriceCache.get_instance()
        last_version = -1

        while True:
            current_version = cache.get_version()

            if current_version != last_version:
                prices = cache.get_prices(tickers)
                payload = json.dumps({
                    "prices": prices,
                    "version": current_version,
                })
                yield f"data: {payload}\n\n"
                last_version = current_version

            time.sleep(5)

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── VCP cumulative performance ───────────────────────────────────

VCP_SIGNALS_PATH = os.path.join(DATA_DIR, 'vcp_signals.json')


@kr_bp.route('/vcp-cumulative')
@_cached_response(ttl_seconds=120)
def vcp_cumulative():
    try:
        if not os.path.exists(VCP_SIGNALS_PATH):
            return jsonify({"stats": {
                "total": 0, "closed": 0, "open": 0,
                "win_rate": 0.0, "avg_return": 0.0,
                "grade_stats": {},
            }, "message": "vcp_signals.json not found"})

        with open(VCP_SIGNALS_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)

        signals = data.get('signals', [])

        open_signals = [s for s in signals if s.get('status', 'OPEN').upper() == 'OPEN']
        closed_signals = [s for s in signals if s.get('status', '').upper() == 'CLOSED']

        # overall closed stats
        wins = [s for s in closed_signals if float(s.get('return_pct', 0)) > 0]
        win_rate = round(len(wins) / len(closed_signals) * 100, 2) if closed_signals else 0.0
        avg_return = (
            round(sum(float(s.get('return_pct', 0)) for s in closed_signals) / len(closed_signals), 2)
            if closed_signals else 0.0
        )

        # grade-level stats
        grade_map: dict[str, list] = {}
        for s in closed_signals:
            grade = s.get('grade', 'N/A')
            grade_map.setdefault(grade, []).append(float(s.get('return_pct', 0)))

        grade_stats = {}
        for grade, returns in sorted(grade_map.items()):
            w = [v for v in returns if v > 0]
            grade_stats[grade] = {
                "count": len(returns),
                "win_rate": round(len(w) / len(returns) * 100, 2),
                "avg_return": round(sum(returns) / len(returns), 2),
            }

        return jsonify({
            "stats": {
                "total": len(signals),
                "closed": len(closed_signals),
                "open": len(open_signals),
                "win_rate": win_rate,
                "avg_return": avg_return,
                "grade_stats": grade_stats,
            },
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Jongga V2 cumulative performance ────────────────────────────

DAILY_PRICES_PATH = os.path.join(DATA_DIR, 'daily_prices.csv')


def _load_daily_prices():
    """daily_prices.csv → {stock_code: [{date, close}, ...]} 딕셔너리."""
    prices = {}
    if not os.path.exists(DAILY_PRICES_PATH):
        return prices
    with open(DAILY_PRICES_PATH, 'r', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            code = row['stock_code']
            prices.setdefault(code, []).append({
                'date': row['date'],
                'close': int(row['close']),
            })
    for v in prices.values():
        v.sort(key=lambda r: r['date'])
    return prices


def _judge_outcome(signal, daily_rows):
    """시그널의 성과를 판정한다. (outcome, roi_pct, days_held)"""
    entry = signal.get('entry_price') or signal.get('current_price', 0)
    target = signal.get('target_price', entry * 1.09)
    stop = signal.get('stop_price', entry * 0.95)
    sig_date = signal.get('signal_date', '')

    if not entry or not daily_rows:
        return 'OPEN', 0.0, 0

    for i, row in enumerate(daily_rows):
        if row['date'] <= sig_date:
            continue
        close = row['close']
        if close >= target:
            roi = round((target - entry) / entry * 100, 2)
            return 'TARGET_HIT', roi, i + 1
        if close <= stop:
            roi = round((stop - entry) / entry * 100, 2)
            return 'STOP_HIT', roi, i + 1

    # 미결 — 마지막 종가 기준
    last_close = daily_rows[-1]['close']
    roi = round((last_close - entry) / entry * 100, 2)
    return 'OPEN', roi, len(daily_rows)


@kr_bp.route('/jongga-v2/cumulative')
@_cached_response(ttl_seconds=120)
def jongga_v2_cumulative():
    try:
        # 1. 전체 시그널 로드
        pattern = os.path.join(DATA_DIR, 'jongga_v2_results_*.json')
        files = sorted(glob.glob(pattern))
        all_signals = []
        for fp in files:
            with open(fp, 'r', encoding='utf-8') as f:
                data = json.load(f)
            all_signals.extend(data.get('signals', []))

        # 2. 일별 가격 로드
        daily_prices = _load_daily_prices()

        # 3. 각 시그널 판정
        results = []
        for s in all_signals:
            code = s.get('stock_code', '')
            daily_rows = daily_prices.get(code, [])
            outcome, roi_pct, days_held = _judge_outcome(s, daily_rows)
            results.append({
                'stock_code': code,
                'stock_name': s.get('stock_name', ''),
                'signal_date': s.get('signal_date', ''),
                'grade': s.get('grade', ''),
                'entry_price': s.get('entry_price', 0),
                'target_price': s.get('target_price', 0),
                'stop_price': s.get('stop_price', 0),
                'outcome': outcome,
                'roi_pct': roi_pct,
                'days_held': days_held,
            })

        # 4. 통계 계산
        closed = [r for r in results if r['outcome'] != 'OPEN']
        wins = [r for r in closed if r['outcome'] == 'TARGET_HIT']
        win_rate = round(len(wins) / len(closed) * 100, 2) if closed else 0.0
        avg_roi = round(sum(r['roi_pct'] for r in closed) / len(closed), 2) if closed else 0.0

        # 등급별 통계
        grade_map = {}
        for r in closed:
            grade_map.setdefault(r['grade'], []).append(r['roi_pct'])

        grade_roi = {}
        for grade, rois in sorted(grade_map.items()):
            w = [v for v in rois if v > 0]
            grade_roi[grade] = {
                'count': len(rois),
                'win_rate': round(len(w) / len(rois) * 100, 2),
                'avg_roi': round(sum(rois) / len(rois), 2),
            }

        # 5. 페이지네이션
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        total_count = len(results)
        start = (page - 1) * per_page
        paged = results[start:start + per_page]

        return jsonify({
            'stats': {
                'total': total_count,
                'wins': len(wins),
                'losses': len([r for r in closed if r['outcome'] == 'STOP_HIT']),
                'open': len([r for r in results if r['outcome'] == 'OPEN']),
                'win_rate': win_rate,
                'avg_roi': avg_roi,
                'grade_roi': grade_roi,
            },
            'signals': paged,
            'page': page,
            'per_page': per_page,
            'total_pages': (total_count + per_page - 1) // per_page,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
