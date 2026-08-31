from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.configuration.database import get_db
from app.services.excel_import_service import ExcelImportService
from app.utilities.logger import logger

router = APIRouter()


@router.post("/projects/{project_id}/excel/upload-preview")
async def preview_excel_model(
    project_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Parses an uploaded Excel file (.xlsx, .xls) and returns a dry-run preview
    of parsed classes, attributes, and relationships without modifying the database.
    """
    if not file.filename.lower().endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files (.xlsx, .xls) are supported.")

    try:
        content = await file.read()
        svc = ExcelImportService(db)
        parsed = svc.parse_excel_workbook(content)
        return {
            "project_id": project_id,
            "filename": file.filename,
            "parsed": parsed
        }
    except Exception as e:
        logger.error(f"Error parsing Excel file preview: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Failed to parse Excel file: {str(e)}")


@router.post("/projects/{project_id}/excel/import")
async def import_excel_model_to_project(
    project_id: str,
    file: UploadFile = File(...),
    mode: str = Query("merge", description="Import mode: 'merge' or 'overwrite'"),
    db: Session = Depends(get_db)
):
    """
    Parses an uploaded Excel file and imports the parsed concepts directly
    into the local application DB for the specified project.
    Populates both Semantic Ontology Layer and Target Graph Schema Layer.
    """
    if not file.filename.lower().endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files (.xlsx, .xls) are supported.")

    if mode.lower() not in ["merge", "overwrite"]:
        raise HTTPException(status_code=400, detail="Import mode must be either 'merge' or 'overwrite'.")

    try:
        content = await file.read()
        svc = ExcelImportService(db)
        result = svc.import_excel_to_project(project_id, content, mode=mode.lower())
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error importing Excel model to project {project_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to import Excel model to project: {str(e)}")


@router.get("/excel/template")
def download_excel_template(db: Session = Depends(get_db)):
    """
    Generates and downloads a standard sample Excel template workbook (.xlsx)
    pre-populated with sample Classes, Attributes, and Relationships.
    """
    try:
        svc = ExcelImportService(db)
        output = svc.generate_sample_template()
        filename = "quick_pasteur_ontology_template.xlsx"
        headers = {
            "Content-Disposition": f"attachment; filename={filename}"
        }
        return Response(
            content=output.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers
        )
    except Exception as e:
        logger.error(f"Error generating Excel template: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate Excel template: {str(e)}")
