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




@router.post("/content/{dataset_name}")
async def get_dataset_content(dataset_name: str, credentials: Credentials, current_user: dict = Depends(get_current_user)):
    """
    Fetch content of a dataset:
    - If it's a PDS, returns error (use the member-specific route).
    - If it's a sequential dataset, returns the raw content.
    """
    try:
        print(f"Checking if dataset {dataset_name} is partitioned...")

        # Get dataset info
        dataset_info = await make_zowe_request(
            credentials,
            f"ds/{dataset_name}",
            headers={"Accept": "application/json"}
        )

        if isinstance(dataset_info, dict):
            dsorg = dataset_info.get('dsorg', '')
            if 'PO' in dsorg:
                raise HTTPException(status_code=400, detail="Dataset is partitioned (PDS), use the member-specific route.")
            elif 'PS' not in dsorg:
                raise HTTPException(status_code=400, detail=f"Unsupported dataset organization: {dsorg}")

        # Fetch raw content as plain text
        content = await make_zowe_request(
            credentials,
            f"ds/{dataset_name}",
            headers={"Accept": "text/plain"}
        )

        return {"content": content}
    except Exception as e:
        print(f"Error fetching sequential dataset content: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching content: {str(e)}")





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
        print(f"Fetching members for: {dataset_name}")
        print(f"Credentials: {credentials}")
        
        response = await make_zowe_request(
            credentials,
            f"ds/{dataset_name}/member"
        )

        print(f"Raw Zowe response: {response}")

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
        print(f"❌ Error fetching dataset members: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching dataset members: {str(e)}")


