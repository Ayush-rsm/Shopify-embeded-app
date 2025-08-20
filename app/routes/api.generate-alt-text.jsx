// import { json } from '@remix-run/node';

// // API Configuration
// const API_CONFIG = {
//   endpoint: 'https://alt-magic-api-eabaa2c8506a.herokuapp.com/alt-generator-shp',
//   headers: {
//     'Content-Type': 'application/json',
//     'Authorization': 'Bearer cdcaa8dee36a58594056366d'
//   },
//   defaultSettings: {
//     alt_quality: 'medium',
//     language: 'en',
//     model_type: 'gemini',
//     source: 'shopify'
//   },
//   userId: 'advait.postit@gmail.com' // Replace with actual user ID from your auth system
// };

// // Helper function to extract file extension
// const getFileExtension = (imageBase64) => {
//   if (!imageBase64) return 'jpeg';
  
//   // Extract from data URL if present
//   const match = imageBase64.match(/data:image\/([^;]+)/);
//   if (match) {
//     return match[1];
//   }
  
//   return 'jpeg'; // Default fallback
// };

// // Helper function to generate image name
// const generateImageName = (type, id) => {
//   const timestamp = Date.now();
//   return `${type}_image_${id || timestamp}`;
// };

// // Main function to call your production API
// async function generateAltTextWithProductionAPI({
//   imageBase64,
//   type,
//   title = '',
//   keywords = [],
//   file_extension = 'jpeg',
//   alt_quality = 'medium',
//   language = 'en',
//   product_name = '',
//   userDetails = {},
//   imageId = ''
// }) {
//   try {
//     const requestBody = {
//       image: imageBase64, // For base64 images
//       title: title,
//       context: '', // Can be populated if needed
//       keywords: Array.isArray(keywords) ? keywords : (keywords ? keywords.split(',').map(k => k.trim()) : []),
//       user_id: API_CONFIG.userId,
//       image_name: generateImageName(type, imageId),
//       image_type: 'base64', // Since we're sending base64
//       image_url: '', // Empty for base64 images
//       alt_quality: alt_quality,
//       file_extension: file_extension,
//       image_id: imageId || '',
//       source: API_CONFIG.defaultSettings.source,
//       site_id: '',
//       language: language,
//       model_type: API_CONFIG.defaultSettings.model_type,
//       product_name: product_name,
//       alt_gen_settings_shp: userDetails || {}
//     };

//     console.log('Calling production API with:', {
//       endpoint: API_CONFIG.endpoint,
//       imageType: requestBody.image_type,
//       userId: requestBody.user_id,
//       model: requestBody.model_type
//     });

//     const response = await fetch(API_CONFIG.endpoint, {
//       method: 'POST',
//       headers: API_CONFIG.headers,
//       body: JSON.stringify(requestBody)
//     });

//     if (!response.ok) {
//       let errorMessage = `API request failed: ${response.status}`;
      
//       try {
//         const errorData = await response.json();
//         errorMessage = errorData.message || errorMessage;
//       } catch (parseError) {
//         // If we can't parse the error response, use the status text
//         errorMessage = `${errorMessage} - ${response.statusText}`;
//       }

//       // Handle specific error cases
//       if (response.status === 403) {
//         throw new Error('No credits remaining. Please upgrade your plan.');
//       } else if (response.status === 404) {
//         throw new Error('User not found. Please check your configuration.');
//       } else if (response.status === 500) {
//         throw new Error('Internal server error. Please try again later.');
//       }
      
//       throw new Error(errorMessage);
//     }

//     const data = await response.json();
    
//     if (!data.alt_text) {
//       throw new Error('No alt text returned from production API');
//     }

//     console.log('Production API response:', {
//       altTextLength: data.alt_text.length,
//       creditsRemaining: data.credits_available,
//       thumbnailUrl: data.thumbnail_url
//     });

//     // Apply user-specific prefix/suffix if available
//     let finalAltText = data.alt_text;
    
//     if (userDetails?.alt_gen_start_end) {
//       if (userDetails.alt_gen_start_end.alt_gen_start) {
//         finalAltText = userDetails.alt_gen_start_end.alt_gen_start + ' ' + finalAltText;
//       }
//       if (userDetails.alt_gen_start_end.alt_gen_end) {
//         finalAltText = finalAltText + ' ' + userDetails.alt_gen_start_end.alt_gen_end;
//       }
//     }

//     return {
//       altText: finalAltText,
//       creditsAvailable: data.credits_available,
//       thumbnailUrl: data.thumbnail_url,
//       tokenDetails: {} // Production API doesn't return token details, but keeping for compatibility
//     };

//   } catch (error) {
//     console.error('Production API error:', error.message);
    
//     // Re-throw with more context
//     if (error.message.includes('fetch')) {
//       throw new Error('Network error: Unable to connect to alt text generation service');
//     }
    
//     throw error;
//   }
// }

