# backend/app/domain/matrix.py
from typing import Dict, List

# --- Public API tego modułu ---------------------------------------------------
# 1) ATTRS, POSITIONS – do walidacji / list w UI
# 2) MATRIX – defaulty pozycji→atrybut
# 3) seed_for(pos, attr) – pobiera seed dla (pozycja, atrybut)

DEFAULT_SEED = 65.0  # użyte, gdy brak pozycji/atrybutu w macierzy

ATTRS: List[str] = [
    # PHYSICAL
    "PAC", "ACC", "AGI", "STA", "STR",
    # TECHNICAL / ATTACK
    "DRI", "FTO", "PAS", "VIS", "CRO", "FIN", "LON", "HEA",
    # DEFENSE (outfield)
    "TCK", "MAR", "POS", "INT",
    # GOALKEEPING
    "HAN", "REF", "ONE", "KIC",
    # MENTAL
    "AGR", "BRV", "CMP", "CON", "DEC", "DET", "LDR", "OTB", "TMW", "WRK",
]

POSITIONS: List[str] = [
    "GK",
    "SW", "DCR", "DCL", "DC",
    "DR", "DL",
    "WBR", "WBL",
    "DM",
    "MCR", "MCL", "MC",
    "MR", "ML",
    "AMR", "AML", "AMC",
    "STC",
]

