import { mockJobOutput } from '../data/mockData';

const simulateDelay = (ms = 800) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchMemberAPI = async (path) => {
  await simulateDelay();
  return null;
};

export const saveMemberAPI = async (path, content) => {
  await simulateDelay();
  return true;
};

export const submitJobAPI = async (path, content) => {
  await simulateDelay(1500);
  
  const jobId = `JOB${Math.floor(10000 + Math.random() * 90000)}`;
  
  const jobNameMatch = content.match(/\/\/(\w+)\s+JOB/);
  const jobName = jobNameMatch ? jobNameMatch[1] : 'UNKNOWN';
  
  return {
    ...mockJobOutput,
    jobId,
    jobName,
    submittedAt: new Date().toISOString()
  };
};

export const getAIAssistantResponse = async (prompt) => {
  await simulateDelay(1000);
  
  if (prompt.toLowerCase().includes('explain')) {
    return 'This is a sample explanation of the code. The AI would analyze the context and provide relevant information.';
  } else if (prompt.toLowerCase().includes('write')) {
    return 'Here is a sample code that would be generated based on your request.';
  } else {
    return 'I can help with explaining code, writing new code, or answering questions about mainframe technologies. What would you like to know?';
  }
};