import { useState, useEffect } from 'react';
import { completeVerificationFlow, localStorage } from '../utils/shopifyApi';

export function useShopifyAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const result = await completeVerificationFlow();
      
      if (result.success && result.verified) {
        setIsAuthenticated(true);
        setUserDetails(result.userDetails);
      }
    } catch (err) {
      setError('Authentication check failed');
    } finally {
      setLoading(false);
    }
  };

  const login = async (apiKey) => {
    setLoading(true);
    setError('');
    
    try {
      const result = await completeVerificationFlow(apiKey);
      
      if (result.success && result.verified) {
        setIsAuthenticated(true);
        setUserDetails(result.userDetails);
        return { success: true };
      } else {
        setError(result.error || 'Login failed');
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMsg = 'Login process failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.clearCredentials();
    setIsAuthenticated(false);
    setUserDetails(null);
    setError('');
  };

  return {
    isAuthenticated,
    userDetails,
    loading,
    error,
    login,
    logout,
    userId: localStorage.getUserId(),
    apiKey: localStorage.getApiKey()
  };
}
