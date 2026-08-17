from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
import uuid
from ..db.database import get_db
from ..db.models import Org, KnowledgeBase
from ..db.schemas import OrgCreate, OrgResponse, OrgTreeNode, KBCreate, KBResponse
from ..workers.tasks import generation_pipeline_task

router = APIRouter(prefix="/api/orgs", tags=["Organizations"])

async def _get_org_by_id_or_slug(db: AsyncSession, identifier: str) -> Optional[Org]:
    try:
        val = uuid.UUID(identifier)
        stmt = select(Org).options(selectinload(Org.knowledge_bases)).where((Org.id == val) | (Org.slug == identifier))
    except ValueError:
        stmt = select(Org).options(selectinload(Org.knowledge_bases)).where(Org.slug == identifier)
    result = await db.execute(stmt)
    return result.scalars().first()

@router.get("", response_model=List[OrgResponse])
async def list_orgs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Org))
    return result.scalars().all()

@router.post("", response_model=OrgResponse)
async def create_org(org: OrgCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Org).where(Org.slug == org.slug))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Organization slug already exists")
    new_org = Org(**org.model_dump())
    db.add(new_org)
    await db.commit()
    await db.refresh(new_org)
    return new_org

@router.get("/{org_id}", response_model=OrgResponse)
async def get_org(org_id: str, db: AsyncSession = Depends(get_db)):
    org = await _get_org_by_id_or_slug(db, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Org not found")
    return org

@router.get("/{org_id}/tree", response_model=OrgTreeNode)
async def get_org_tree(org_id: str, db: AsyncSession = Depends(get_db)):
    root_org = await _get_org_by_id_or_slug(db, org_id)
    if not root_org:
        raise HTTPException(status_code=404, detail="Org not found")

    async def fetch_tree(current_org_id: UUID):
        result = await db.execute(
            select(Org).options(selectinload(Org.knowledge_bases)).where(Org.id == current_org_id)
        )
        current = result.scalars().first()
        if not current:
            return None
        kbs = []
        if current.knowledge_bases:
            kbs = [KBResponse.model_validate(k) for k in current.knowledge_bases]
            
        result_children = await db.execute(select(Org).where(Org.parent_org_id == current_org_id))
        children = result_children.scalars().all()
        child_nodes = []
        for child in children:
            c = await fetch_tree(child.id)
            if c:
                child_nodes.append(c)
                
        node = OrgTreeNode(
            id=current.id,
            name=current.name,
            slug=current.slug,
            github_org=current.github_org,
            parent_org_id=current.parent_org_id,
            created_at=current.created_at,
            children=child_nodes,
            knowledge_bases=kbs,
            apps=kbs,
        )
        return node
        
    tree = await fetch_tree(root_org.id)
    return tree

@router.post("/{org_id}/apps", response_model=KBResponse)
async def create_app_kb(org_id: str, kb: KBCreate, db: AsyncSession = Depends(get_db)):
    org = await _get_org_by_id_or_slug(db, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Org not found")
        
    new_kb = KnowledgeBase(
        org_id=org.id,
        app_name=kb.app_name,
        source_urls=[s.model_dump() for s in kb.source_urls]
    )
    db.add(new_kb)
    await db.commit()
    await db.refresh(new_kb)
    
    generation_pipeline_task.delay(str(new_kb.id))
    
    return new_kb
