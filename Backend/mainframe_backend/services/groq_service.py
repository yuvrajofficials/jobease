from typing import List, Dict
import httpx
import logging
import json
from ..config.settings import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GroqService:
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.base_url = "https://api.groq.com/openai/v1"
        self.model = "llama3-70b-8192"
        logger.info(f"Backend: Initializing GroqService with model: {self.model}")
        self.system_prompt = """You are an expert z/OS and mainframe development assistant with deep knowledge of:
1. z/OS system operations and administration
2. JCL (Job Control Language) programming and best practices
3. COBOL programming and modern COBOL features
4. Dataset management and organization
5. Mainframe security and access control
6. z/OS utilities and tools
7. Mainframe performance optimization
8. z/OS networking and communication

Your task is to:
1. Understand user requirements and provide accurate mainframe-specific solutions
2. Generate appropriate z/OS files (COBOL, JCL, etc.) following mainframe standards
3. Provide detailed explanations of mainframe concepts and operations
4. Suggest best practices for mainframe development and operations
5. Help with dataset creation, management, and organization
6. Assist with job submission and monitoring
7. Guide users through mainframe security and access control
8. Provide performance optimization recommendations

Always consider:
- z/OS security requirements and best practices
- Dataset naming conventions and organization
- Job scheduling and resource optimization
- Error handling and recovery procedures
- Mainframe-specific performance considerations"""

        self.actions_system_prompt = """You are an expert z/OS command generator. Your task is to:
1. Understand user requirements and generate appropriate z/OS commands
2. Use Zowe CLI commands or z/OSMF REST APIs for operations
3. Provide clear descriptions for each command
4. Ensure commands follow z/OS security best practices
5. Include error handling and validation steps

When generating commands:
- Use Zowe CLI commands when possible for better compatibility
- Include proper error handling and validation
- Provide clear descriptions for each command
- Consider security implications
- Follow z/OS naming conventions

Example command format:
{
    "commands": [
        {
            "command": "zowe zos-files create data-set-partitioned USERID.SAMPLE --size 1CYL --type PDS",
            "description": "Creates a PDS dataset named USERID.SAMPLE with 1 cylinder of space"
        }
    ]
}"""

    async def generate_code(self, prompt: str, mode: str = "chat") -> Dict:
        """
        Generate code or commands based on the user's prompt using Groq.
        """
        logger.info(f"Backend: Received request to generate {mode} for prompt: {prompt}")
        try:
            async with httpx.AsyncClient() as client:
                logger.info("Backend: Making request to Groq API")
                request_data = {
                    "model": self.model,
                    "messages": [
                        {
                            "role": "system",
                            "content": self.actions_system_prompt if mode == "actions" else self.system_prompt
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "temperature": 0.7,
                    "max_tokens": 4000
                }
                logger.info(f"Backend: Request data: {json.dumps(request_data, indent=2)}")
                
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json=request_data
                )
                
                logger.info(f"Backend: Groq API response status: {response.status_code}")
                if response.status_code != 200:
                    logger.error(f"Backend: Groq API error: {response.text}")
                    raise Exception(f"Groq API error: {response.text}")

                result = response.json()
                content = result['choices'][0]['message']['content']
                logger.info(f"Backend: Received content from Groq API: {content[:200]}...")
                
                if mode == "actions":
                    # Parse commands from the response
                    try:
                        commands = json.loads(content)
                        if isinstance(commands, dict) and "commands" in commands:
                            return commands
                        else:
                            # If the response is not in the expected format, wrap it
                            return {
                                "commands": [{
                                    "command": content,
                                    "description": "Generated command"
                                }]
                            }
                    except json.JSONDecodeError:
                        # If parsing fails, return the content as a single command
                        return {
                            "commands": [{
                                "command": content,
                                "description": "Generated command"
                            }]
                        }
                else:
                    # Handle regular chat response
                    if '```' in content:
                        logger.info("Backend: Response contains code blocks, parsing response")
                        parsed_response = self._parse_response(result)
                        logger.info(f"Backend: Parsed response: {json.dumps(parsed_response, indent=2)}")
                        return parsed_response
                    else:
                        logger.info("Backend: Response is plain text, returning as simple response")
                        return {
                            "response": content,
                            "explanation": content
                        }

        except Exception as e:
            logger.error(f"Backend: Error generating code: {str(e)}", exc_info=True)
            raise Exception(f"Error generating code: {str(e)}")

    def _parse_response(self, response: Dict) -> Dict:
        """
        Parse the Groq API response into a structured format.
        """
        logger.info("Backend: Parsing Groq API response")
        try:
            content = response['choices'][0]['message']['content']
            logger.info(f"Backend: Content to parse: {content[:200]}...")  # Log first 200 chars
            
            # Split the content into files based on markdown code blocks
            files = []
            current_file = None
            current_content = []
            explanation = []
            in_code_block = False
            
            for line in content.split('\n'):
                if line.startswith('```'):
                    if in_code_block and current_file:
                        logger.info(f"Backend: Found end of code block for file: {current_file}")
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
                        logger.info(f"Backend: Found start of code block for file: {current_file}")
                    in_code_block = not in_code_block
                elif in_code_block and current_file:
                    current_content.append(line)
                else:
                    explanation.append(line)
            
            parsed_result = {
                "files": files,
                "response": content,
                "explanation": '\n'.join(explanation).strip()
            }
            logger.info(f"Backend: Parsed result: {json.dumps(parsed_result, indent=2)}")
            return parsed_result
            
        except Exception as e:
            logger.error(f"Backend: Error parsing response: {str(e)}", exc_info=True)
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
        language = language_map.get(ext, 'text')
        logger.info(f"Backend: Determined language {language} for file {filename}")
        return language

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
        logger.info("Backend: Analyzing z/OS structure")
        try:
            async with httpx.AsyncClient() as client:
                logger.info("Backend: Making request to Groq API for z/OS analysis")
                request_data = {
                    "model": self.model,
                    "messages": [
                        {
                            "role": "system",
                            "content": self.system_prompt + "\nFocus on analyzing z/OS structure and providing specific recommendations for:\n1. Dataset organization and naming conventions\n2. Job scheduling and resource utilization\n3. Security and access control\n4. Performance optimization\n5. Best practices for mainframe development"
                        },
                        {
                            "role": "user",
                            "content": "Analyze the current z/OS structure and provide detailed recommendations for organization and best practices."
                        }
                    ],
                    "temperature": 0.7,
                    "max_tokens": 2000
                }
                logger.info(f"Backend: Request data: {json.dumps(request_data, indent=2)}")
                
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json=request_data
                )
                
                logger.info(f"Backend: Groq API response status: {response.status_code}")
                if response.status_code != 200:
                    logger.error(f"Backend: Groq API error: {response.text}")
                    raise Exception(f"Groq API error: {response.text}")

                result = response.json()
                analysis_result = {
                    "analysis": result['choices'][0]['message']['content'],
                    "recommendations": self._extract_recommendations(result['choices'][0]['message']['content'])
                }
                logger.info(f"Backend: Analysis result: {json.dumps(analysis_result, indent=2)}")
                return analysis_result

        except Exception as e:
            logger.error(f"Backend: Error analyzing z/OS structure: {str(e)}", exc_info=True)
            raise Exception(f"Error analyzing z/OS structure: {str(e)}")

    def _extract_recommendations(self, content: str) -> List[str]:
        """
        Extract specific recommendations from the analysis.
        """
        logger.info("Backend: Extracting recommendations from analysis")
        try:
            recommendations = []
            for line in content.split('\n'):
                if line.strip().startswith('- ') or line.strip().startswith('* '):
                    recommendations.append(line.strip()[2:])
            logger.info(f"Backend: Extracted recommendations: {recommendations}")
            return recommendations
        except Exception as e:
            logger.error(f"Backend: Error extracting recommendations: {str(e)}", exc_info=True)
            return [] 