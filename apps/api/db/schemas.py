from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import List, Optional, Literal, Dict, Any
from uuid import UUID
from datetime import datetime
from .models import KBStatus

class CamelModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
    )

class OrgCreate(CamelModel):
    name: str
    slug: str
    parent_org_id: Optional[UUID] = None
    github_org: Optional[str] = None

class OrgResponse(CamelModel):
    id: UUID
    name: str
    slug: str
    github_org: Optional[str] = None
    parent_org_id: Optional[UUID] = None
    created_at: datetime

class SourceUrlItem(CamelModel):
    type: Literal['github', 'confluence', 'notion', 'jira', 'upload']
    url: str

class KBCreate(CamelModel):
    app_name: str
    source_urls: List[SourceUrlItem]

class KBResponse(CamelModel):
    id: UUID
    org_id: UUID
    app_name: str
    status: KBStatus
    source_urls: List[SourceUrlItem] = []
    git_repo_url: Optional[str] = None
    pr_url: Optional[str] = None
    org_pr_url: Optional[str] = None
    gcs_archive_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class KBEventResponse(CamelModel):
    id: UUID
    kb_id: UUID
    event_type: str
    payload: Dict[str, Any] = {}
    created_at: datetime

class KBDetailResponse(KBResponse):
    events: List[KBEventResponse] = []

class OrgTreeNode(OrgResponse):
    children: List['OrgTreeNode'] = []
    knowledge_bases: List[KBResponse] = []
    apps: List[KBResponse] = []

class KBStatusUpdate(CamelModel):
    status: KBStatus

class WebhookPushPayload(CamelModel):
    ref: str
    before: str
    after: str
    repository: Dict[str, Any]
    commits: List[Dict[str, Any]]

class WebhookPRPayload(CamelModel):
    action: str
    number: int
    pull_request: Dict[str, Any]
    repository: Dict[str, Any]
