from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from ..auth.jwt import get_current_user
import aiohttp
import json
import base64
import ssl
import asyncio

router = APIRouter(prefix="/api/datasets", tags=["Datasets"])

class Credentials(BaseModel):
    host: str
    port: str
    username: str
    password: str

class FileContent(BaseModel):
    content: str

async def make_zowe_request(credentials: Credentials, endpoint: str, method: str = "GET", data: dict = None, headers: dict = None):
    try:
        print(f"\n=== Making Zowe Request ===")
        print(f"Endpoint: {endpoint}")
        print(f"Method: {method}")
        
        base_url = f"https://{credentials.host}:{credentials.port}/zosmf/restfiles"
        auth = base64.b64encode(f"{credentials.username}:{credentials.password}".encode()).decode()

        request_headers = {
            "Authorization": f"Basic {auth}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-CSRF-ZOSMF-HEADER": "*"
        }

        # Merge custom headers if provided
        if headers:
            request_headers.update(headers)

        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        connector = aiohttp.TCPConnector(ssl=ssl_context)

        async with aiohttp.ClientSession(connector=connector) as session:
            # Pre-flight to get CSRF token
            print("Getting CSRF token...")
            async with session.get(
                f"https://{credentials.host}:{credentials.port}/zosmf/",
                headers={"Authorization": f"Basic {auth}"},
                ssl=ssl_context
            ) as csrf_response:
                if csrf_response.status != 200:
                    error_text = await csrf_response.text()
                    print(f"CSRF token request failed: {error_text}")
                    raise HTTPException(status_code=401, detail=f"CSRF token request failed: {error_text}")

                csrf_token = csrf_response.headers.get("X-CSRF-ZOSMF-TOKEN")
                if csrf_token:
                    request_headers["X-CSRF-ZOSMF-TOKEN"] = csrf_token
                    print("CSRF token obtained successfully")
                else:
                    print("No CSRF token in response")

            # Make the main request
            print(f"Making main request to: {base_url}/{endpoint}")
            print(f"Request headers: {request_headers}")
            async with session.request(
                method,
                f"{base_url}/{endpoint}",
                headers=request_headers,
                json=data,
                timeout=30
            ) as response:
                response_text = await response.text()
                print(f"Response status: {response.status}")
                print(f"Response headers: {response.headers}")
                print(f"Response text: {response_text[:500]}...")  # Print first 500 chars of response
                
                if response.status == 200:
                    try:
                        return json.loads(response_text)
                    except json.JSONDecodeError:
                        # If response is not JSON, return it as a string
                        return response_text
                else:
                    error_detail = f"Zowe API error: {response_text}" if response_text else "Zowe API error"
                    raise HTTPException(status_code=response.status, detail=error_detail)
    except aiohttp.ClientError as e:
        print(f"Connection error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Connection error: {str(e)}")
    except asyncio.TimeoutError:
        print("Request timed out")
        raise HTTPException(status_code=504, detail="Request timed out")
    except Exception as e:
        print(f"Unexpected error in make_zowe_request: {str(e)}")
        print(f"Error type: {type(e)}")
        print(f"Error details: {e.__dict__ if hasattr(e, '__dict__') else 'No details'}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@router.post("/")
async def get_datasets(credentials: Credentials, current_user: dict = Depends(get_current_user)):
    try:
        # Get user datasets
        user_pattern = f"{credentials.username}.*"
        user_response = await make_zowe_request(
            credentials,
            f"ds?dslevel={user_pattern}"
        )

        # Get public datasets
        public_pattern = "PUBLIC.*"
        public_response = await make_zowe_request(
            credentials,
            f"ds?dslevel={public_pattern}"
        )

        datasets = []
        
        # Process user datasets
        if isinstance(user_response, dict) and 'items' in user_response:
            for item in user_response['items']:
                datasets.append({
                    "name": item.get('dsname'),
                    "type": "dataset",
                    "volume": item.get('vol'),
                    "device": item.get('device'),
                    "dsorg": item.get('dsorg'),
                    "recfm": item.get('recfm'),
                    "lrecl": item.get('lrecl'),
                    "blksize": item.get('blksize'),
                    "isPublic": False
                })

        # Process public datasets
        if isinstance(public_response, dict) and 'items' in public_response:
            for item in public_response['items']:
                datasets.append({
                    "name": item.get('dsname'),
                    "type": "dataset",
                    "volume": item.get('vol'),
                    "device": item.get('device'),
                    "dsorg": item.get('dsorg'),
                    "recfm": item.get('recfm'),
                    "lrecl": item.get('lrecl'),
                    "blksize": item.get('blksize'),
                    "isPublic": True
                })

        return {"datasets": datasets}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching datasets: {str(e)}")

@router.post("/{dataset_name}/members")
async def get_dataset_members(dataset_name: str, credentials: Credentials, current_user: dict = Depends(get_current_user)):
    try:
        response = await make_zowe_request(
            credentials,
            f"ds/{dataset_name}/member"
        )

        members = []
        if isinstance(response, dict) and 'items' in response:
            for item in response['items']:
                members.append({
                    "name": item.get('member'),
                    "type": "member",
                    "id": item.get('id'),
                    "version": item.get('version'),
                    "modified": item.get('modified')
                })

        return {"members": members}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching dataset members: {str(e)}")

@router.post("/{dataset_name}/members/{member_name}")
async def get_member_content(
    dataset_name: str,
    member_name: str,
    credentials: Credentials,
    current_user: dict = Depends(get_current_user)
):
    try:
        print(f"=== Fetching content for {dataset_name}({member_name}) via /records ===")

        base_url = f"https://{credentials.host}:{credentials.port}/zosmf/restfiles"
        url = f"{base_url}/ds/{dataset_name}/member/{member_name}/records"
        auth = base64.b64encode(f"{credentials.username}:{credentials.password}".encode()).decode()

        headers = {
            "Authorization": f"Basic {auth}",
            "Accept": "application/json",
            "X-CSRF-ZOSMF-HEADER": "*"
        }

        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        connector = aiohttp.TCPConnector(ssl=ssl_context)

        async with aiohttp.ClientSession(connector=connector) as session:
            # CSRF token preflight
            async with session.get(f"https://{credentials.host}:{credentials.port}/zosmf/",
                                   headers={"Authorization": f"Basic {auth}"},
                                   ssl=ssl_context) as csrf_response:
                if csrf_response.status == 200:
                    csrf_token = csrf_response.headers.get("X-CSRF-ZOSMF-TOKEN")
                    if csrf_token:
                        headers["X-CSRF-ZOSMF-TOKEN"] = csrf_token
                else:
                    raise HTTPException(status_code=401, detail="CSRF token request failed")

            async with session.get(url, headers=headers, ssl=ssl_context) as response:
                text = await response.text()
                print(f"Response status: {response.status}")
                print(f"Raw response: {text[:200]}...")

                if response.status == 200:
                    data = json.loads(text)
                    if 'records' in data and isinstance(data['records'], list):
                        content = '\n'.join(data['records'])
                        return {"content": content}
                    else:
                        raise HTTPException(status_code=500, detail="Invalid response: 'records' field missing")
                else:
                    raise HTTPException(status_code=response.status, detail=text)

    except Exception as e:
        print(f"Final Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching member content via /records: {str(e)}")



@router.post("/{dataset_name}/members/{member_name}/view")
async def view_member_via_jes(
    dataset_name: str,
    member_name: str,
    credentials: Credentials,
    current_user: dict = Depends(get_current_user)
):
    try:
        import time

        print(f"Submitting view job for: {dataset_name}({member_name})")

        jcl_code = f"""//VIEWJOB  JOB (ACCT),'VIEWMEMBER',CLASS=A,MSGCLASS=A,MSGLEVEL=(1,1)
//STEP1    EXEC PGM=IEBGENER
//SYSUT1   DD DSN={dataset_name}({member_name}),DISP=SHR
//SYSUT2   DD SYSOUT=*
//SYSPRINT DD SYSOUT=*
//SYSIN    DD DUMMY
"""

        auth = base64.b64encode(f"{credentials.username}:{credentials.password}".encode()).decode()
        headers = {
            "Authorization": f"Basic {auth}",
            "Content-Type": "application/json",
            "X-CSRF-ZOSMF-HEADER": "*"
        }

        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

        # Get CSRF token
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"https://{credentials.host}:{credentials.port}/zosmf/",
                headers={"Authorization": f"Basic {auth}"},
                ssl=ssl_context
            ) as csrf_response:
                if csrf_response.status == 200:
                    csrf_token = csrf_response.headers.get("X-CSRF-ZOSMF-TOKEN")
                    if csrf_token:
                        headers["X-CSRF-ZOSMF-TOKEN"] = csrf_token
                else:
                    raise HTTPException(status_code=401, detail="Failed to retrieve CSRF token")

            # Submit the job
            async with session.post(
                f"https://{credentials.host}:{credentials.port}/zosmf/restjobs/jobs",
                headers=headers,
                json={"job": jcl_code},
                ssl=ssl_context
            ) as submit_response:
                if submit_response.status != 201:
                    text = await submit_response.text()
                    raise HTTPException(status_code=submit_response.status, detail=f"Failed to submit job: {text}")

                job_info = await submit_response.json()
                job_id = job_info.get("jobid")
                job_name = job_info.get("jobname")

        print(f"Submitted job {job_name} ({job_id})")

        # Wait a moment to ensure the job is completed
        await asyncio.sleep(2)

        # Fetch job output
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"https://{credentials.host}:{credentials.port}/zosmf/restjobs/jobs/{job_name}/{job_id}/files",
                headers=headers,
                ssl=ssl_context
            ) as files_response:
                if files_response.status != 200:
                    raise HTTPException(status_code=files_response.status, detail="Failed to get job files")
                files_data = await files_response.json()

            output = ""
            for file in files_data.get("items", []):
                if file.get("ddname") == "SYSUT2":  # Output of the file
                    file_id = file.get("id")
                    async with session.get(
                        f"https://{credentials.host}:{credentials.port}/zosmf/restjobs/jobs/{job_name}/{job_id}/files/{file_id}/records",
                        headers=headers,
                        ssl=ssl_context
                    ) as record_response:
                        if record_response.status != 200:
                            raise HTTPException(status_code=record_response.status, detail="Failed to get job output records")
                        record_data = await record_response.json()
                        output = "\n".join(record_data.get("records", []))

        if not output:
            raise HTTPException(status_code=404, detail="No output content found in job result")

        return {"content": output}

    except Exception as e:
        print(f"Exception: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error viewing member via JES: {str(e)}")


