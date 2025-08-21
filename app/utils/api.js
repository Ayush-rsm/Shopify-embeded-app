

// API Configuration
const API_CONFIG = {
  baseURL: 'https://alt-magic-api-eabaa2c8506a.herokuapp.com',
  timeout: 30000
};

// Function to get auth token from localStorage
const getAuthToken = () => {
  try {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined' && window.localStorage) {
      const token = localStorage.getItem('authToken') || localStorage.getItem('access_token') || localStorage.getItem('alt_magic_token');
      console.log('🔑 Retrieved auth token from localStorage:', token ? `${token.substring(0, 10)}...` : 'Not found');
      return token;
    }
    // Fallback for server-side rendering or when localStorage is not available
    console.warn('⚠️ localStorage not available, using fallback token');
    return '56bf7235c08bb188fb0d42b2'; // Fallback token
  } catch (error) {
    console.error('❌ Error accessing localStorage:', error);
    return '56bf7235c08bb188fb0d42b2'; // Fallback token
  }
};

// Generic API request function with debugging
const makeAPIRequest = async (endpoint, data = {}, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

  try {
    // Get auth token dynamically from localStorage
    const authToken = getAuthToken();
    
    if (!authToken) {
      throw new Error('No authentication token available. Please log in again.');
    }

    console.log(`🔄 API Request: ${API_CONFIG.baseURL}${endpoint}`);
    console.log('📤 Request Data:', JSON.stringify(data, null, 2));
    console.log('🔑 Using auth token (first 10 chars):', authToken.substring(0, 10) + '...');
    
    const response = await fetch(`${API_CONFIG.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        ...options.headers
      },
      body: JSON.stringify(data),
      signal: controller.signal,
      ...options
    });

    clearTimeout(timeoutId);
    
    console.log(`📊 Response Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      
      // Handle 401/403 errors specifically (token issues)
      if (response.status === 401 || response.status === 403) {
        console.error('🔒 Authentication error - token may be invalid or expired');
        // Optionally clear the token from localStorage
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('access_token');
          localStorage.removeItem('alt_magic_token');
        }
      }
      
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const responseData = await response.json();
    console.log('✅ API Response:', responseData);
    return responseData;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('💥 API Error:', error);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. Please try again.');
    }
    throw error;
  }
};

// API Service Object
export const apiService = {
  // Set auth token in localStorage
  setAuthToken(token) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('authToken', token);
        console.log('✅ Auth token saved to localStorage');
      }
    } catch (error) {
      console.error('❌ Error saving auth token to localStorage:', error);
    }
  },

  // Get auth token from localStorage
  getAuthToken() {
    return getAuthToken();
  },

  // Clear auth token from localStorage
  clearAuthToken() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('access_token');
        localStorage.removeItem('alt_magic_token');
        console.log('🗑️ Auth token cleared from localStorage');
      }
    } catch (error) {
      console.error('❌ Error clearing auth token from localStorage:', error);
    }
  },

  // Check if auth token exists
  hasAuthToken() {
    const token = getAuthToken();
    return !!token;
  },

  // Get user details
  async getUserDetails(userId, storeUrl) {
    try {
      console.log('🔍 Getting user details:', { userId, storeUrl });
      
      const data = await makeAPIRequest('/user-details', {
        user_id: userId,
        store_url: storeUrl
      });
      
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error fetching user details:', error);
      return { success: false, error: error.message };
    }
  },

  // Update user details
  async updateUserDetails(userId, settings) {
    try {
      console.log('🔄 Updating user details:', { userId, settings });
      
      // Prepare data according to backend API structure
      const updateData = {
        user_id: userId
      };

      // Add fields only if they have values (to avoid backend validation errors)
      if (settings.language !== undefined && settings.language !== '') {
        updateData.language = settings.language;
      }
      
      if (settings.alt_prefix !== undefined && settings.alt_prefix !== '') {
        updateData.alt_prefix = settings.alt_prefix;
      }
      
      if (settings.alt_suffix !== undefined && settings.alt_suffix !== '') {
        updateData.alt_suffix = settings.alt_suffix;
      }
      
      if (settings.alt_gen_type !== undefined && settings.alt_gen_type !== '') {
        updateData.alt_gen_type = settings.alt_gen_type;
      }
      
      if (settings.chatgpt_prompt_layer !== undefined && settings.chatgpt_prompt_layer !== '') {
        updateData.chatgpt_prompt_layer = settings.chatgpt_prompt_layer;
      }

      console.log('📤 Final update data:', updateData);

      const data = await makeAPIRequest('/update-user-details', updateData);
      
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error updating user details:', error);
      return { success: false, error: error.message };
    }
  },

  // Batch update - update multiple settings at once
  async updateMultipleSettings(userId, settingsArray) {
    try {
      const results = await Promise.all(
        settingsArray.map(settings => this.updateUserDetails(userId, settings))
      );
      
      const hasErrors = results.some(result => !result.success);
      
      return {
        success: !hasErrors,
        results,
        errors: results.filter(result => !result.success)
      };
    } catch (error) {
      console.error('Error in batch update:', error);
      return { success: false, error: error.message };
    }
  }
};

// Individual function exports for backward compatibility
export const getUserDetails = apiService.getUserDetails;
export const updateUserDetails = apiService.updateUserDetails;

// Default export
export default apiService;