@router.post("/{dataset_name}/members/{member_name}")
async def get_member_content(
    dataset_name: str,
    member_name: str,
    credentials: Credentials,
    current_user: dict = Depends(get_current_user)
):
    try:
        print(f"Fetching content for {dataset_name}({member_name})")

        # First try direct text/plain request for PDS member
        try:
            response = await make_zowe_request(
                credentials,
                f"ds/{dataset_name}({member_name})",
                headers={"Accept": "text/plain"}
            )
            if isinstance(response, str):
                return {"content": response}
        except Exception as e:
            print(f"Direct text/plain request failed: {str(e)}")

        # If direct request fails, try getting dataset info
        try:
            dataset_info = await make_zowe_request(
                credentials,
                f"ds/{dataset_name}",
                headers={"Accept": "application/json"}
            )
            
            if not isinstance(dataset_info, dict):
                raise HTTPException(status_code=400, detail="Invalid dataset response")
                
            dsorg = dataset_info.get('dsorg', '')
            
            # If it's a PDS, use IEBGENER
            if 'PO' in dsorg:
                jcl_code = f"""//VIEWJOB  JOB (ACCT),'VIEWMEMBER',CLASS=A,MSGCLASS=A,MSGLEVEL=(1,1)
//STEP1    EXEC PGM=IEBGENER
//SYSUT1   DD DSN={dataset_name}({member_name}),DISP=SHR
//SYSUT2   DD SYSOUT=*
//SYSPRINT DD SYSOUT=*
//SYSIN    DD DUMMY
//"""

                # Submit the job
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
                        if csrf_response.status == 200:
                            csrf_token = csrf_response.headers.get("X-CSRF-ZOSMF-TOKEN")
                            if csrf_token:
                                headers["X-CSRF-ZOSMF-TOKEN"] = csrf_token

                    # Submit the job
                    submit_url = f"https://{credentials.host}:{credentials.port}/zosmf/restjobs/jobs"
                    async with session.post(
                        submit_url,
                        headers=headers,
                        json={"file": "inline", "jcl": jcl_code},
                        ssl=ssl_context
                    ) as submit_response:
                        if submit_response.status != 201:
                            raise HTTPException(status_code=submit_response.status, detail="Failed to submit job")
                        
                        job_info = await submit_response.json()
                        job_name = job_info.get('jobname')
                        job_id = job_info.get('jobid')

                    # Wait for job completion
                    max_retries = 10
                    retry_count = 0
                    while retry_count < max_retries:
                        async with session.get(
                            f"https://{credentials.host}:{credentials.port}/zosmf/restjobs/jobs/{job_name}/{job_id}",
                            headers=headers,
                            ssl=ssl_context
                        ) as status_response:
                            if status_response.status != 200:
                                raise HTTPException(status_code=status_response.status, detail="Failed to get job status")
                            
                            status_data = await status_response.json()
                            if status_data.get('status') == 'OUTPUT':
                                break
                            
                            await asyncio.sleep(1)
                            retry_count += 1

                    if retry_count >= max_retries:
                        raise HTTPException(status_code=504, detail="Job did not complete in time")

                    # Get job output
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
                        if file.get("ddname") == "SYSUT2":
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

            # If it's a sequential dataset, try direct text/plain request
            elif 'PS' in dsorg:
                response = await make_zowe_request(
                    credentials,
                    f"ds/{dataset_name}",
                    headers={"Accept": "text/plain"}
                )
                if isinstance(response, str):
                    return {"content": response}
                else:
                    raise HTTPException(status_code=400, detail="Failed to get sequential dataset content")
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported dataset organization: {dsorg}")

        except Exception as e:
            print(f"Error fetching content: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error fetching content: {str(e)}")

    except Exception as e:
        print(f"Error in get_member_content: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error in get_member_content: {str(e)}")

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
        print(f"Updating content for {dataset_name}({member_name})")
        print(f"Content to update: {content.content}")

        # First try direct update with text/plain
        try:
            response = await make_zowe_request(
                credentials,
                f"ds/{dataset_name}({member_name})",
                method="PUT",
                headers={"Content-Type": "text/plain"},
                data=content.content.encode('utf-8')  # Ensure content is properly encoded
            )
            return {"message": "Member updated successfully"}
        except Exception as e:
            print(f"Direct update failed: {str(e)}")

        # If direct update fails, try using IEBUPDTE for PDS members
        try:
            # First check if it's a PDS
            ds_info = await make_zowe_request(
                credentials,
                f"ds/{dataset_name}",
                method="GET"
            )
            
            if isinstance(ds_info, dict) and ds_info.get('dsorg', {}).get('PO'):  # It's a PDS
                jcl_code = f"""//UPDTEJOB JOB (ACCT),'UPDATEMBR',CLASS=A,MSGCLASS=A,MSGLEVEL=(1,1)
//STEP1    EXEC PGM=IEBUPDTE,PARM=NEW
//SYSPRINT DD SYSOUT=*
//SYSUT2   DD DSN={dataset_name},DISP=OLD
//SYSIN    DD *
./ ADD NAME={member_name}
{content.content}
./ ENDUP
//"""
            else:  # It's a PS dataset
                jcl_code = f"""//UPDTEJOB JOB (ACCT),'UPDATEMBR',CLASS=A,MSGCLASS=A,MSGLEVEL=(1,1)
//STEP1    EXEC PGM=IEBGENER
//SYSPRINT DD SYSOUT=*
//SYSIN    DD DUMMY
//SYSUT1   DD *
{content.content}
//SYSUT2   DD DSN={dataset_name},DISP=OLD
//"""

            # Submit the job
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
                    if csrf_response.status == 200:
                        csrf_token = csrf_response.headers.get("X-CSRF-ZOSMF-TOKEN")
                        if csrf_token:
                            headers["X-CSRF-ZOSMF-TOKEN"] = csrf_token

                # Submit the job
                submit_url = f"https://{credentials.host}:{credentials.port}/zosmf/restjobs/jobs"
                async with session.post(
                    submit_url,
                    headers=headers,
                    json={"file": "inline", "jcl": jcl_code},
                    ssl=ssl_context
                ) as submit_response:
                    if submit_response.status != 201:
                        error_text = await submit_response.text()
                        raise HTTPException(status_code=submit_response.status, detail=f"Failed to submit update job: {error_text}")
                    
                    job_info = await submit_response.json()
                    job_name = job_info.get('jobname')
                    job_id = job_info.get('jobid')

                # Wait for job completion
                max_retries = 10
                retry_count = 0
                while retry_count < max_retries:
                    async with session.get(
                        f"https://{credentials.host}:{credentials.port}/zosmf/restjobs/jobs/{job_name}/{job_id}",
                        headers=headers,
                        ssl=ssl_context
                    ) as status_response:
                        if status_response.status != 200:
                            raise HTTPException(status_code=status_response.status, detail="Failed to get job status")
                        
                        status_data = await status_response.json()
                        if status_data.get('status') == 'OUTPUT':
                            break
                        
                        await asyncio.sleep(1)
                        retry_count += 1

                if retry_count >= max_retries:
                    raise HTTPException(status_code=504, detail="Update job did not complete in time")

                # Check job output for success
                async with session.get(
                    f"https://{credentials.host}:{credentials.port}/zosmf/restjobs/jobs/{job_name}/{job_id}/files",
                    headers=headers,
                    ssl=ssl_context
                ) as files_response:
                    if files_response.status != 200:
                        raise HTTPException(status_code=files_response.status, detail="Failed to get job files")
                    
                    files_data = await files_response.json()

                # Check SYSPRINT for success
                for file in files_data.get("items", []):
                    if file.get("ddname") == "SYSPRINT":
                        file_id = file.get("id")
                        async with session.get(
                            f"https://{credentials.host}:{credentials.port}/zosmf/restjobs/jobs/{job_name}/{job_id}/files/{file_id}/records",
                            headers=headers,
                            ssl=ssl_context
                        ) as record_response:
                            if record_response.status != 200:
                                raise HTTPException(status_code=record_response.status, detail="Failed to get job output")
                            
                            record_data = await record_response.json()
                            output = "\n".join(record_data.get("records", []))
                            
                            if "ERROR" in output or "FAILED" in output:
                                raise HTTPException(status_code=500, detail=f"Update failed: {output}")

                return {"message": "Member updated successfully"}

        except Exception as e:
            print(f"Error updating member content: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error updating member content: {str(e)}")

    except Exception as e:
        print(f"Error updating member content: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating member content: {str(e)}")

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
