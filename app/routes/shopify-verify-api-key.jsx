export async function verifyApiKey(apiKey, storeUrl) {
    try {
        const response = await fetch(`${API_BASE_URL}/shopify-verify-api-key`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                api_key: apiKey,
                store_url: storeUrl
            })
        });

        const data = await response.json();
        
        // Add debugging
        console.log('🔍 API Response:', data);
        console.log('🔍 Response OK:', response.ok);

        if (response.ok) {
            // Add more debugging
            console.log('🔍 About to save credentials:', {
                apiKey: data.api_key,
                userId: data.user_id
            });
            
            // Save credentials to local storage on successful verification
            localStorage.saveCredentials(data.api_key, data.user_id);
            
            // Verify it was saved
            console.log('🔍 After saving - API Key:', localStorage.getApiKey());
            console.log('🔍 After saving - User ID:', localStorage.getUserId());
            
            return {
                success: true,
                data: data,
                message: data.message,
                userId: data.user_id,
                userDetails: data.user_details,
                apiKey: data.api_key
            };
        } else {
            return {
                success: false,
                error: data.message,
                status: response.status
            };
        }
    } catch (error) {
        console.error('Network error during API key verification:', error);
        return {
            success: false,
            error: 'Network error occurred',
            status: null
        };
    }
}
