"""Compatibility package for running `python -m pipeline.main` inside pipeline/."""

from pathlib import Path

_PARENT = Path(__file__).resolve().parents[1]
_PARENT_STR = str(_PARENT)

if _PARENT_STR in __path__:
    __path__.remove(_PARENT_STR)
__path__.insert(0, _PARENT_STR)
