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
  file_extension = 'jpeg',
  alt_quality = 'medium',
  language = '',
  product_name = '',
  userDetails = {},
  imageId = '',
  apiKey,        
  userId         
}) {
  try {
    // Dynamic API configuration using passed credentials
    const API_CONFIG = {
      endpoint: 'https://alt-magic-api-eabaa2c8506a.herokuapp.com/alt-generator-shp',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}` 
      },
      userId: userId 
    };

    const requestBody = {
      image: imageBase64,
      title: title,
      context: '', 
      user_id: API_CONFIG.userId,
      image_name: generateImageName(type, imageId),
      image_type: 'base64', 
      image_url: '', 
      alt_quality: alt_quality,                     
      file_extension: file_extension,
      image_id: imageId || '',
      source: 'shopify_app',
      language: language,
      model_type: 'gemini',
      product_name: product_name,
      alt_gen_settings_shp: userDetails || {}
    };

    console.log('Calling production API with:', {
      endpoint: API_CONFIG.endpoint,
      imageType: requestBody.image_type,
      userId: requestBody.user_id,
      model: requestBody.model_type,
      language: requestBody.language,
      source: requestBody.source,
      hasApiKey: !!apiKey,
      hasTitle: !!title
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
      thumbnailUrl: data.thumbnail_url,
      language: language
    });

    // Return raw alt text (prefix/suffix will be applied later)
    return {
      altText: data.alt_text,
      creditsAvailable: data.credits_available,
      thumbnailUrl: data.thumbnail_url,
      tokenDetails: {} 
    };

  } catch (error) {
    console.error('Production API error:', error.message);
    
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
      file_extension = '',
      alt_quality = 'medium',
      product_name = '',
      imageId = '',
      apiKey,        
      userId,
      productTitle = '',
      language = '', // ✅ Get language directly from request
      textPrefix = '', // ✅ Get prefix directly from request
      textSuffix = '', // ✅ Get suffix directly from request  
      postContext = false // ✅ Get postContext directly from request
    } = body;

    // Validate required fields
    if (!imageBase64) {
      return json({ error: 'Image data is required' }, { status: 400 });
    }

    if (!apiKey) {
      return json({ error: 'API key is required' }, { status: 401 });
    }

    if (!userId) {
      return json({ error: 'User ID is required' }, { status: 401 });
    }

    // ✅ Map language to API codes
    const languageMapping = {
      'english': 'en',
      'spanish': 'es', 
      'french': 'fr',
      'german': 'de',
      'japanese': 'ja',
      'korean': 'ko',
      'hindi': 'hi'
    };
    
    const mappedLanguage = languageMapping[language.toLowerCase()] || 'en';
    
    // ✅ Handle title based on postContext
    const titleToSend = postContext ? (productTitle || title) : '';

    console.log('🔧 Processing request with localStorage settings:', {
      receivedLanguage: language,
      mappedLanguage: mappedLanguage,
      titleIncluded: postContext,
      titleToSend: titleToSend,
      prefix: textPrefix,
      suffix: textSuffix
    });

    // Auto-detect file extension if not provided
    const detectedExtension = file_extension || getFileExtension(imageBase64);

    // Call the production API
    const result = await generateAltTextWithProductionAPI({
      imageBase64,
      type,
      title: titleToSend,
      file_extension: detectedExtension,
      alt_quality,
      language: mappedLanguage, // ✅ Use mapped language from localStorage
      product_name,
      userDetails: {},
      imageId,
      apiKey,        
      userId         
    });

    const processingTime = Date.now() - startTime;
    
    // ✅ Apply prefix/suffix from localStorage
    let finalAltText = result.altText;
    
    if (textPrefix || textSuffix) {
      const parts = [];
      
      if (textPrefix && textPrefix.trim()) {
        parts.push(textPrefix.trim());
      }
      
      if (result.altText && result.altText.trim()) {
        parts.push(result.altText.trim());
      }
      
      if (textSuffix && textSuffix.trim()) {
        parts.push(textSuffix.trim());
      }
      
      finalAltText = parts.join(' ');
      
      console.log('🎨 Applied prefix/suffix from localStorage:', {
        original: result.altText,
        prefix: textPrefix,
        suffix: textSuffix,
        final: finalAltText
      });
    }
    
    console.log('✅ Alt text generation completed:', {
      processingTime: `${processingTime}ms`,
      altTextLength: finalAltText.length,
      language: mappedLanguage,
      originalLanguage: language
    });

    // Return response with prefix/suffix applied
    return json({
      altText: finalAltText,
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
