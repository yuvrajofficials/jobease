from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from typing import List, Optional
from ..auth.jwt import get_current_user
import aiohttp
import base64
import ssl
import asyncio
import json

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
    """Make a request to the Zowe REST API with detailed error logging."""
    base_url = f"https://{credentials.host}:{credentials.port}/zosmf/restjobs"
    auth = base64.b64encode(f"{credentials.username}:{credentials.password}".encode()).decode()

    headers = {
        "Authorization": f"Basic {auth}",
        "Content-Type": "application/json",
        "X-CSRF-ZOSMF-HEADER": "*",
        "Accept": "application/json"
    }

    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    connector = aiohttp.TCPConnector(ssl=ssl_context)

    try:
        async with aiohttp.ClientSession(connector=connector) as session:
            # CSRF token step
            csrf_url = f"https://{credentials.host}:{credentials.port}/zosmf/"
            async with session.get(csrf_url, headers={"Authorization": f"Basic {auth}"}, ssl=ssl_context) as response:
                csrf_text = await response.text()
                if response.status == 200:
                    csrf_token = response.headers.get("X-CSRF-ZOSMF-TOKEN")
                    if csrf_token:
                        headers["X-CSRF-ZOSMF-TOKEN"] = csrf_token
                else:
                    print(f"[CSRF ERROR] Status: {response.status} | Body: {csrf_text}")
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"Failed to authenticate with z/OS: {csrf_text}"
                    )

            # Main API request
            url = f"{base_url}/{endpoint}"
            print(f"Making request to: {url}")  # Debug log
            print(f"With headers: {headers}")   # Debug log
            
            async with session.request(method, url, headers=headers, json=data, timeout=30) as response:
                response_text = await response.text()
                print(f"Response status: {response.status}")  # Debug log
                print(f"Response text: {response_text[:200]}...")  # Debug log first 200 chars
                
                if response.status == 200:
                    try:
                        return json.loads(response_text)
                    except Exception as json_err:
                        print(f"[JSON ERROR] Could not parse response from {endpoint}: {response_text}")
                        raise HTTPException(status_code=500, detail="Invalid JSON returned from Zowe API.")
                else:
                    print(f"[ZOWE API ERROR] Endpoint: {endpoint} | Status: {response.status} | Response: {response_text}")
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"Zowe API error ({response.status}): {response_text}"
                    )

    except aiohttp.ClientError as e:
        print(f"[CLIENT ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Connection error: {str(e)}")
    except asyncio.TimeoutError:
        print(f"[TIMEOUT ERROR] Request to {endpoint} timed out")
        raise HTTPException(status_code=504, detail="Request timed out")
    except Exception as e:
        print(f"[UNEXPECTED ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@router.post("/")
async def get_jobs(
    credentials: Credentials = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Get list of jobs from z/OS."""
    try:
        response = await make_zowe_request(credentials, "jobs")
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
        print(f"[ERROR FETCHING JOBS] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching jobs: {str(e)}")


@router.get("/{job_id}")
async def get_job_status(
    job_id: str,
    credentials: Credentials = Depends(),
    current_user: dict = Depends(get_current_user)
):
    """Get status of a specific job."""
    try:
        response = await make_zowe_request(credentials, f"jobs/{job_id}")
        return {"status": response.get('status')}
    except Exception as e:
        print(f"[ERROR FETCHING JOB STATUS] Job ID: {job_id} | {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching job status: {str(e)}")


@router.post("/{job_id}/output")
async def get_job_output(
    job_id: str,
    credentials: Credentials = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Get output of a specific job."""
    try:
        response = await make_zowe_request(credentials, f"jobs/{job_id}/files")

        output = ""
        if isinstance(response, dict) and 'items' in response:
            for item in response['items']:
                if item.get('ddname') == 'JESMSGLG':
                    try:
                        file_response = await make_zowe_request(
                            credentials,
                            f"jobs/{job_id}/files/{item.get('id')}/records"
                        )
                        if isinstance(file_response, dict) and 'records' in file_response:
                            output += "\n".join(file_response['records'])
                    except Exception as nested_e:
                        print(f"[ERROR FETCHING FILE OUTPUT] File ID: {item.get('id')} | {str(nested_e)}")
                        raise HTTPException(status_code=500, detail=f"Error fetching file output: {str(nested_e)}")

        return {"output": output}
    except Exception as e:
        print(f"[ERROR FETCHING JOB OUTPUT] Job ID: {job_id} | {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching job output: {str(e)}")
