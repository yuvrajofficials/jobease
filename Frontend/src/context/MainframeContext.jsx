import React, { createContext, useContext, useState, useEffect } from 'react';

const MainframeContext = createContext();

const useMainframe = () => {
  const context = useContext(MainframeContext);
  if (!context) {
    throw new Error('useMainframe must be used within a MainframeProvider');
  }
  return context;
};

export const MainframeProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [datasets, setDatasets] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [credentials, setCredentials] = useState(null);

  useEffect(() => {
    // Load credentials from localStorage
    const storedCredentials = localStorage.getItem('credentials');
    if (storedCredentials) {
      setCredentials(JSON.parse(storedCredentials));
      setIsConnected(true);
      fetchDatasets();
      fetchJobs();
    }
  }, []);

  const connectToMainframe = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to connect to mainframe');
      }

      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('credentials', JSON.stringify(credentials));
      setCredentials(credentials);
      setIsConnected(true);
      await fetchDatasets();
      await fetchJobs();
    } catch (err) {
      setError(err.message);
      setIsConnected(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:8000/api/datasets/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch datasets');
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        setDatasets(data);
      } else {
        console.error('Unexpected data format:', data);
        throw new Error('Invalid data format received from server');
      }
    } catch (err) {
      console.error('Error fetching datasets:', err);
      setError(err.message || 'Failed to fetch datasets. Please try again.');
      setDatasets([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    if (!credentials) return;
    
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/jobs/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Jobs fetch error:', data);
        throw new Error(data.detail || 'Failed to fetch jobs. Please check your credentials and try again.');
      }

      console.log('Jobs response:', data); // Debug log
      setJobs(data.jobs || []);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError(err.message);
      setJobs([]);
      throw err; // Re-throw to handle in the calling function
    } finally {
      setLoading(false);
    }
  };

  const disconnectFromMainframe = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('credentials');
    setCredentials(null);
    setIsConnected(false);
    setDatasets([]);
    setJobs([]);
  };

  const value = {
    isConnected,
    datasets,
    jobs,
    loading,
    error,
    connectToMainframe,
    disconnectFromMainframe,
    fetchDatasets,
    fetchJobs,
  };

  return (
    <MainframeContext.Provider value={value}>
      {children}
    </MainframeContext.Provider>
  );
};

export { useMainframe };