from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from ..auth.jwt import get_current_user
import aiohttp
import json
import os
import base64
import ssl
import certifi
import asyncio

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])

class JobSubmitRequest(BaseModel):
    code: str
    job_name: Optional[str] = "JOB1"

class JobResponse(BaseModel):
    job_id: str
    job_name: str
    status: str
    return_code: Optional[str]
    output: Optional[str]

class Credentials(BaseModel):
    host: str
    port: str
    username: str
    password: str

async def make_zowe_request(credentials: Credentials, endpoint: str, method: str = "GET", data: dict = None):
    """Make a request to the Zowe REST API."""
    base_url = f"https://{credentials.host}:{credentials.port}/zosmf/restjobs"
    auth = base64.b64encode(f"{credentials.username}:{credentials.password}".encode()).decode()
    
    headers = {
        "Authorization": f"Basic {auth}",
        "Content-Type": "application/json",
        "X-CSRF-ZOSMF-HEADER": "*",
        "Accept": "application/json"
    }
    
    # Create SSL context with certificate verification disabled for development
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    connector = aiohttp.TCPConnector(ssl=ssl_context)
    
    try:
        async with aiohttp.ClientSession(connector=connector) as session:
            try:
                # First, get a CSRF token
                async with session.get(
                    f"https://{credentials.host}:{credentials.port}/zosmf/",
                    headers={"Authorization": f"Basic {auth}"},
                    ssl=ssl_context
                ) as response:
                    if response.status == 200:
                        csrf_token = response.headers.get("X-CSRF-ZOSMF-TOKEN")
                        if csrf_token:
                            headers["X-CSRF-ZOSMF-TOKEN"] = csrf_token
                    else:
                        error_text = await response.text()
                        print(f"Failed to get CSRF token: Status {response.status}, Response: {error_text}")
                        raise HTTPException(
                            status_code=response.status,
                            detail=f"Failed to authenticate with z/OS: {error_text}"
                        )
                
                # Now make the actual request
                async with session.request(
                    method,
                    f"{base_url}/{endpoint}",
                    headers=headers,
                    json=data,
                    timeout=30
                ) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        error_text = await response.text()
                        print(f"Zowe API error: Status {response.status}, Response: {error_text}")
                        raise HTTPException(
                            status_code=response.status,
                            detail=f"Zowe API error: {error_text}"
                        )
            except aiohttp.ClientError as e:
                print(f"Connection error: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Connection error: {str(e)}")
            except asyncio.TimeoutError:
                print("Request timed out")
                raise HTTPException(status_code=504, detail="Request timed out")
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def get_jobs(credentials: Credentials, current_user: dict = Depends(get_current_user)):
    """Get list of jobs from z/OS."""
    try:
        # Use Zowe REST API to list jobs
        response = await make_zowe_request(
            credentials,
            "jobs"
        )
        
        jobs = []
        if isinstance(response, dict) and 'items' in response:
            for item in response['items']:
                jobs.append({
                    "job_id": item.get('jobid'),
                    "job_name": item.get('jobname'),
                    "owner": item.get('owner'),
                    "status": item.get('status')
                })
        
        return {"jobs": jobs}
    except Exception as e:
        print("Error fetching jobs:", str(e))  # Debug log
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{job_id}")
async def get_job_status(job_id: str, credentials: Credentials, current_user: dict = Depends(get_current_user)):
    """Get status of a specific job."""
    try:
        # Use Zowe REST API to get job status
        response = await make_zowe_request(
            credentials,
            f"jobs/{job_id}"
        )
        
        return {"status": response.get('status')}
    except Exception as e:
        print("Error fetching job status:", str(e))  # Debug log
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{job_id}/output")
async def get_job_output(job_id: str, credentials: Credentials, current_user: dict = Depends(get_current_user)):
    """Get output of a specific job."""
    try:
        # Use Zowe REST API to get job output
        response = await make_zowe_request(
            credentials,
            f"jobs/{job_id}/files"
        )
        
        output = ""
        if isinstance(response, dict) and 'items' in response:
            for item in response['items']:
                if item.get('ddname') == 'JESMSGLG':
                    file_response = await make_zowe_request(
                        credentials,
                        f"jobs/{job_id}/files/{item.get('id')}/records"
                    )
                    if isinstance(file_response, dict) and 'records' in file_response:
                        output += "\n".join(file_response['records'])
        
        return {"output": output}
    except Exception as e:
        print("Error fetching job output:", str(e))  # Debug log
        raise HTTPException(status_code=500, detail=str(e))
