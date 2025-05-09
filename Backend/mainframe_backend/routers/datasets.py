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

router = APIRouter(prefix="/api/datasets", tags=["Datasets"])

class Credentials(BaseModel):
    host: str
    port: str
    username: str
    password: str

async def make_zowe_request(credentials: Credentials, endpoint: str, method: str = "GET", data: dict = None):
    """Make a request to the Zowe REST API."""
    base_url = f"https://{credentials.host}:{credentials.port}/zosmf/restfiles"
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
                    response_text = await response.text()
                    if response.status == 200:
                        try:
                            return json.loads(response_text)
                        except json.JSONDecodeError:
                            raise HTTPException(
                                status_code=500,
                                detail=f"Invalid JSON response from z/OS: {response_text}"
                            )
                    else:
                        print(f"Zowe API error: Status {response.status}, Response: {response_text}")
                        raise HTTPException(
                            status_code=response.status,
                            detail=f"Zowe API error: {response_text}"
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
async def get_datasets(credentials: Credentials, current_user: dict = Depends(get_current_user)):
    """Get list of datasets from z/OS."""
    try:
        # Use Zowe REST API to list datasets
        pattern = f"{credentials.username}.*"
        response = await make_zowe_request(
            credentials,
            f"ds?dslevel={pattern}"
        )
        
        datasets = []
        if isinstance(response, dict) and 'items' in response:
            for item in response['items']:
                datasets.append({
                    "name": item.get('dsname'),
                    "type": "dataset",
                    "volume": item.get('vol'),
                    "device": item.get('device'),
                    "dsorg": item.get('dsorg'),
                    "recfm": item.get('recfm'),
                    "lrecl": item.get('lrecl'),
                    "blksize": item.get('blksize')
                })
        
        return {"datasets": datasets}
    except Exception as e:
        print("Error fetching datasets:", str(e))  # Debug log
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{dataset_name}")
async def get_dataset_members(dataset_name: str, credentials: Credentials, current_user: dict = Depends(get_current_user)):
    """Get members of a dataset."""
    try:
        # Use Zowe REST API to list dataset members
        response = await make_zowe_request(
            credentials,
            f"ds/{dataset_name}/member"
        )
        
        members = []
        if isinstance(response, dict) and 'items' in response:
            for item in response['items']:
                members.append({
                    "name": item.get('member'),
                    "type": "member"
                })
        
        return {"members": members}
    except Exception as e:
        print("Error fetching dataset members:", str(e))  # Debug log
        raise HTTPException(status_code=500, detail=str(e))
