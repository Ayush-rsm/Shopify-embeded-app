// const API_BASE_URL = 'https://alt-magic-api-eabaa2c8506a.herokuapp.com';

// /**
//  * Verify Shopify API Key (Updated)
//  */
// export async function verifyApiKey(apiKey, storeUrl) {
//     try {
//         const response = await fetch(`${API_BASE_URL}/shopify-verify-api-key`, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({
//                 api_key: apiKey,
//                 store_url: storeUrl
//             })
//         });

//         const data = await response.json();

//         if (response.ok) {
//             // Save credentials to local storage on successful verification
//             localStorage.saveCredentials(data.api_key, data.user_id);
            
//             return {
//                 success: true,
//                 data: data,
//                 message: data.message,
//                 userId: data.user_id,
//                 userDetails: data.user_details,
//                 apiKey: data.api_key
//             };
//         } else {
//             return {
//                 success: false,
//                 error: data.message,
//                 status: response.status
//             };
//         }
//     } catch (error) {
//         console.error('Network error during API key verification:', error);
//         return {
//             success: false,
//             error: 'Network error occurred',
//             status: null
//         };
//     }
// }

// /**
//  * Get User Details for Shopify Store (Updated)
//  */
// export async function getUserDetails(storeUrl) {
//     try {
//         const response = await fetch(`${API_BASE_URL}/shopify-get-user-details`, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({
//                 store_url: storeUrl
//             })
//         });

//         const data = await response.json();

//         if (response.ok && data.user_details) {
//             // Save credentials to local storage on successful verification
//             const apiKey = data.store_data?.api_key || data.api_key;
//             if (apiKey && data.user_id) {
//                 localStorage.saveCredentials(apiKey, data.user_id);
//             }
            
//             return {
//                 success: true,
//                 verified: true,
//                 data: data,
//                 message: data.message || "Store is verified",
//                 userId: data.user_id,
//                 userDetails: data.user_details,
//                 apiKey: apiKey,
//                 language: data.user_details.language  // Added language field
//             };
//         } else {
//             return {
//                 success: true,
//                 verified: false,
//                 error: data.message || "Store not verified",
//                 status: response.status
//             };
//         }
//     } catch (error) {
//         console.error('Network error during store verification check:', error);
//         return {
//             success: false,
//             verified: false,
//             error: 'Network error occurred',
//             status: null
//         };
//     }
// }


// /**
//  * Get current store URL from window location
//  */
// export function getCurrentStoreUrl() {
//     if (typeof window !== 'undefined') {
//         const hostname = window.location.hostname;
        
//         // For development, return a test store URL
//         if (hostname === 'localhost' || hostname === '127.0.0.1') {
//             return 'test-store.myshopify.com';
//         }
        
//         // If already a myshopify.com domain, return as is
//         if (hostname.includes('.myshopify.com')) {
//             return hostname;
//         }
        
//         // If custom domain, format it
//         const storeName = hostname.split('.')[0];
//         return `${storeName}.myshopify.com`;
//     }
    
//     return 'test-store.myshopify.com'; // fallback for development
// }


// export async function completeVerificationFlow(apiKey = null, storeUrl = null) {
//     try {
//         const finalStoreUrl = storeUrl || getCurrentStoreUrl();
        
//         if (!finalStoreUrl) {
//             return {
//                 success: false,
//                 error: 'Could not determine store URL',
//                 requiresApiKey: false
//             };
//         }

//         // Check if we have stored credentials
//         const storedApiKey = localStorage.getApiKey();
//         const storedUserId = localStorage.getUserId();
        
//         // Use stored API key if available and none provided
//         const finalApiKey = apiKey || storedApiKey;

//         // First check if store is already verified
//         const storeCheck = await getUserDetails(finalStoreUrl);
        
//         if (storeCheck.success && storeCheck.verified) {
//             return {
//                 success: true,
//                 verified: true,
//                 data: storeCheck.data,
//                 userDetails: storeCheck.userDetails,
//                 apiKey: storeCheck.apiKey,
//                 userId: storeCheck.userId,
//                 requiresApiKey: false
//             };
//         }

//         // Store not verified, check if API key is available
//         if (!finalApiKey) {
//             return {
//                 success: true,
//                 verified: false,
//                 requiresApiKey: true,
//                 storeUrl: finalStoreUrl,
//                 error: 'API key required for verification'
//             };
//         }

