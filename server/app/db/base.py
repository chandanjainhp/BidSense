from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings
import ssl
from urllib.parse import urlparse, parse_qs

# Parse DATABASE_URL to handle SSL for cloud PostgreSQL
db_url = settings.async_database_url
connect_args = {}

# Extract SSL mode from URL query params for asyncpg
parsed = urlparse(db_url)
query_params = parse_qs(parsed.query)
ssl_mode = query_params.get('sslmode', [None])[0]

if ssl_mode or 'sage.cloud' in db_url or 'layerbase' in db_url:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    connect_args = {'ssl': ctx}
    # Remove sslmode from URL as asyncpg doesn't accept it as a parameter
    if '?' in db_url:
        base_url, query_string = db_url.split('?', 1)
        params = parse_qs(query_string)
        params.pop('sslmode', None)
        if params:
            new_query = '&'.join(f'{k}={v[0]}' for k, v in params.items())
            db_url = f'{base_url}?{new_query}'
        else:
            db_url = base_url

engine = create_async_engine(
    db_url,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    connect_args=connect_args,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """SQLAlchemy declarative base for all models."""
    pass


async def get_db_session() -> AsyncSession:
    """Dependency to get a database session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
