"""
Load SenseProbe layout from YAML + environment variables.

Precedence for paths and active dataset:
  1) Environment variables (SENSEPROBE_*)
  2) Optional override file (SENSEPROBE_CONFIG)
  3) config/senseprobe.defaults.yaml
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Mapping

import yaml

CONFIG_DIRNAME = "config"
DEFAULTS_NAME = "senseprobe.defaults.yaml"


def repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _deep_merge(base: dict[str, Any], override: Mapping[str, Any]) -> dict[str, Any]:
    out = dict(base)
    for k, v in override.items():
        if k in out and isinstance(out[k], dict) and isinstance(v, dict):
            out[k] = _deep_merge(out[k], v)
        else:
            out[k] = v
    return out


def _resolve_path(repo: Path, value: str) -> Path:
    p = Path(value).expanduser()
    return p if p.is_absolute() else (repo / p)


@dataclass(frozen=True)
class DatasetPaths:
    """Resolved filesystem paths for one dataset entry."""

    id: str
    label: str
    raw_slug: str
    raw_extracted_subpath: str
    processed: Path
    processed_full: Path

    def raw_extracted_dir(self, data_root: Path) -> Path:
        return data_root / "raw" / self.raw_slug / Path(self.raw_extracted_subpath)


@dataclass(frozen=True)
class SenseProbeConfig:
    repo_root: Path
    data_root: Path
    results_dir: Path
    models_dir: Path
    active_dataset_id: str
    datasets: dict[str, DatasetPaths]
    training_experiment_classifiers: list[str]
    training_classifiers: list[str]
    training_unets: list[str]
    raw_dict: dict[str, Any]

    def dataset(self, dataset_id: str | None = None) -> DatasetPaths:
        did = dataset_id or self.active_dataset_id
        if did not in self.datasets:
            known = ", ".join(sorted(self.datasets)) or "(none)"
            raise KeyError(f"Unknown dataset {did!r}. Configured: {known}")
        return self.datasets[did]


@lru_cache(maxsize=4)
def load_config(
    repo: Path | None = None,
    *,
    _env_data_root: str | None = None,
    _env_results: str | None = None,
    _env_models: str | None = None,
    _env_dataset: str | None = None,
    _env_config_path: str | None = None,
) -> SenseProbeConfig:
    """
    Load merged config. Cached; pass env snapshot only for tests (defaults use os.environ).
    """
    r = repo or repo_root()
    data = _load_yaml_data(r, _env_config_path)

    dr = _env_data_root if _env_data_root is not None else os.environ.get("SENSEPROBE_DATA_ROOT")
    rr = _env_results if _env_results is not None else os.environ.get("SENSEPROBE_RESULTS_DIR")
    mr = _env_models if _env_models is not None else os.environ.get("SENSEPROBE_MODELS_DIR")
    ad = _env_dataset if _env_dataset is not None else os.environ.get("SENSEPROBE_DATASET")

    paths_cfg = data.get("paths") or {}
    data_root = _resolve_path(r, dr or paths_cfg.get("data_root") or "data")
    results_dir = _resolve_path(r, rr or paths_cfg.get("results") or "results")
    models_dir = _resolve_path(r, mr or paths_cfg.get("models") or "models")

    defaults = data.get("defaults") or {}
    active = ad or defaults.get("dataset")
    if not active:
        raise ValueError("No default dataset: set defaults.dataset in config or SENSEPROBE_DATASET")

    ds_map: dict[str, DatasetPaths] = {}
    for ds_id, spec in (data.get("datasets") or {}).items():
        if not isinstance(spec, dict):
            continue
        outs = spec.get("outputs") or {}
        proc = outs.get("processed") or "processed"
        pfull = outs.get("processed_full") or "processed_full"
        ds_map[ds_id] = DatasetPaths(
            id=ds_id,
            label=str(spec.get("label") or ds_id),
            raw_slug=str(spec["raw_slug"]),
            raw_extracted_subpath=str(spec.get("raw_extracted_subpath") or "."),
            processed=data_root / proc,
            processed_full=data_root / pfull,
        )

    train = data.get("training") or {}
    exp_clf = list(train.get("experiment_classifiers") or [])
    classifiers = list(train.get("classifiers") or [])
    unets = list(train.get("unets") or [])

    return SenseProbeConfig(
        repo_root=r,
        data_root=data_root,
        results_dir=results_dir,
        models_dir=models_dir,
        active_dataset_id=str(active),
        datasets=ds_map,
        training_experiment_classifiers=exp_clf,
        training_classifiers=classifiers,
        training_unets=unets,
        raw_dict=data,
    )


def _load_yaml_data(repo: Path, env_config_path: str | None) -> dict[str, Any]:
    base_path = repo / CONFIG_DIRNAME / DEFAULTS_NAME
    if not base_path.is_file():
        raise FileNotFoundError(f"Missing defaults config: {base_path}")

    with open(base_path, encoding="utf-8") as f:
        data: dict[str, Any] = yaml.safe_load(f) or {}

    cfg_path = env_config_path if env_config_path is not None else os.environ.get("SENSEPROBE_CONFIG")
    if cfg_path:
        p = Path(cfg_path).expanduser()
        if not p.is_file():
            raise FileNotFoundError(f"SENSEPROBE_CONFIG not found: {p}")
        with open(p, encoding="utf-8") as f:
            override = yaml.safe_load(f) or {}
        data = _deep_merge(data, override)

    return data


def clear_config_cache() -> None:
    load_config.cache_clear()
