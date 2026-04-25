from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.circuit_ir import ComponentSearchResult
from app.models.db_models import ComponentDB


class ComponentDBService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def search(
        self,
        query: str,
        component_type: str | None = None,
        package: str | None = None,
        limit: int = 10,
    ) -> list[ComponentSearchResult]:
        stmt = select(ComponentDB).where(ComponentDB.in_stock.is_(True))

        if query:
            ts_query = func.plainto_tsquery("english", query)
            ts_vector = func.to_tsvector(
                "english",
                func.concat_ws(" ", ComponentDB.description, ComponentDB.mpn, ComponentDB.manufacturer),
            )
            stmt = stmt.where(ts_vector.op("@@")(ts_query))

        if component_type:
            stmt = stmt.where(ComponentDB.type == component_type)

        if package:
            stmt = stmt.where(ComponentDB.package == package)

        stmt = stmt.limit(limit)
        result = await self.db.execute(stmt)
        rows = result.scalars().all()

        return [
            ComponentSearchResult(
                mpn=row.mpn,
                manufacturer=row.manufacturer or "",
                description=row.description or "",
                type=row.type or "ic",  # type: ignore[arg-type]
                value=row.value or "",
                package=row.package or "",
                datasheet_url=row.datasheet_url,
                kicad_symbol=row.kicad_symbol,
                kicad_footprint=row.kicad_footprint,
                specs=row.specs or {},
            )
            for row in rows
        ]

    async def list_components(self, limit: int = 200) -> list[ComponentSearchResult]:
        stmt = (
            select(ComponentDB)
            .where(ComponentDB.in_stock.is_(True))
            .order_by(ComponentDB.mpn.asc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        rows = result.scalars().all()
        return [
            ComponentSearchResult(
                mpn=row.mpn,
                manufacturer=row.manufacturer or "",
                description=row.description or "",
                type=row.type or "ic",  # type: ignore[arg-type]
                value=row.value or "",
                package=row.package or "",
                datasheet_url=row.datasheet_url,
                kicad_symbol=row.kicad_symbol,
                kicad_footprint=row.kicad_footprint,
                specs=row.specs or {},
            )
            for row in rows
        ]