//         // Verify the API key
//         const verifyResult = await verifyApiKey(finalApiKey, finalStoreUrl);
        
//         if (verifyResult.success) {
//             return {
//                 success: true,
//                 verified: true,
//                 data: verifyResult.data,
//                 userDetails: verifyResult.userDetails,
//                 apiKey: verifyResult.apiKey,
//                 userId: verifyResult.userId,
//                 requiresApiKey: false
//             };
//         } else {
//             // Clear stored credentials if verification fails
//             localStorage.clearCredentials();
//             return {
//                 success: false,
//                 verified: false,
//                 requiresApiKey: true,
//                 storeUrl: finalStoreUrl,
//                 error: verifyResult.error
//             };
//         }

//     } catch (error) {
//         console.error('Error in complete verification flow:', error);
//         return {
//             success: false,
//             verified: false,
//             error: 'Verification flow failed',
//             requiresApiKey: true
//         };
//     }
// }


// export function handleApiResponse(response) {
//     if (response.success && response.verified) {
//         return {
//             type: 'SUCCESS',
//             message: 'Verification successful',
//             userDetails: response.userDetails,
//             apiKey: response.apiKey,
//             userId: response.userId
//         };
//     } else if (response.success && response.requiresApiKey) {
//         return {
//             type: 'REQUIRES_API_KEY',
//             message: 'API key required',
//             storeUrl: response.storeUrl
//         };
//     } else {
//         return {
//             type: 'ERROR',
//             message: response.error || 'Verification failed'
//         };
//     }
// }

// /**
//  * Local Storage utilities for Shopify API data
//  */
// export const localStorage = {
//     saveCredentials: (apiKey, userId) => {
//         console.log('🔍 saveCredentials called with:', { apiKey, userId });
//         if (typeof window !== 'undefined') {
//             console.log('🔍 Window is available, saving to localStorage');
//             window.localStorage.setItem('shopify_api_key', apiKey);
//             window.localStorage.setItem('shopify_user_id', userId);
            
//             // Verify immediately after saving
//             console.log('🔍 Saved API Key:', window.localStorage.getItem('shopify_api_key'));
//             console.log('🔍 Saved User ID:', window.localStorage.getItem('shopify_user_id'));
//         } else {
//             console.log('❌ Window is not available');
//         }
//     },
    
//     getApiKey: () => {
//         if (typeof window !== 'undefined') {
//             return window.localStorage.getItem('shopify_api_key');
//         }
//         return null;
//     },
    
//     getUserId: () => {
//         if (typeof window !== 'undefined') {
//             return window.localStorage.getItem('shopify_user_id');
//         }
//         return null;
//     },
    
//     clearCredentials: () => {
//         console.log('🔍 clearCredentials called');
//         if (typeof window !== 'undefined') {
//             window.localStorage.removeItem('shopify_api_key');
//             window.localStorage.removeItem('shopify_user_id');
//             console.log('🔍 Credentials cleared');
//         }
//     }
// };



// export default {
//     verifyApiKey,
//     getUserDetails,
//     getCurrentStoreUrl,
//     completeVerificationFlow,
//     handleApiResponse,
//     localStorage
// };



const API_BASE_URL = 'https://alt-magic-api-eabaa2c8506a.herokuapp.com';

/**
 * Verify Shopify API Key
 */
export async function verifyApiKey(apiKey, storeUrl) {
    try {
        const response = await fetch(`${API_BASE_URL}/shopify-verify-api-key`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: apiKey, store_url: storeUrl })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.saveCredentials(data.api_key, data.user_id);
            // ❌ REMOVED: localStorage.saveLanguage(data.user_details.language);
            return {
                success: true,
                data,
                message: data.message,
                userId: data.user_id,
                userDetails: data.user_details,
                apiKey: data.api_key
            };
        } else {
            return { success: false, error: data.message, status: response.status };
        }
    } catch (error) {
        console.error('Network error during API key verification:', error);
        return { success: false, error: 'Network error occurred', status: null };
    }
}

/**
 * Get User Details for Shopify Store
 */
