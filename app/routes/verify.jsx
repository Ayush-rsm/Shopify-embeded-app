import { useState, useEffect } from 'react';
import { json } from '@remix-run/node';
import { useActionData, useFetcher, useLoaderData } from '@remix-run/react';
import { completeVerificationFlow, localStorage } from '../utils/shopifyApi';

// Loader to check existing authentication on page load
export const loader = async () => {
  // Server-side: we can't access localStorage here
  // We'll check authentication on the client side
  return json({ message: 'Ready for verification' });
};

// Action to handle form submissions
export const action = async ({ request }) => {
  const formData = await request.formData();
  const apiKey = formData.get('apiKey');
  const storeUrl = formData.get('storeUrl');

  // You can also call your API here if needed
  return json({ received: true, apiKey, storeUrl });
};

export default function VerifyPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [requiresApiKey, setRequiresApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userDetails, setUserDetails] = useState(null);
  
  const fetcher = useFetcher();

  // Check existing authentication on component mount
  useEffect(() => {
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    setLoading(true);
    try {
      const result = await completeVerificationFlow();
      
      if (result.success && result.verified) {
        setIsAuthenticated(true);
        setUserDetails(result.userDetails);
        console.log('User already authenticated');
        console.log('Stored API Key:', localStorage.getApiKey());
        console.log('Stored User ID:', localStorage.getUserId());
      } else if (result.requiresApiKey) {
        setRequiresApiKey(true);
      } else {
        setError(result.error || 'Authentication check failed');
      }
    } catch (err) {
      setError('Failed to check authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (apiKey) => {
    setLoading(true);
    setError('');
    
    try {
      const result = await completeVerificationFlow(apiKey);
      
      if (result.success && result.verified) {
        setIsAuthenticated(true);
        setUserDetails(result.userDetails);
        setRequiresApiKey(false);
        
        console.log('Verification successful!');
        console.log('API Key saved:', localStorage.getApiKey());
        console.log('User ID saved:', localStorage.getUserId());
        
        // You can redirect or update UI here
        
      } else if (result.requiresApiKey) {
        setRequiresApiKey(true);
        setError(result.error || 'API key required');
      } else {
        setError(result.error || 'Verification failed');
      }
    } catch (err) {
      setError('Verification process failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clearCredentials();
    setIsAuthenticated(false);
    setUserDetails(null);
    setRequiresApiKey(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated && userDetails) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-green-600">✓ Verified!</h2>
        <div className="mb-4">
          <p><strong>User ID:</strong> {userDetails.email || localStorage.getUserId()}</p>
          <p><strong>Store:</strong> {userDetails.store_url}</p>
        </div>
        <button 
          onClick={handleLogout}
          className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6">Shopify Store Verification</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <ApiKeyForm onSubmit={handleVerification} loading={loading} />
    </div>
  );
}

// Separate component for the API key form
function ApiKeyForm({ onSubmit, loading }) {
  const [apiKey, setApiKey] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onSubmit(apiKey.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
          Shopify API Key
        </label>
        <input
          type="password"
          id="apiKey"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your Shopify API key"
          required
          disabled={loading}
        />
      </div>
      
      <button
        type="submit"
        disabled={loading || !apiKey.trim()}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? 'Verifying...' : 'Verify API Key'}
      </button>
    </form>
  );
}


