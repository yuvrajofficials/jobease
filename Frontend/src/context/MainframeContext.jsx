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
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    // Load credentials from localStorage
    const storedCredentials = localStorage.getItem('credentials');
    const token = localStorage.getItem('token');
    
    if (storedCredentials && token) {
      const parsedCredentials = JSON.parse(storedCredentials);
      setCredentials(parsedCredentials);
      setUserInfo({
        username: parsedCredentials.username,
        host: parsedCredentials.host,
        port: parsedCredentials.port
      });
      setIsConnected(true);
      console.log('User is logged in:', {
        username: parsedCredentials.username,
        host: parsedCredentials.host,
        port: parsedCredentials.port
      });
      fetchDatasets();
      fetchJobs();
    } else {
      console.log('No stored credentials found');
      setIsConnected(false);
    }
  }, []);

  const connectToMainframe = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      console.log('Attempting to connect with credentials:', {
        username: credentials.username,
        host: credentials.host,
        port: credentials.port
      });

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
      setUserInfo({
        username: credentials.username,
        host: credentials.host,
        port: credentials.port
      });
      setIsConnected(true);
      console.log('Successfully logged in:', {
        username: credentials.username,
        host: credentials.host,
        port: credentials.port
      });
      
      await fetchDatasets();
      await fetchJobs();
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
      setIsConnected(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // const fetchDatasets = async () => {
  //   try {
  //     setLoading(true);
  //     setError(null);
      
  //     const storedCredentials = localStorage.getItem('mainframeCredentials');
  //     if (!storedCredentials) {
  //       throw new Error('No credentials found. Please log in again.');
  //     }
      
  //     const credentials = JSON.parse(storedCredentials);
  //     console.log('Fetching datasets with credentials:', {
  //       username: credentials.username,
  //       host: credentials.host,
  //       port: credentials.port
  //     });
      
  //     const response = await fetch('http://localhost:8000/api/datasets/', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${localStorage.getItem('token')}`
  //       },
  //       body: JSON.stringify(credentials)
  //     });
      
  //     const data = await response.json();
  //     console.log('Datasets response:', data);
      
  //     if (!response.ok) {
  //       throw new Error(data.detail || 'Failed to fetch datasets');
  //     }
      
  //     if (!data.datasets || !Array.isArray(data.datasets)) {
  //       console.error('Invalid datasets response format:', data);
  //       throw new Error('Invalid response format from server');
  //     }
      
  //     setDatasets(data.datasets);
  //     console.log('Successfully fetched datasets:', data.datasets);
  //   } catch (error) {
  //     console.error('Error fetching datasets:', error);
  //     setError(error.message || 'Failed to fetch datasets');
  //     setDatasets([]);
  //   } finally {
  //     setLoading(false);
  //   }
  // };


  const fetchDatasets = async () => {
  try {
    setLoading(true);
    setError(null);

    const storedCredentials = localStorage.getItem('credentials'); // <-- FIXED
    if (!storedCredentials) {
      throw new Error('No credentials found. Please log in again.');
    }

    const credentials = JSON.parse(storedCredentials);
    console.log('Fetching datasets with credentials:', {
      username: credentials.username,
      host: credentials.host,
      port: credentials.port
    });

    const response = await fetch('http://localhost:8000/api/datasets/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(credentials)
    });

    const data = await response.json();
    console.log('Datasets response:', data);

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch datasets');
    }

    if (!data.datasets || !Array.isArray(data.datasets)) {
      console.error('Invalid datasets response format:', data);
      throw new Error('Invalid response format from server');
    }

    setDatasets(data.datasets);
    console.log('Successfully fetched datasets:', data.datasets);
  } catch (error) {
    console.error('Error fetching datasets:', error);
    setError(error.message || 'Failed to fetch datasets');
    setDatasets([]);
  } finally {
    setLoading(false);
  }
};

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const storedCredentials = localStorage.getItem('credentials');
      if (!storedCredentials) {
        throw new Error('No credentials found. Please log in again.');
      }

      const credentials = JSON.parse(storedCredentials);
      console.log('Fetching jobs with credentials:', {
        username: credentials.username,
        host: credentials.host,
        port: credentials.port
      });
      
      const response = await fetch('http://localhost:8000/api/jobs/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(credentials),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Jobs fetch error:', errorData);
        throw new Error(errorData.detail || 'Failed to fetch jobs');
      }

      const data = await response.json();
      console.log('Received jobs:', data);
      
      if (data.jobs && Array.isArray(data.jobs)) {
        setJobs(data.jobs);
      } else {
        console.error('Unexpected data format:', data);
        throw new Error('Invalid data format received from server');
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError(err.message || 'Failed to fetch jobs. Please try again.');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const disconnectFromMainframe = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('credentials');
    setCredentials(null);
    setUserInfo(null);
    setIsConnected(false);
    setDatasets([]);
    setJobs([]);
    console.log('User logged out');
  };

  const value = {
    isConnected,
    datasets,
    jobs,
    loading,
    error,
    userInfo,
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