# --- SZTYWNA MACIERZ (pozycja → atrybut → rating 0..99) ---
MATRIX: Dict[str, Dict[str, int]] = {
    # (wklejona przez Ciebie zawartość – NIE ZMIENIAJĘ)
    "GK": {
        "PAC": 45, "ACC": 48, "AGI": 50, "STA": 45, "STR": 55,
        "DRI": 30, "FTO": 38, "PAS": 40, "VIS": 38, "CRO": 30, "FIN": 25, "LON": 30, "HEA": 30,
        "TCK": 30, "MAR": 35, "POS": 55, "INT": 40,
        "HAN": 70, "REF": 72, "ONE": 70, "KIC": 65,
        "AGR": 45, "BRV": 55, "CMP": 65, "CON": 70, "DEC": 66, "DET": 60, "LDR": 60, "OTB": 35, "TMW": 62, "WRK": 60,
    },
    "SW": {
        "PAC": 58, "ACC": 60, "AGI": 58, "STA": 62, "STR": 75,
        "DRI": 45, "FTO": 55, "PAS": 60, "VIS": 55, "CRO": 40, "FIN": 40, "LON": 45, "HEA": 78,
        "TCK": 75, "MAR": 76, "POS": 76, "INT": 72,
        "AGR": 68, "BRV": 74, "CMP": 60, "CON": 68, "DEC": 60, "DET": 65, "LDR": 62, "OTB": 50, "TMW": 62, "WRK": 65,
    },
    "DC": {
        "PAC": 60, "ACC": 60, "AGI": 58, "STA": 62, "STR": 78,
        "DRI": 45, "FTO": 55, "PAS": 58, "VIS": 54, "CRO": 40, "FIN": 40, "LON": 45, "HEA": 78,
        "TCK": 76, "MAR": 78, "POS": 78, "INT": 72,
        "AGR": 70, "BRV": 75, "CMP": 60, "CON": 68, "DEC": 60, "DET": 65, "LDR": 62, "OTB": 50, "TMW": 62, "WRK": 65,
    },
    "DCR": {
        "PAC": 61, "ACC": 61, "AGI": 59, "STA": 63, "STR": 78,
        "DRI": 46, "FTO": 55, "PAS": 59, "VIS": 55, "CRO": 41, "FIN": 40, "LON": 46, "HEA": 78,
        "TCK": 76, "MAR": 78, "POS": 78, "INT": 73,
        "AGR": 70, "BRV": 75, "CMP": 60, "CON": 68, "DEC": 60, "DET": 65, "LDR": 62, "OTB": 50, "TMW": 62, "WRK": 65,
    },
    "DCL": {
        "PAC": 61, "ACC": 61, "AGI": 59, "STA": 63, "STR": 78,
        "DRI": 46, "FTO": 55, "PAS": 59, "VIS": 55, "CRO": 41, "FIN": 40, "LON": 46, "HEA": 78,
        "TCK": 76, "MAR": 78, "POS": 78, "INT": 73,
        "AGR": 70, "BRV": 75, "CMP": 60, "CON": 68, "DEC": 60, "DET": 65, "LDR": 62, "OTB": 50, "TMW": 62, "WRK": 65,
    },
    "DR": {
        "PAC": 75, "ACC": 77, "AGI": 72, "STA": 78, "STR": 65,
        "DRI": 62, "FTO": 62, "PAS": 64, "VIS": 60, "CRO": 68, "FIN": 45, "LON": 52, "HEA": 55,
        "TCK": 70, "MAR": 68, "POS": 68, "INT": 66,
        "AGR": 60, "BRV": 60, "CMP": 62, "CON": 64, "DEC": 62, "DET": 64, "LDR": 55, "OTB": 62, "TMW": 64, "WRK": 72,
    },
    "DL": {
        "PAC": 75, "ACC": 77, "AGI": 72, "STA": 78, "STR": 65,
        "DRI": 62, "FTO": 62, "PAS": 64, "VIS": 60, "CRO": 68, "FIN": 45, "LON": 52, "HEA": 55,
        "TCK": 70, "MAR": 68, "POS": 68, "INT": 66,
        "AGR": 60, "BRV": 60, "CMP": 62, "CON": 64, "DEC": 62, "DET": 64, "LDR": 55, "OTB": 62, "TMW": 64, "WRK": 72,
    },
    "WBR": {
        "PAC": 78, "ACC": 80, "AGI": 74, "STA": 82, "STR": 66,
        "DRI": 65, "FTO": 64, "PAS": 66, "VIS": 62, "CRO": 70, "FIN": 48, "LON": 54, "HEA": 56,
        "TCK": 68, "MAR": 66, "POS": 66, "INT": 66,
        "AGR": 60, "BRV": 60, "CMP": 62, "CON": 64, "DEC": 62, "DET": 66, "LDR": 55, "OTB": 64, "TMW": 66, "WRK": 76,
    },
    "WBL": {
        "PAC": 78, "ACC": 80, "AGI": 74, "STA": 82, "STR": 66,
        "DRI": 65, "FTO": 64, "PAS": 66, "VIS": 62, "CRO": 70, "FIN": 48, "LON": 54, "HEA": 56,
        "TCK": 68, "MAR": 66, "POS": 66, "INT": 66,
        "AGR": 60, "BRV": 60, "CMP": 62, "CON": 64, "DEC": 62, "DET": 66, "LDR": 55, "OTB": 64, "TMW": 66, "WRK": 76,
    },
    "DM": {
        "PAC": 66, "ACC": 68, "AGI": 66, "STA": 76, "STR": 70,
        "DRI": 60, "FTO": 64, "PAS": 68, "VIS": 66, "CRO": 45, "FIN": 45, "LON": 56, "HEA": 62,
        "TCK": 72, "MAR": 70, "POS": 72, "INT": 74,
        "AGR": 60, "BRV": 65, "CMP": 64, "CON": 68, "DEC": 66, "DET": 66, "LDR": 58, "OTB": 58, "TMW": 66, "WRK": 70,
    },
    "MC": {
        "PAC": 68, "ACC": 70, "AGI": 70, "STA": 78, "STR": 68,
        "DRI": 68, "FTO": 70, "PAS": 72, "VIS": 72, "CRO": 48, "FIN": 58, "LON": 62, "HEA": 58,
        "TCK": 64, "MAR": 62, "POS": 66, "INT": 66,
        "AGR": 55, "BRV": 58, "CMP": 66, "CON": 64, "DEC": 68, "DET": 64, "LDR": 58, "OTB": 62, "TMW": 68, "WRK": 66,
    },
    "MCR": {
        "PAC": 68, "ACC": 70, "AGI": 70, "STA": 78, "STR": 68,
        "DRI": 68, "FTO": 70, "PAS": 72, "VIS": 72, "CRO": 48, "FIN": 58, "LON": 62, "HEA": 58,
        "TCK": 64, "MAR": 62, "POS": 66, "INT": 66,
        "AGR": 55, "BRV": 58, "CMP": 66, "CON": 64, "DEC": 68, "DET": 64, "LDR": 58, "OTB": 62, "TMW": 68, "WRK": 66,
    },
    "MCL": {
        "PAC": 68, "ACC": 70, "AGI": 70, "STA": 78, "STR": 68,
        "DRI": 68, "FTO": 70, "PAS": 72, "VIS": 72, "CRO": 48, "FIN": 58, "LON": 62, "HEA": 58,
        "TCK": 64, "MAR": 62, "POS": 66, "INT": 66,
        "AGR": 55, "BRV": 58, "CMP": 66, "CON": 64, "DEC": 68, "DET": 64, "LDR": 58, "OTB": 62, "TMW": 68, "WRK": 66,
    },
    "MR": {
        "PAC": 76, "ACC": 78, "AGI": 76, "STA": 78, "STR": 62,
        "DRI": 72, "FTO": 70, "PAS": 68, "VIS": 66, "CRO": 72, "FIN": 60, "LON": 60, "HEA": 55,
        "TCK": 56, "MAR": 54, "POS": 56, "INT": 56,
        "AGR": 55, "BRV": 55, "CMP": 62, "CON": 60, "DEC": 60, "DET": 62, "LDR": 52, "OTB": 70, "TMW": 64, "WRK": 66,
    },
    "ML": {
        "PAC": 76, "ACC": 78, "AGI": 76, "STA": 78, "STR": 62,
        "DRI": 72, "FTO": 70, "PAS": 68, "VIS": 66, "CRO": 72, "FIN": 60, "LON": 60, "HEA": 55,
        "TCK": 56, "MAR": 54, "POS": 56, "INT": 56,
        "AGR": 55, "BRV": 55, "CMP": 62, "CON": 60, "DEC": 60, "DET": 62, "LDR": 52, "OTB": 70, "TMW": 64, "WRK": 66,
    },
    "AMR": {
        "PAC": 85, "ACC": 86, "AGI": 84, "STA": 76, "STR": 60,
        "DRI": 82, "FTO": 78, "PAS": 72, "VIS": 72, "CRO": 75, "FIN": 68, "LON": 70, "HEA": 55,
        "TCK": 50, "MAR": 48, "POS": 52, "INT": 52,
        "AGR": 55, "BRV": 55, "CMP": 64, "CON": 58, "DEC": 60, "DET": 60, "LDR": 50, "OTB": 78, "TMW": 62, "WRK": 64,
    },
    "AML": {
        "PAC": 85, "ACC": 86, "AGI": 84, "STA": 76, "STR": 60,
        "DRI": 82, "FTO": 78, "PAS": 72, "VIS": 72, "CRO": 75, "FIN": 68, "LON": 70, "HEA": 55,
        "TCK": 50, "MAR": 48, "POS": 52, "INT": 52,
        "AGR": 55, "BRV": 55, "CMP": 64, "CON": 58, "DEC": 60, "DET": 60, "LDR": 50, "OTB": 78, "TMW": 62, "WRK": 64,
    },
    "AMC": {
        "PAC": 74, "ACC": 76, "AGI": 78, "STA": 74, "STR": 62,
        "DRI": 78, "FTO": 78, "PAS": 78, "VIS": 80, "CRO": 60, "FIN": 68, "LON": 70, "HEA": 55,
        "TCK": 55, "MAR": 52, "POS": 56, "INT": 58,
        "AGR": 55, "BRV": 55, "CMP": 66, "CON": 62, "DEC": 68, "DET": 62, "LDR": 54, "OTB": 76, "TMW": 64, "WRK": 64,
    },
    "STC": {
        "PAC": 78, "ACC": 80, "AGI": 75, "STA": 76, "STR": 78,
        "DRI": 70, "FTO": 70, "PAS": 60, "VIS": 60, "CRO": 45, "FIN": 84, "LON": 72, "HEA": 78,
        "TCK": 48, "MAR": 46, "POS": 54, "INT": 54,
        "AGR": 60, "BRV": 60, "CMP": 66, "CON": 56, "DEC": 58, "DET": 62, "LDR": 52, "OTB": 80, "TMW": 60, "WRK": 64,
    },
}