// export const action = async ({ request }) => {
//   let startTime = Date.now();
  
//   try {
//     const body = await request.json();

//     const {
//       imageBase64,
//       type,
//       title = '',
//       keywords = '',
//       file_extension = '',
//       alt_quality = 'medium',
//       language = 'en',
//       product_name = '',
//       alt_gen_type = 'default',
//       userDetails = {},
//       imageId = ''
//     } = body;

//     // Validate required fields
//     if (!imageBase64) {
//       return json({ error: 'Image data is required' }, { status: 400 });
//     }

//     // Auto-detect file extension if not provided
//     const detectedExtension = file_extension || getFileExtension(imageBase64);

//     console.log('Starting alt text generation:', {
//       type,
//       title: title.substring(0, 50) + '...',
//       fileExtension: detectedExtension,
//       altQuality: alt_quality,
//       language,
//       imageId
//     });

//     // Call the production API
//     const result = await generateAltTextWithProductionAPI({
//       imageBase64,
//       type,
//       title,
//       keywords,
//       file_extension: detectedExtension,
//       alt_quality,
//       language,
//       product_name,
//       userDetails,
//       imageId
//     });

//     const processingTime = Date.now() - startTime;
    
//     console.log('Alt text generation completed:', {
//       processingTime: `${processingTime}ms`,
//       altTextLength: result.altText.length,
//       creditsRemaining: result.creditsAvailable
//     });

//     // Return response in the format your frontend expects
//     return json({
//       altText: result.altText,
//       creditsAvailable: result.creditsAvailable,
//       thumbnailUrl: result.thumbnailUrl,
//       processingTime,
//       success: true
//     });

//   } catch (error) {
//     const processingTime = Date.now() - startTime;
    
//     console.error('Alt text generation failed:', {
//       error: error.message,
//       processingTime: `${processingTime}ms`
//     });

//     // Return appropriate error response
//     let statusCode = 500;
//     let errorMessage = 'Alt text generation failed';

//     if (error.message.includes('No credits remaining')) {
//       statusCode = 403;
//       errorMessage = 'No credits remaining';
//     } else if (error.message.includes('User not found')) {
//       statusCode = 404;
//       errorMessage = 'User not found';
//     } else if (error.message.includes('Network error')) {
//       statusCode = 503;
//       errorMessage = 'Service temporarily unavailable';
//     } else if (error.message.includes('Image data is required')) {
//       statusCode = 400;
//       errorMessage = 'Invalid request data';
//     }

//     return json(
//       { 
//         error: errorMessage,
//         details: error.message,
//         processingTime,
//         success: false
//       }, 
//       { status: statusCode }
//     );
//   }
// };

import { json } from '@remix-run/node';

// Helper function to extract file extension
const getFileExtension = (imageBase64) => {
  if (!imageBase64) return 'jpeg';
  
  // Extract from data URL if present
  const match = imageBase64.match(/data:image\/([^;]+)/);
  if (match) {
    return match[1];
  }
  
  return 'jpeg'; // Default fallback
};

// Helper function to generate image name
const generateImageName = (type, id) => {
  const timestamp = Date.now();
  return `${type}_image_${id || timestamp}`;
};