export async function getUserDetails(storeUrl) {
    try {
        const response = await fetch(`${API_BASE_URL}/shopify-get-user-details`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ store_url: storeUrl })
        });

        const data = await response.json();

        if (response.ok && data.user_details) {
            const apiKey = data.store_data?.api_key || data.api_key;
            if (apiKey && data.user_id) {
                localStorage.saveCredentials(apiKey, data.user_id);
            }
            // ❌ REMOVED: localStorage.saveLanguage(data.user_details.language);
            return {
                success: true,
                verified: true,
                data,
                message: data.message || "Store is verified",
                userId: data.user_id,
                userDetails: data.user_details,
                apiKey,
                language: data.user_details.language
            };
        } else {
            return {
                success: true,
                verified: false,
                error: data.message || "Store not verified",
                status: response.status
            };
        }
    } catch (error) {
        console.error('Network error during store verification check:', error);
        return { success: false, verified: false, error: 'Network error occurred', status: null };
    }
}

/**
 * Get current store URL from window location
 */
export function getCurrentStoreUrl() {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'test-store.myshopify.com';
        }
        if (hostname.includes('.myshopify.com')) {
            return hostname;
        }
        const storeName = hostname.split('.')[0];
        return `${storeName}.myshopify.com`;
    }
    return 'test-store.myshopify.com';
}

export async function completeVerificationFlow(apiKey = null, storeUrl = null) {
    try {
        const finalStoreUrl = storeUrl || getCurrentStoreUrl();
        if (!finalStoreUrl) {
            return { success: false, error: 'Could not determine store URL', requiresApiKey: false };
        }
        const storedApiKey = localStorage.getApiKey();
        const storedUserId = localStorage.getUserId();
        const finalApiKey = apiKey || storedApiKey;
        const storeCheck = await getUserDetails(finalStoreUrl);

        if (storeCheck.success && storeCheck.verified) {
            return {
                success: true,
                verified: true,
                data: storeCheck.data,
                userDetails: storeCheck.userDetails,
                apiKey: storeCheck.apiKey,
                userId: storeCheck.userId,
                requiresApiKey: false
            };
        }
        if (!finalApiKey) {
            return {
                success: true,
                verified: false,
                requiresApiKey: true,
                storeUrl: finalStoreUrl,
                error: 'API key required for verification'
            };
        }
        const verifyResult = await verifyApiKey(finalApiKey, finalStoreUrl);
        if (verifyResult.success) {
            return {
                success: true,
                verified: true,
                data: verifyResult.data,
                userDetails: verifyResult.userDetails,
                apiKey: verifyResult.apiKey,
                userId: verifyResult.userId,
                requiresApiKey: false
            };
        } else {
            localStorage.clearCredentials();
            return {
                success: false,
                verified: false,
                requiresApiKey: true,
                storeUrl: finalStoreUrl,
                error: verifyResult.error
            };
        }
    } catch (error) {
        console.error('Error in complete verification flow:', error);
        return { success: false, verified: false, error: 'Verification flow failed', requiresApiKey: true };
    }
}

export function handleApiResponse(response) {
    if (response.success && response.verified) {
        return {
            type: 'SUCCESS',
            message: 'Verification successful',
            userDetails: response.userDetails,
            apiKey: response.apiKey,
            userId: response.userId
        };
    } else if (response.success && response.requiresApiKey) {
        return {
            type: 'REQUIRES_API_KEY',
            message: 'API key required',
            storeUrl: response.storeUrl
        };
    } else {
        return { type: 'ERROR', message: response.error || 'Verification failed' };
    }
}

/**
 * Local Storage utilities for Shopify API data
 */
export const localStorage = {
    saveCredentials: (apiKey, userId) => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('shopify_api_key', apiKey);
            window.localStorage.setItem('shopify_user_id', userId);
        }
    },
    getApiKey: () => (typeof window !== 'undefined' ? window.localStorage.getItem('shopify_api_key') : null),
    getUserId: () => (typeof window !== 'undefined' ? window.localStorage.getItem('shopify_user_id') : null),
    // ❌ REMOVED: saveLanguage and getLanguage functions
    clearCredentials: () => {
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem('shopify_api_key');
            window.localStorage.removeItem('shopify_user_id');
            // ❌ REMOVED: window.localStorage.removeItem('shopify_user_language');
        }
    }
};

export default {
    verifyApiKey,
    getUserDetails,
    getCurrentStoreUrl,
    completeVerificationFlow,
    handleApiResponse,
    localStorage
};
