from typing import List, Dict
import httpx
from ..config.settings import settings

class GroqService:
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.base_url = "https://api.groq.com/v1"
        self.model = "mixtral-8x7b-32768"  # Using Mixtral as it's one of the best models available

    async def generate_code(self, prompt: str) -> Dict:
        """
        Generate code and structure based on the user's prompt using Groq.
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {
                                "role": "system",
                                "content": """You are an expert z/OS developer assistant. Your task is to:
                                1. Understand the user's requirements from their prompt
                                2. Generate appropriate z/OS files (COBOL, JCL, etc.)
                                3. Structure the files in a logical way
                                4. Include necessary comments and documentation
                                5. Follow z/OS best practices and standards
                                6. Provide clear explanations for each generated file"""
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        "temperature": 0.7,
                        "max_tokens": 4000
                    }
                )
                
                if response.status_code != 200:
                    raise Exception(f"Groq API error: {response.text}")

                result = response.json()
                return self._parse_response(result)

        except Exception as e:
            raise Exception(f"Error generating code: {str(e)}")

    def _parse_response(self, response: Dict) -> Dict:
        """
        Parse the Groq API response into a structured format.
        """
        try:
            content = response['choices'][0]['message']['content']
            
            # Split the content into files based on markdown code blocks
            files = []
            current_file = None
            current_content = []
            
            for line in content.split('\n'):
                if line.startswith('```'):
                    if current_file:
                        files.append({
                            "name": current_file,
                            "type": "file",
                            "path": f"src/{current_file}",
                            "content": '\n'.join(current_content),
                            "language": self._get_language(current_file)
                        })
                        current_file = None
                        current_content = []
                    else:
                        # Extract filename from the code block header
                        current_file = line.replace('```', '').strip()
                elif current_file:
                    current_content.append(line)
            
            return {
                "files": files,
                "explanation": self._extract_explanation(content)
            }
            
        except Exception as e:
            raise Exception(f"Error parsing response: {str(e)}")

    def _get_language(self, filename: str) -> str:
        """
        Determine the programming language based on file extension.
        """
        ext = filename.split('.')[-1].lower()
        language_map = {
            'cbl': 'cobol',
            'jcl': 'jcl',
            'cpy': 'cobol',
            'txt': 'text',
            'md': 'markdown'
        }
        return language_map.get(ext, 'text')

    def _extract_explanation(self, content: str) -> str:
        """
        Extract the explanation section from the response.
        """
        try:
            # Look for explanation before the first code block
            parts = content.split('```')
            if len(parts) > 0:
                return parts[0].strip()
            return ""
        except:
            return ""

    async def analyze_zos_structure(self) -> Dict:
        """
        Analyze the z/OS structure and provide recommendations.
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are an expert z/OS system analyst. Analyze the given z/OS structure and provide recommendations for organization and best practices."
                            },
                            {
                                "role": "user",
                                "content": "Analyze the current z/OS structure and provide recommendations for organization and best practices."
                            }
                        ],
                        "temperature": 0.7,
                        "max_tokens": 2000
                    }
                )
                
                if response.status_code != 200:
                    raise Exception(f"Groq API error: {response.text}")

                result = response.json()
                return {
                    "analysis": result['choices'][0]['message']['content'],
                    "recommendations": self._extract_recommendations(result['choices'][0]['message']['content'])
                }

        except Exception as e:
            raise Exception(f"Error analyzing z/OS structure: {str(e)}")

    def _extract_recommendations(self, content: str) -> List[str]:
        """
        Extract specific recommendations from the analysis.
        """
        try:
            recommendations = []
            for line in content.split('\n'):
                if line.strip().startswith('- ') or line.strip().startswith('* '):
                    recommendations.append(line.strip()[2:])
            return recommendations
        except:
            return [] 