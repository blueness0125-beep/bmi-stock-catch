from typing import List, Optional, Tuple

from config import Grade, SignalConfig
from models import (
    ChecklistDetail,
    ChartData,
    NewsData,
    ScoreDetail,
    StockData,
    SupplyData,
)


class Scorer:
    def __init__(self, config: SignalConfig = None):
        self.config = config or SignalConfig()

    def calculate(
        self,
        stock: StockData,
        charts: List[ChartData],
        news_list: List[NewsData],
        supply: Optional[SupplyData],
        llm_result: Optional[dict] = None,
    ) -> Tuple[ScoreDetail, ChecklistDetail]:
        score = ScoreDetail()
        checklist = ChecklistDetail()

        # 1. 뉴스/재료 점수 (0~3)
        score.news, news_flags = self._score_news(news_list, llm_result)
        checklist.has_news = news_flags["has_news"]
        checklist.news_sources = news_flags["sources"]
        score.llm_reason = news_flags["reason"]

        # 2. 거래대금 점수 (0~3)
        score.volume, checklist.volume_sufficient = self._score_volume(stock)

        # 3. 차트패턴 점수 (0~3)
        score.chart, chart_flags = self._score_chart(stock, charts)
        checklist.is_new_high = chart_flags["new_high"]
        checklist.is_breakout = chart_flags["breakout"]
        checklist.ma_aligned = chart_flags["ma_aligned"]

        # 4. 캔들형태 점수 (0~1)
        score.candle, candle_flags = self._score_candle(stock, charts)
        checklist.good_candle = candle_flags["good"]
        checklist.upper_wick_long = candle_flags["upper_wick_long"]

        # 5. 기간조정 점수 (0~1)
        score.consolidation, checklist.has_consolidation = \
            self._score_consolidation(charts)

        # 6. 수급 점수 (0~2)
        score.supply, checklist.supply_positive = self._score_supply(supply)

        # 7. 조정폭 회복 점수 (0~1)
        score.retracement, checklist.retracement_recovery = \
            self._score_retracement_recovery(charts)

        # 8. 되돌림 지지 점수 (0~1)
        score.pullback_support, checklist.pullback_support_confirmed = \
            self._score_pullback_support(charts)

        return score, checklist

    def _score_news(
        self, news_list: List[NewsData], llm_result: Optional[dict]
    ) -> Tuple[int, dict]:
        flags = {"has_news": False, "sources": [], "reason": ""}

        # LLM 분석 결과가 있으면 우선 사용
        if llm_result and isinstance(llm_result.get("score"), int):
            pts = max(0, min(3, llm_result["score"]))
            flags["reason"] = llm_result.get("reason", "")
            flags["sources"] = llm_result.get("themes", [])
            if pts >= 1:
                flags["has_news"] = True
            return pts, flags

        # LLM 없으면 뉴스 존재 여부로 최소 판단
        if news_list:
            flags["has_news"] = True
            flags["sources"] = [n.title for n in news_list[:3]]
            flags["reason"] = news_list[0].title
            return 1, flags

        return 0, flags

    def _score_volume(self, stock: StockData) -> Tuple[int, bool]:
        tv = stock.trading_value
        if tv >= 1_000_000_000_000:
            pts = 3
        elif tv >= 500_000_000_000:
            pts = 2
        elif tv >= 100_000_000_000:
            pts = 1
        else:
            pts = 0
        sufficient = tv >= 50_000_000_000
        return pts, sufficient

    def _score_chart(
        self, stock: StockData, charts: List[ChartData]
    ) -> Tuple[int, dict]:
        flags = {"new_high": False, "breakout": False, "ma_aligned": False}

        if len(charts) < 20:
            return 0, flags

        pts = 0
        last = charts[-1]

        # 1) 이평선 정배열
        if last.ma5 is not None and last.ma10 is not None and last.ma20 is not None:
            if stock.close > last.ma5 > last.ma10 > last.ma20:
                flags["ma_aligned"] = True
                pts += 1

        # 2) 52주 신고가 근접 또는 60일 고가 돌파
        if stock.high_52w > 0 and stock.close >= stock.high_52w * 0.95:
            flags["new_high"] = True
            pts += 1
        elif len(charts) >= 60:
            high_60d = max(c.high for c in charts[-60:])
            if stock.close > high_60d:
                flags["breakout"] = True
                pts += 1

        # 3) VCP — 추후 추가

        return pts, flags

    def _score_candle(
        self, stock: StockData, charts: List[ChartData]
    ) -> Tuple[int, dict]:
        o, h, l, c = stock.open, stock.high, stock.low, stock.close
        flags = {"good": False, "upper_wick_long": False, "body_ratio": 0.0}

        if o == 0 or h == l:
            return 0, flags
        if c <= o:
            return 0, flags

        body = c - o
        total_range = h - l
        body_ratio = body / total_range
        upper_wick = h - c
        upper_wick_ratio = upper_wick / body if body > 0 else 999

        flags["body_ratio"] = round(body_ratio, 4)

        if upper_wick_ratio > 0.5:
            flags["upper_wick_long"] = True

        if (body_ratio >= 0.6 and upper_wick_ratio <= 0.3) or \
           (body_ratio >= 0.5 and upper_wick_ratio <= 0.5):
            flags["good"] = True
            return 1, flags

        return 0, flags

    def _score_supply(self, supply: Optional[SupplyData]) -> Tuple[int, bool]:
        if supply is None:
            return 0, False

        f = supply.foreign_net_5d
        i = supply.inst_net_5d

        if f > 0 and i > 0:
            pts = 2
        elif f > 0 or i > 0:
            pts = 1
        else:
            pts = 0

        return pts, pts >= 1

    def _score_retracement_recovery(
        self, charts: List[ChartData]
    ) -> Tuple[int, bool]:
        if len(charts) < 10:
            return 0, False

        recent = charts[-10:]
        high_idx = max(range(len(recent)), key=lambda i: recent[i].high)

        # 고점 이후 최소 2일은 지나야 함
        if high_idx >= len(recent) - 2:
            return 0, False

        high_val = recent[high_idx].high
        after_high = recent[high_idx + 1:]
        low_after = min(c.low for c in after_high)

        decline = high_val - low_after
        if high_val <= 0 or decline <= 0 or decline / high_val < 0.03:
            return 0, False

        recovery = recent[-1].close - low_after
        if recovery >= decline * 0.5:
            return 1, True

        return 0, False

    def _score_pullback_support(
        self, charts: List[ChartData]
    ) -> Tuple[int, bool]:
        if len(charts) < 25:
            return 0, False

        past_resistance = max(c.high for c in charts[-25:-5])
        recent_5 = charts[-5:]

        # 최근 5일 중 오늘 제외, 종가가 저항선을 넘은 날이 있는지
        breakout = any(c.close > past_resistance for c in recent_5[:-1])
        if not breakout:
            return 0, False

        today = charts[-1]
        if today.low <= past_resistance * 1.02 and today.close > past_resistance:
            return 1, True

        return 0, False

    def _score_consolidation(
        self, charts: List[ChartData]
    ) -> Tuple[int, bool]:
        if len(charts) < 20:
            return 0, False

        recent_20 = charts[-20:]
        recent_5 = charts[-5:]

        high_20 = max(c.high for c in recent_20)
        low_20 = min(c.low for c in recent_20)
        if low_20 == 0:
            return 0, False
        range_20 = (high_20 - low_20) / low_20

        high_5 = max(c.high for c in recent_5)
        low_5 = min(c.low for c in recent_5)
        range_5 = (high_5 - low_5) / low_5

        volatility_contracted = range_5 < range_20 * 0.5
        sideways = range_20 <= 0.15
        breakout = charts[-1].close > high_20

        if (sideways or volatility_contracted) and breakout:
            return 1, True

        return 0, False

    def determine_grade(self, stock: StockData, score: ScoreDetail) -> Grade:
        if not score.mandatory_passed:
            return Grade.C
        if score.total >= 9:
            return Grade.A
        if score.total >= 7:
            return Grade.B
        return Grade.C

    def calculate_quality(
        self, stock: StockData, charts: List[ChartData], score: ScoreDetail
    ) -> float:
        q = 0.0

        # 1. 수급 (최대 30점)
        if score.supply >= 2:
            q += 30
        elif score.supply == 1:
            q += 15

        # 2. 총점 (최대 25점)
        if score.total >= 10:
            q += 25
        elif score.total >= 9:
            q += 20
        elif score.total >= 8:
            q += 15
        elif score.total >= 7:
            q += 10

        # 3. 당일 상승률 (최대 20점)
        chg = abs(stock.change_pct)
        if chg <= 5:
            q += 20
        elif chg <= 10:
            q += 15
        elif chg <= 15:
            q += 10
        elif chg <= 20:
            q += 5

        # 4. 20일 모멘텀 (최대 15점)
        if len(charts) >= 20:
            price_20ago = charts[-20].close
            if price_20ago > 0:
                m20 = (stock.close - price_20ago) / price_20ago * 100
                if m20 <= 20:
                    q += 15
                elif m20 <= 40:
                    q += 10
                elif m20 <= 60:
                    q += 5

        # 5. 거래량 비율 (최대 10점)
        if len(charts) >= 20:
            vol_20avg = sum(c.volume for c in charts[-20:]) / 20
            if vol_20avg > 0:
                vol_ratio = stock.volume / vol_20avg
                if 4 <= vol_ratio <= 6:
                    q += 10
                elif 2 <= vol_ratio <= 8:
                    q += 5

        return round(q, 1)