@router.put("/{dataset_name}/members/{member_name}")
async def update_member_content(
    dataset_name: str,
    member_name: str,
    content: FileContent,
    credentials: Credentials,
    current_user: dict = Depends(get_current_user)
):
    try:
        response = await make_zowe_request(
            credentials,
            f"ds/{dataset_name}/member/{member_name}",
            method="PUT",
            data={"content": content.content}
        )

        return {"message": "Member updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating member: {str(e)}")

@router.post("/{dataset_name}/members/{member_name}/execute")
async def execute_member(
    dataset_name: str,
    member_name: str,
    credentials: Credentials,
    current_user: dict = Depends(get_current_user)
):
    try:
        # First get the member content
        content_response = await make_zowe_request(
            credentials,
            f"ds/{dataset_name}/member/{member_name}"
        )

        if not isinstance(content_response, dict) or 'content' not in content_response:
            raise HTTPException(status_code=404, detail="Member content not found")

        # Submit the job using the JES REST API
        jes_url = f"https://{credentials.host}:{credentials.port}/zosmf/restjobs/jobs"
        auth = base64.b64encode(f"{credentials.username}:{credentials.password}".encode()).decode()

        headers = {
            "Authorization": f"Basic {auth}",
            "Content-Type": "application/json",
            "X-CSRF-ZOSMF-HEADER": "*"
        }

        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

        async with aiohttp.ClientSession() as session:
            # Get CSRF token
            async with session.get(
                f"https://{credentials.host}:{credentials.port}/zosmf/",
                headers={"Authorization": f"Basic {auth}"},
                ssl=ssl_context
            ) as csrf_response:
                if csrf_response.status != 200:
                    raise HTTPException(status_code=401, detail="CSRF token request failed")

                csrf_token = csrf_response.headers.get("X-CSRF-ZOSMF-TOKEN")
                if csrf_token:
                    headers["X-CSRF-ZOSMF-TOKEN"] = csrf_token

            # Submit the job
            async with session.post(
                jes_url,
                headers=headers,
                json={"file": f"//'{dataset_name}({member_name})'"},
                ssl=ssl_context
            ) as response:
                if response.status != 201:
                    response_text = await response.text()
                    raise HTTPException(status_code=response.status, detail=f"Failed to submit job: {response_text}")

                job_info = await response.json()
                return {
                    "message": "Job submitted successfully",
                    "jobId": job_info.get("jobid"),
                    "jobName": job_info.get("jobname")
                }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error executing member: {str(e)}")
