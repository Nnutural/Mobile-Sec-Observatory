"""Compatibility package for running `python -m pipeline.main` inside pipeline/."""

from pathlib import Path

_PARENT = Path(__file__).resolve().parents[1]
if str(_PARENT) not in __path__:
    __path__.append(str(_PARENT))