def _guess_seed_table() -> Dict[str, Dict[str, float]]:
    """
    Spróbuj wykryć, jak nazywa się Twoja macierz w tym module.
    Obsługujemy kilka możliwych nazw, by nie rozbijać istniejącej struktury.
    Zwraca dict: { 'ST': {'FIN': 72.0, ...}, 'GK': {...}, ... }
    """
    # najczęstsze warianty nazw
    candidates = [
        "SEED_MATRIX", "POSITION_ATTR_SEEDS", "POS_ATTR_SEEDS",
        "MATRIX", "SEEDS", "POS_MATRIX"
    ]
    for name in candidates:
        tbl = globals().get(name)
        if isinstance(tbl, dict):
            return tbl  # znaleźliśmy Twoją macierz
    # brak jawnej macierzy — spróbuj zbudować z POLA DEFAULT jeśli istnieje:
    default_by_pos = globals().get("DEFAULT_SEED_BY_POS", None)
    if isinstance(default_by_pos, dict):
        return {pos: {} for pos in default_by_pos.keys()}
    # ostateczny, pusty stół (fallbacki załatwi funkcja seed_for)
    return {}

# stały, lekki default gdy w macierzy brak wpisu
_DEFAULT_POS_SEED = {
    "GK": 50.0, "CB": 55.0, "CM": 65.0, "DM": 64.0, "LB": 60.0, "RB": 60.0,
    "LWB": 62.0, "RWB": 62.0, "LW": 70.0, "RW": 70.0, "AM": 68.0, "ST": 68.0,
}

# atrybuty, które często występują w każdej pozycji — jeśli nie ma szczegółu w macierzy
_DEFAULT_ATTR_SEED = 60.0

_TABLE = _guess_seed_table()

def seed_for(pos: str, attr: str) -> float:
    """
    Zwraca seed rating dla danej pozycji i atrybutu.
    1) Jeśli jest wpis w Twojej macierzy — zwróci go.
    2) Jeśli brak — spróbuje domyślnej wartości dla pozycji.
    3) Jeśli nadal brak — zwróci neutralne 60.0.
    """
    p = (pos or "").upper()
    a = (attr or "").upper()

    # 1) próba z Twojej macierzy (np. SEED_MATRIX['ST']['FIN'])
    if p in _TABLE:
        v = _TABLE[p].get(a)
        if isinstance(v, (int, float)):
            return float(v)

    # 2) fallback: domyślny seed dla pozycji
    if p in _DEFAULT_POS_SEED:
        return float(_DEFAULT_POS_SEED[p])

    # 3) fallback ogólny
    return float(_DEFAULT_ATTR_SEED)

__all__ = ["seed_for"]