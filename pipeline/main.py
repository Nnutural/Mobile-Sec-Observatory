"""Command line entry point for the MobileSec Observatory data pipeline."""

import click


@click.group()
def cli() -> None:
    """MSO Data Pipeline."""


@cli.command()
def collect_fdroid() -> None:
    """采集 F-Droid 应用。"""
    click.echo("[step] collect-fdroid: TODO implement")


@cli.command()
def collect_bulletins() -> None:
    """采集 Android Security Bulletin。"""
    click.echo("[step] collect-bulletins: TODO implement")


@cli.command()
def analyze_apks() -> None:
    """分析所有已下载的 APK。"""
    click.echo("[step] analyze-apks: TODO implement")


@cli.command()
def compute_metrics() -> None:
    """计算 PDI / CLRI / 聚合统计。"""
    click.echo("[step] compute-metrics: TODO implement")


@cli.command()
def export_json() -> None:
    """生成前端所需的所有 JSON。"""
    click.echo("[step] export-json: TODO implement")


@cli.command()
@click.pass_context
def run_all(ctx: click.Context) -> None:
    """一键运行完整流水线。"""
    ctx.invoke(collect_fdroid)
    ctx.invoke(collect_bulletins)
    ctx.invoke(analyze_apks)
    ctx.invoke(compute_metrics)
    ctx.invoke(export_json)


if __name__ == "__main__":
    cli()