// Main function to call your production API with dynamic credentials
async function generateAltTextWithProductionAPI({
  imageBase64,
  type,
  title = '',
  keywords = [],
  file_extension = 'jpeg',
  alt_quality = 'medium',
  language = 'en',
  product_name = '',
  userDetails = {},
  imageId = '',
  apiKey,        // Add this parameter
  userId         // Add this parameter
}) {
  try {
    // Dynamic API configuration using passed credentials
    const API_CONFIG = {
      endpoint: 'https://alt-magic-api-eabaa2c8506a.herokuapp.com/alt-generator-shp',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}` // Use dynamic API key
      },
      defaultSettings: {
        alt_quality: 'medium',
        language: 'en',
        model_type: 'gemini',
        source: 'shopify'
      },
      userId: userId // Use dynamic user ID
    };

    const requestBody = {
      image: imageBase64, // For base64 images
      title: title,
      context: '', // Can be populated if needed
      keywords: Array.isArray(keywords) ? keywords : (keywords ? keywords.split(',').map(k => k.trim()) : []),
      user_id: API_CONFIG.userId,
      image_name: generateImageName(type, imageId),
      image_type: 'base64', // Since we're sending base64
      image_url: '', // Empty for base64 images
      alt_quality: alt_quality,
      file_extension: file_extension,
      image_id: imageId || '',
      source: API_CONFIG.defaultSettings.source,
      site_id: '',
      language: language,
      model_type: API_CONFIG.defaultSettings.model_type,
      product_name: product_name,
      alt_gen_settings_shp: userDetails || {}
    };

    console.log('Calling production API with:', {
      endpoint: API_CONFIG.endpoint,
      imageType: requestBody.image_type,
      userId: requestBody.user_id,
      model: requestBody.model_type,
      hasApiKey: !!apiKey
    });

    const response = await fetch(API_CONFIG.endpoint, {
      method: 'POST',
      headers: API_CONFIG.headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      let errorMessage = `API request failed: ${response.status}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (parseError) {
        // If we can't parse the error response, use the status text
        errorMessage = `${errorMessage} - ${response.statusText}`;
      }

      // Handle specific error cases
      if (response.status === 403) {
        throw new Error('No credits remaining. Please upgrade your plan.');
      } else if (response.status === 404) {
        throw new Error('User not found. Please check your configuration.');
      } else if (response.status === 401) {
        throw new Error('Invalid API key. Please check your credentials.');
      } else if (response.status === 500) {
        throw new Error('Internal server error. Please try again later.');
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    if (!data.alt_text) {
      throw new Error('No alt text returned from production API');
    }

    console.log('Production API response:', {
      altTextLength: data.alt_text.length,
      creditsRemaining: data.credits_available,
      thumbnailUrl: data.thumbnail_url
    });

    // Apply user-specific prefix/suffix if available
    let finalAltText = data.alt_text;
    
    if (userDetails?.alt_gen_start_end) {
      if (userDetails.alt_gen_start_end.alt_gen_start) {
        finalAltText = userDetails.alt_gen_start_end.alt_gen_start + ' ' + finalAltText;
      }
      if (userDetails.alt_gen_start_end.alt_gen_end) {
        finalAltText = finalAltText + ' ' + userDetails.alt_gen_start_end.alt_gen_end;
      }
    }

    return {
      altText: finalAltText,
      creditsAvailable: data.credits_available,
      thumbnailUrl: data.thumbnail_url,
      tokenDetails: {} // Production API doesn't return token details, but keeping for compatibility
    };

  } catch (error) {
    console.error('Production API error:', error.message);
    
    // Re-throw with more context
    if (error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to alt text generation service');
    }
    
    throw error;
  }
}

export const action = async ({ request }) => {
  let startTime = Date.now();
  
  try {
    const body = await request.json();

    const {
      imageBase64,
      type,
      title = '',
      keywords = '',
      file_extension = '',
      alt_quality = 'medium',
      language = 'en',
      product_name = '',
      alt_gen_type = 'default',
      userDetails = {},
      imageId = '',
      apiKey,        // Add this to request body
      userId         // Add this to request body
    } = body;

    // Validate required fields
    if (!imageBase64) {
      return json({ error: 'Image data is required' }, { status: 400 });
    }

    // Validate credentials
    if (!apiKey) {
      return json({ error: 'API key is required' }, { status: 401 });
    }

    if (!userId) {
      return json({ error: 'User ID is required' }, { status: 401 });
    }

    // Auto-detect file extension if not provided
    const detectedExtension = file_extension || getFileExtension(imageBase64);

    console.log('Starting alt text generation:', {
      type,
      title: title.substring(0, 50) + '...',
      fileExtension: detectedExtension,
      altQuality: alt_quality,
      language,
      imageId,
      userId,
      hasApiKey: !!apiKey
    });

    // Call the production API with dynamic credentials
    const result = await generateAltTextWithProductionAPI({
      imageBase64,
      type,
      title,
      keywords,
      file_extension: detectedExtension,
      alt_quality,
      language,
      product_name,
      userDetails,
      imageId,
      apiKey,        // Pass API key
      userId         // Pass user ID
    });

    const processingTime = Date.now() - startTime;
    
    console.log('Alt text generation completed:', {
      processingTime: `${processingTime}ms`,
      altTextLength: result.altText.length,
      creditsRemaining: result.creditsAvailable
    });

    // Return response in the format your frontend expects
    return json({
      altText: result.altText,
      creditsAvailable: result.creditsAvailable,
      thumbnailUrl: result.thumbnailUrl,
      processingTime,
      success: true
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('Alt text generation failed:', {
      error: error.message,
      processingTime: `${processingTime}ms`
    });

    // Return appropriate error response
    let statusCode = 500;
    let errorMessage = 'Alt text generation failed';

    if (error.message.includes('No credits remaining')) {
      statusCode = 403;
      errorMessage = 'No credits remaining';
    } else if (error.message.includes('User not found')) {
      statusCode = 404;
      errorMessage = 'User not found';
    } else if (error.message.includes('Invalid API key')) {
      statusCode = 401;
      errorMessage = 'Invalid API key';
    } else if (error.message.includes('Network error')) {
      statusCode = 503;
      errorMessage = 'Service temporarily unavailable';
    } else if (error.message.includes('Image data is required')) {
      statusCode = 400;
      errorMessage = 'Invalid request data';
    } else if (error.message.includes('API key is required') || error.message.includes('User ID is required')) {
      statusCode = 401;
      errorMessage = 'Authentication required';
    }

    return json(
      { 
        error: errorMessage,
        details: error.message,
        processingTime,
        success: false
      }, 
      { status: statusCode }
    );
  }
};
