import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMainframe } from '../../context/MainframeContext';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('datasets');
  const [jobCode, setJobCode] = useState('');
  const [jobName, setJobName] = useState('JOB1');
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobOutput, setJobOutput] = useState('');
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [datasetMembers, setDatasetMembers] = useState([]);
  const navigate = useNavigate();
  const { 
    connection, 
    jobs, 
    datasets, 
    loading, 
    error, 
    userInfo,
    submitJob, 
    getJobStatus, 
    fetchJobs, 
    fetchDatasets 
  } = useMainframe();

  useEffect(() => {
    if (connection === null) {
      navigate('/login');
    }
  }, [connection, navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleSubmitJob = async (e) => {
    e.preventDefault();
    try {
      const result = await submitJob(jobCode, jobName);
      setSelectedJob(result);
      setJobOutput(result.output || '');
      await fetchJobs(); // Refresh job list
    } catch (err) {
      console.error('Error submitting job:', err);
    }
  };

  const handleViewJob = async (job) => {
    try {
      const result = await getJobStatus(job.job_id);
      setSelectedJob(result);
      setJobOutput(result.output || '');
    } catch (err) {
      console.error('Error fetching job details:', err);
    }
  };

  const handleViewDataset = async (dataset) => {
    setSelectedDataset(dataset.name || dataset.datasetName || dataset);
    setDatasetMembers([]);
    try {
      const response = await fetch(`http://localhost:8000/datasets/${dataset.name || dataset.datasetName || dataset}` +
        `?host=${localStorage.getItem('host')}` +
        `&port=${localStorage.getItem('port')}` +
        `&username=${localStorage.getItem('username')}` +
        `&password=${localStorage.getItem('password')}`);
      const data = await response.json();
      setDatasetMembers(data.members.data || []);
    } catch (err) {
      setDatasetMembers([]);
    }
  };

  if (connection === null) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-indigo-600">Mainframe Assistant</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {userInfo && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">User:</span> {userInfo.username}
                  <span className="mx-2">|</span>
                  <span className="font-medium">Host:</span> {userInfo.host}:{userInfo.port}
                </div>
              )}
              <button
                onClick={handleLogout}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('datasets')}
                className={`${
                  activeTab === 'datasets'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Datasets
              </button>
              <button
                onClick={() => setActiveTab('jobs')}
                className={`${
                  activeTab === 'jobs'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Jobs
              </button>
              <button
                onClick={() => setActiveTab('submit')}
                className={`${
                  activeTab === 'submit'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Submit Job
              </button>
            </nav>
          </div>

          <div className="mt-6">
            {activeTab === 'datasets' && (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg leading-6 font-medium text-gray-900">Datasets</h3>
                      {userInfo && (
                        <p className="mt-1 text-sm text-gray-500">
                          Showing datasets for user {userInfo.username}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => fetchDatasets()}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Refresh
                    </button>
                  </div>
                  
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                      <span className="ml-2 text-gray-600">Loading datasets...</span>
                    </div>
                  ) : error ? (
                    <div className="rounded-md bg-red-50 p-4">
                      <div className="flex">
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">
                            {error}
                          </h3>
                        </div>
                      </div>
                    </div>
                  ) : datasets.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No datasets found. Try refreshing the list.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Dataset Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Organization
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Record Format
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Volume
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {datasets.map((dataset) => (
                            <tr key={dataset.name} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                                {dataset.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {dataset.dsorg}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {dataset.recfm}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {dataset.volume}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <button
                                  onClick={() => handleViewDataset(dataset)}
                                  className="text-indigo-600 hover:text-indigo-900"
                                >
                                  View Members
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {selectedDataset && (
                    <div className="mt-6">
                      <h4 className="text-md font-bold mb-2">Members of {selectedDataset}</h4>
                      {datasetMembers.length === 0 ? (
                        <div className="text-gray-500">No members found or failed to load.</div>
                      ) : (
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {datasetMembers.map((member) => (
                            <div
                              key={member.name}
                              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                            >
                              <div className="flex-1 min-w-0">
                                <span className="absolute inset-0" aria-hidden="true" />
                                <p className="text-sm font-medium text-gray-900">{member.name}</p>
                                <p className="text-sm text-gray-500 truncate">{member.type}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'jobs' && (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Job List</h3>
                  {loading ? (
                    <div className="text-center">Loading...</div>
                  ) : (
                    <ul className="divide-y divide-gray-200">
                      {jobs.map((job) => (
                        <li key={job.job_id} className="py-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-indigo-600">{job.job_name}</p>
                              <p className="text-sm text-gray-500">ID: {job.job_id}</p>
                            </div>
                            <div className="flex items-center">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                job.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {job.status}
                              </span>
                              <button
                                onClick={() => handleViewJob(job)}
                                className="ml-4 px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                              >
                                View
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'submit' && (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Submit New Job</h3>
                  <form onSubmit={handleSubmitJob} className="space-y-4">
                    <div>
                      <label htmlFor="jobName" className="block text-sm font-medium text-gray-700">
                        Job Name
                      </label>
                      <input
                        type="text"
                        id="jobName"
                        value={jobName}
                        onChange={(e) => setJobName(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="jobCode" className="block text-sm font-medium text-gray-700">
                        Job Code (JCL)
                      </label>
                      <textarea
                        id="jobCode"
                        rows={10}
                        value={jobCode}
                        onChange={(e) => setJobCode(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
                        placeholder="//JOB1 JOB (ACCT),'JOB NAME'&#10;//STEP1 EXEC PGM=IEFBR14"
                      />
                    </div>
                    <div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        {loading ? 'Submitting...' : 'Submit Job'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {selectedJob && (
              <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-md">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Job Output</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                      {jobOutput || 'No output available'}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 