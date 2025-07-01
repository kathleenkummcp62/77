import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

sys.modules.setdefault('paramiko', object())
from aggregator import human


def test_human():
    assert human(3661) == "01:01:01"
