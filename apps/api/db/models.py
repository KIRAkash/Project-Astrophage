import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, JSON, Integer, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from .database import Base
import enum

class KBStatus(str, enum.Enum):
    queued = "queued"
    ingesting = "ingesting"
    generating = "generating"
    in_review = "in_review"
    published = "published"
    failed = "failed"

class MonitorMode(str, enum.Enum):
    webhook = "webhook"
    polling = "polling"

class InterfaceType(str, enum.Enum):
    rest_endpoint = "rest_endpoint"
    grpc_service = "grpc_service"
    event_topic = "event_topic"
    shared_model = "shared_model"
    sdk_client = "sdk_client"

class Org(Base):
    __tablename__ = "orgs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    github_org = Column(String, nullable=True)
    parent_org_id = Column(UUID(as_uuid=True), ForeignKey("orgs.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    parent = relationship("Org", remote_side=[id], back_populates="children")
    children = relationship("Org", back_populates="parent")
    knowledge_bases = relationship("KnowledgeBase", back_populates="org")
    org_kbs = relationship("OrgKB", back_populates="org")
    contracts = relationship("OrgInterfaceContract", back_populates="org")

class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("orgs.id"))
    app_name = Column(String, nullable=False)
    status = Column(Enum(KBStatus), default=KBStatus.queued)
    source_urls = Column(JSON, default=list)
    git_repo_url = Column(String, nullable=True)
    pr_url = Column(String, nullable=True)
    org_pr_url = Column(String, nullable=True)
    gcs_archive_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    org = relationship("Org", back_populates="knowledge_bases")
    events = relationship("KBEvent", back_populates="kb")
    source_monitors = relationship("SourceMonitor", back_populates="kb")
    contracts = relationship("OrgInterfaceContract", back_populates="kb")

class KBEvent(Base):
    __tablename__ = "kb_events"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kb_id = Column(UUID(as_uuid=True), ForeignKey("knowledge_bases.id"))
    event_type = Column(String, nullable=False)
    payload = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    kb = relationship("KnowledgeBase", back_populates="events")

class SourceMonitor(Base):
    __tablename__ = "source_monitors"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kb_id = Column(UUID(as_uuid=True), ForeignKey("knowledge_bases.id"))
    source_type = Column(String, default="github", nullable=False)
    repo_url = Column(String, nullable=False)  # Retained for compatibility & canonical source URL
    source_url = Column(String, nullable=True)
    webhook_id = Column(String, nullable=True)
    last_commit_sha = Column(String, nullable=True)
    last_sync_state = Column(JSON, default=dict)
    config = Column(JSON, default=dict)
    incremental_enabled = Column(Boolean, default=True)
    monitor_mode = Column(Enum(MonitorMode), default=MonitorMode.webhook)
    last_synced_at = Column(DateTime, default=datetime.utcnow)

    kb = relationship("KnowledgeBase", back_populates="source_monitors")

    @property
    def target_url(self) -> str:
        return self.source_url or self.repo_url

class OrgKB(Base):

    __tablename__ = "org_kbs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("orgs.id"))
    git_repo_url = Column(String, nullable=True)
    status = Column(Enum(KBStatus), default=KBStatus.queued)
    pr_url = Column(String, nullable=True)
    trigger_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    org = relationship("Org", back_populates="org_kbs")

class OrgInterfaceContract(Base):
    __tablename__ = "org_interface_contracts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("orgs.id"), nullable=False, index=True)
    kb_id = Column(UUID(as_uuid=True), ForeignKey("knowledge_bases.id"), nullable=False, index=True)
    app_name = Column(String, nullable=False, index=True)
    interface_type = Column(Enum(InterfaceType), nullable=False)
    identifier = Column(String, nullable=False, index=True)  # e.g., "/api/v1/auth/login", "nte.trades.matched", "MarketData"
    page_path = Column(String, nullable=False)  # e.g., "summaries/api-spec.md"
    anchor_slug = Column(String, nullable=True)  # e.g., "login", "matched-trades"
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    org = relationship("Org", back_populates="contracts")
    kb = relationship("KnowledgeBase", back_populates="contracts")

