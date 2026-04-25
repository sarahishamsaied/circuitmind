from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, String, Text,
    UniqueConstraint, func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    projects: Mapped[list[Project]] = relationship("Project", back_populates="user", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user: Mapped[User] = relationship("User", back_populates="projects")
    circuits: Mapped[list[Circuit]] = relationship("Circuit", back_populates="project", cascade="all, delete-orphan")
    head: Mapped[ProjectHead | None] = relationship("ProjectHead", back_populates="project", uselist=False)


class Circuit(Base):
    __tablename__ = "circuits"
    __table_args__ = (UniqueConstraint("project_id", "version"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    ir: Mapped[dict] = mapped_column(JSONB, nullable=False)
    ir_hash: Mapped[str | None] = mapped_column(String(64))
    agent_conversation: Mapped[list | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    project: Mapped[Project] = relationship("Project", back_populates="circuits")
    simulation_results: Mapped[list[SimulationResult]] = relationship("SimulationResult", back_populates="circuit", cascade="all, delete-orphan")
    exports: Mapped[list[Export]] = relationship("Export", back_populates="circuit", cascade="all, delete-orphan")


class ProjectHead(Base):
    __tablename__ = "project_head"

    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    circuit_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("circuits.id"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    project: Mapped[Project] = relationship("Project", back_populates="head")
    circuit: Mapped[Circuit] = relationship("Circuit")


class ComponentDB(Base):
    __tablename__ = "components"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mpn: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    manufacturer: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    type: Mapped[str | None] = mapped_column(String(100))
    value: Mapped[str | None] = mapped_column(String(100))
    package: Mapped[str | None] = mapped_column(String(100))
    datasheet_url: Mapped[str | None] = mapped_column(Text)
    kicad_symbol: Mapped[str | None] = mapped_column(String(255))
    kicad_footprint: Mapped[str | None] = mapped_column(String(255))
    spice_model: Mapped[str | None] = mapped_column(Text)
    specs: Mapped[dict | None] = mapped_column(JSONB)
    in_stock: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class SimulationResult(Base):
    __tablename__ = "simulation_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    circuit_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("circuits.id"))
    analysis_type: Mapped[str | None] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    results: Mapped[dict | None] = mapped_column(JSONB)
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    circuit: Mapped[Circuit] = relationship("Circuit", back_populates="simulation_results")


class Export(Base):
    __tablename__ = "exports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    circuit_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("circuits.id"))
    format: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str | None] = mapped_column(Text)
    file_url: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    circuit: Mapped[Circuit] = relationship("Circuit", back_populates="exports")
