from typing import List, Dict
import openai
from ..config.settings import settings

class AIService:
    def __init__(self):
        openai.api_key = settings.OPENAI_API_KEY

    async def generate_files(self, prompt: str) -> List[Dict]:
        """
        Generate z/OS files based on the user's prompt using AI.
        """
        try:
            # Create a system message that explains the context
            system_message = """
            You are an expert z/OS developer assistant. Your task is to:
            1. Understand the user's requirements from their prompt
            2. Generate appropriate z/OS files (COBOL, JCL, etc.)
            3. Structure the files in a logical way
            4. Include necessary comments and documentation
            """

            # Create the completion
            response = await openai.ChatCompletion.acreate(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=2000
            )

            # Parse the AI response and structure it into files
            ai_response = response.choices[0].message.content
            files = self._parse_ai_response(ai_response)
            
            return files

        except Exception as e:
            raise Exception(f"Error generating files: {str(e)}")

    def _parse_ai_response(self, ai_response: str) -> List[Dict]:
        """
        Parse the AI response into a structured list of files.
        """
        # This is a simplified example. In a real implementation,
        # you would need more sophisticated parsing logic
        files = []
        
        # Example structure for a COBOL program
        files.append({
            "name": "main.cbl",
            "type": "file",
            "path": "src/main.cbl",
            "content": ai_response,
            "language": "cobol"
        })

        # Add JCL file
        files.append({
            "name": "job.jcl",
            "type": "file",
            "path": "jcl/job.jcl",
            "content": "//JOB JOB (ACCT),'JOB NAME'\n//STEP1 EXEC PGM=COBOL\n//SYSPRINT DD SYSOUT=*\n//SYSIN DD *\n",
            "language": "jcl"
        })

        return files

    async def analyze_zos_structure(self) -> Dict:
        """
        Analyze the z/OS structure and return a tree representation.
        """
        # This would typically interact with z/OS to get the actual structure
        return {
            "name": "z/OS",
            "type": "folder",
            "children": [
                {
                    "name": "src",
                    "type": "folder",
                    "children": [
                        {
                            "name": "main.cbl",
                            "type": "file",
                            "path": "src/main.cbl"
                        }
                    ]
                },
                {
                    "name": "jcl",
                    "type": "folder",
                    "children": [
                        {
                            "name": "job.jcl",
                            "type": "file",
                            "path": "jcl/job.jcl"
                        }
                    ]
                }
            ]
        } 