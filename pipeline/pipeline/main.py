"""Compatibility wrapper for running the pipeline CLI with ``python -m``."""

from __future__ import annotations

from pathlib import Path
import sys

_PARENT = Path(__file__).resolve().parents[1]
_PARENT_STR = str(_PARENT)

if _PARENT_STR not in sys.path:
    sys.path.insert(0, _PARENT_STR)

_PACKAGE = sys.modules.get(__package__)
if _PACKAGE is not None and hasattr(_PACKAGE, "__path__"):
    if _PARENT_STR in _PACKAGE.__path__:
        _PACKAGE.__path__.remove(_PARENT_STR)
    _PACKAGE.__path__.insert(0, _PARENT_STR)

from main import cli


if __name__ == "__main__":
    cli()
