import asyncio
from getpass import getpass

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal, init_db
from app.models.user import AdminUser


async def create_admin() -> None:
    await init_db()
    username = input("username: ").strip()
    real_name = input("real_name: ").strip() or username
    role = input("role [platform_operator/merchant_operator]: ").strip() or "platform_operator"
    merchant_id_raw = input("merchant_id [empty for platform]: ").strip()
    password = getpass("password: ")

    merchant_id = int(merchant_id_raw) if merchant_id_raw else None
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(AdminUser).where(AdminUser.username == username))
        if result.scalar_one_or_none() is not None:
            raise SystemExit("admin username already exists")
        admin = AdminUser(
            username=username,
            real_name=real_name,
            role=role,
            merchant_id=merchant_id,
            password_hash=hash_password(password),
        )
        session.add(admin)
        await session.commit()
    print("admin created")


if __name__ == "__main__":
    asyncio.run(create_admin())
