from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.configuration.database import get_db
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectClone, ProjectResponse
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["Projects"])

# Mock default user ID for API demonstration (in production passed via JWT auth dependency)
DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001"


@router.get("", response_model=List[ProjectResponse])
def get_projects(db: Session = Depends(get_db)):
    svc = ProjectService(db)
    return svc.get_projects(user_id=DEFAULT_USER_ID)


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(project_in: ProjectCreate, db: Session = Depends(get_db)):
    svc = ProjectService(db)
    try:
        return svc.create_project(user_id=DEFAULT_USER_ID, project_in=project_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project_by_id(project_id: str, db: Session = Depends(get_db)):
    svc = ProjectService(db)
    project = svc.get_project_by_id(project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: str, project_in: ProjectUpdate, db: Session = Depends(get_db)):
    svc = ProjectService(db)
    try:
        return svc.update_project(project_id, project_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{project_id}/clone", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def clone_project(project_id: str, clone_in: ProjectClone, db: Session = Depends(get_db)):
    svc = ProjectService(db)
    try:
        return svc.clone_project(project_id, user_id=DEFAULT_USER_ID, clone_in=clone_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{project_id}/archive", response_model=ProjectResponse)
def archive_project(project_id: str, db: Session = Depends(get_db)):
    svc = ProjectService(db)
    try:
        return svc.archive_project(project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: str, db: Session = Depends(get_db)):
    svc = ProjectService(db)
    success = svc.delete_project(project_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
