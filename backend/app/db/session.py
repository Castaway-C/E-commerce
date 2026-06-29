from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

engine = create_async_engine(settings.database_url, echo=settings.app_env == "development")
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def init_db() -> None:
    from app.db.base import Base
    from app import models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        if settings.database_url.startswith("sqlite"):
            await _patch_sqlite_order_columns(conn)
            await _patch_sqlite_refund_columns(conn)
            await _patch_sqlite_coupon_template_columns(conn)
            await _patch_sqlite_points_log_columns(conn)
            await _patch_sqlite_admin_operation_log_columns(conn)
            await _patch_sqlite_merchant_application_columns(conn)


async def _patch_sqlite_order_columns(conn) -> None:
    result = await conn.execute(text("PRAGMA table_info(orders)"))
    existing_columns = {row[1] for row in result.fetchall()}
    columns = {
        "shipping_address_snapshot": "TEXT",
        "logistics_company": "VARCHAR(80)",
        "tracking_no": "VARCHAR(80)",
        "shipped_at": "DATETIME",
        "received_at": "DATETIME",
        "source_post_id": "INTEGER",
        "source_user_id": "INTEGER",
        "grass_rewarded": "BOOLEAN DEFAULT 0",
    }
    for column_name, column_type in columns.items():
        if column_name not in existing_columns:
            await conn.execute(text(f"ALTER TABLE orders ADD COLUMN {column_name} {column_type}"))


async def _patch_sqlite_refund_columns(conn) -> None:
    result = await conn.execute(text("PRAGMA table_info(refund)"))
    existing_columns = {row[1] for row in result.fetchall()}
    columns = {
        "refund_amount_cent": "INTEGER DEFAULT 0",
        "reason_type": "VARCHAR(50) DEFAULT 'other'",
    }
    for column_name, column_type in columns.items():
        if column_name not in existing_columns:
            await conn.execute(text(f"ALTER TABLE refund ADD COLUMN {column_name} {column_type}"))


async def _patch_sqlite_coupon_template_columns(conn) -> None:
    result = await conn.execute(text("PRAGMA table_info(coupon_template)"))
    existing_columns = {row[1] for row in result.fetchall()}
    columns = {
        "scope_type": "VARCHAR(20) DEFAULT 'all'",
        "scope_ids": "VARCHAR(500) DEFAULT '[]'",
    }
    for column_name, column_type in columns.items():
        if column_name not in existing_columns:
            await conn.execute(text(f"ALTER TABLE coupon_template ADD COLUMN {column_name} {column_type}"))


async def _patch_sqlite_points_log_columns(conn) -> None:
    result = await conn.execute(text("PRAGMA table_info(points_log)"))
    if not result.fetchall():
        return
    result = await conn.execute(text("PRAGMA table_info(points_log)"))
    existing_columns = {row[1] for row in result.fetchall()}
    columns = {
        "source_id": "INTEGER",
        "description": "VARCHAR(255) DEFAULT ''",
    }
    for column_name, column_type in columns.items():
        if column_name not in existing_columns:
            await conn.execute(text(f"ALTER TABLE points_log ADD COLUMN {column_name} {column_type}"))


async def _patch_sqlite_admin_operation_log_columns(conn) -> None:
    result = await conn.execute(text("PRAGMA table_info(admin_operation_log)"))
    if not result.fetchall():
        return
    result = await conn.execute(text("PRAGMA table_info(admin_operation_log)"))
    existing_columns = {row[1] for row in result.fetchall()}
    columns = {
        "resource_id": "INTEGER",
        "description": "VARCHAR(255) DEFAULT ''",
    }
    for column_name, column_type in columns.items():
        if column_name not in existing_columns:
            await conn.execute(text(f"ALTER TABLE admin_operation_log ADD COLUMN {column_name} {column_type}"))


async def _patch_sqlite_merchant_application_columns(conn) -> None:
    result = await conn.execute(text("PRAGMA table_info(merchant_application)"))
    if not result.fetchall():
        return
    result = await conn.execute(text("PRAGMA table_info(merchant_application)"))
    existing_columns = {row[1] for row in result.fetchall()}
    columns = {
        "merchant_id": "INTEGER",
        "reviewed_by": "INTEGER",
        "reject_reason": "VARCHAR(255)",
        "reviewed_at": "DATETIME",
    }
    for column_name, column_type in columns.items():
        if column_name not in existing_columns:
            await conn.execute(text(f"ALTER TABLE merchant_application ADD COLUMN {column_name} {column_type}"))
