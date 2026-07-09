# MySQL 本地启动与配置

本文用于把本项目完全切换到 MySQL 开发和答辩环境。当前推荐 MySQL 8.x，字符集使用 `utf8mb4`。

## 1. 启动 MySQL 服务

Windows 常见方式：

```powershell
Get-Service *mysql*
Start-Service MySQL80
```

如果你的服务名不是 `MySQL80`，以 `Get-Service *mysql*` 查到的实际服务名为准，例如：

```powershell
Start-Service mysql
```

也可以在“服务”应用中手动启动 MySQL。

## 2. 登录 MySQL

如果 `mysql.exe` 已加入 PATH：

```powershell
mysql -u root -p
```

如果没有加入 PATH，常见位置：

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p
```

输入安装 MySQL 时设置的 root 密码。

## 3. 创建项目数据库

推荐使用项目脚本创建数据库。脚本会读取根目录 `.env` 中的 `DATABASE_URL`，只创建数据库本身，不创建业务数据。

```powershell
cd backend
.\.venv\Scripts\python.exe scripts\init_mysql_db.py
```

如果你的 MySQL 不支持默认排序规则，可执行：

```powershell
.\.venv\Scripts\python.exe scripts\init_mysql_db.py --collation utf8mb4_unicode_ci
```

如需删除并重建库，可执行：

```powershell
.\.venv\Scripts\python.exe scripts\init_mysql_db.py --drop-existing
```

也可以手动进入 MySQL 后执行：

```sql
CREATE DATABASE IF NOT EXISTS its_mygo
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;
```

如果你的 MySQL 版本不支持 `utf8mb4_0900_ai_ci`，改用：

```sql
CREATE DATABASE IF NOT EXISTS its_mygo
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
```

查看是否创建成功：

```sql
SHOW DATABASES;
```

## 4. 配置项目 `.env`

复制根目录 `.env.example` 为 `.env`，将数据库配置改为你的本机密码。运行 `init_mysql_db.py` 前也需要先配置这一项：

```env
DATABASE_URL=mysql+asyncmy://root:你的密码@127.0.0.1:3306/its_mygo?charset=utf8mb4
```

密码里如果包含 `@`、`#`、`:`、`/` 等特殊字符，需要 URL 编码。例如 `p@ss:123` 写成：

```env
DATABASE_URL=mysql+asyncmy://root:p%40ss%3A123@127.0.0.1:3306/its_mygo?charset=utf8mb4
```

## 5. 启动后端并建表

本项目开发环境启动时会根据 ORM 模型自动 `create_all` 建表。分类属于平台运营配置，不会在数据库初始化时自动写入，需要后续由平台端自行创建。

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn main:app --reload
```

看到后端启动成功后，可在 MySQL 中检查表：

```sql
USE its_mygo;
SHOW TABLES;
SELECT id, name FROM category ORDER BY sort_order, id;
```

新库中 `category` 初始为空是正常情况。

## SQLite 数据迁移说明

切换到 MySQL 后，原 SQLite 文件中的数据不会自动迁移。当前项目没有内置 SQLite -> MySQL 的数据迁移脚本。

建议处理方式：

- 答辩和后续协作使用新的 MySQL 空库重新配置数据。
- 平台管理员账号需要重新创建。
- 商家、商品、分类、订单、社区、优惠券等测试数据需要重新录入或通过页面重新生成。
- 如确实需要迁移旧 SQLite 数据，应单独编写一次性迁移脚本，并逐表处理外键、枚举、JSON 字段和自增 ID，不建议在当前答辩准备阶段临时混入主流程。

## 6. 初始化平台管理员

```powershell
cd backend
.\.venv\Scripts\python.exe scripts\create_admin.py
```

按提示输入用户名、姓名、角色和密码。平台管理员角色使用默认 `platform_operator`。

查看管理员：

```powershell
.\.venv\Scripts\python.exe scripts\create_admin.py --list
```

## 7. 清理测试数据

清理业务测试数据但保留平台管理员：

```powershell
cd backend
.\.venv\Scripts\python.exe scripts\clear_test_data.py --yes
```

MySQL 下脚本会临时关闭外键检查后删除数据，结束后重新打开外键检查。

连平台管理员也清掉：

```powershell
.\.venv\Scripts\python.exe scripts\clear_test_data.py --yes --include-platform-admins
```

## 8. 常见问题

### `Access denied for user 'root'@'localhost'`

密码错误，或 MySQL 使用了不同账号。重新确认 root 密码，或新建项目账号。

### `Can't connect to MySQL server`

MySQL 服务未启动，先执行：

```powershell
Get-Service *mysql*
Start-Service MySQL80
```

### 后端仍然连 SQLite

检查根目录 `.env`，不是 `backend/.env`。`DATABASE_URL` 必须是：

```env
DATABASE_URL=mysql+asyncmy://...
```

### 表不存在

确认后端以 `APP_ENV=development` 启动。开发环境启动时会自动建表。也可以删除空库后重新启动后端：

```sql
DROP DATABASE its_mygo;
CREATE DATABASE its_mygo DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_0900_ai_ci;
```

## 9. 答辩建议

- 数据库使用 MySQL 8.x。
- 展示 `its_mygo` 库中的核心表：`user`、`admin_user`、`merchant`、`product`、`sku`、`orders`、`payment`、`refund`、`community_post`、`customer_service_conversation`。
- 说明项目使用 SQLAlchemy ORM，开发环境自动建表；后续生产化可补 Alembic 迁移。
- 分类由平台运营在后台配置，不随建库自动写入，便于答辩时展示平台配置能力。
