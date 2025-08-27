// utils/api.js

const API_BASE_URL = 'https://alt-magic-api-eabaa2c8506a.herokuapp.com';

// API service for fetching user data
export const fetchUserData = async (userId, storeUrl) => {
  try {
    const response = await fetch(`${API_BASE_URL}/shopify-get-user-details`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        store_url: storeUrl
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch user data: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in fetchUserData:', error);
    throw error;
  }
};

// API service for saving store settings
export const saveUserSettings = async (userId, storeUrl, settings) => {
  try {
    const requestBody = {
      user_id: userId,
      store_url: storeUrl,
      store_settings: settings
    };

    console.log('Sending request body:', requestBody);

    const response = await fetch(`${API_BASE_URL}/shopify-update-shopify-settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to save settings: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in saveUserSettings:', error);
    throw error;
  }
};

// Validation function
export const validateFormData = (formState) => {
  const errors = [];
  
  if (formState.textPrefix && formState.textPrefix.length > 100) {
    errors.push("Text prefix must be 100 characters or less");
  }
  
  if (formState.textSuffix && formState.textSuffix.length > 100) {
    errors.push("Text suffix must be 100 characters or less");
  }
  
  return errors;
};

// Helper function to transform form data to API format
export const transformFormDataToAPI = (formState) => {
  const mapLanguageNameToCode = (name) => {
    const languageMap = {
      'english': 'en',
      'spanish': 'es',
      'french': 'fr',
      'german': 'de',
      'japanese': 'ja',
      'korean': 'ko',
      'hindi': 'hi'
    };
    return languageMap[name] || 'en';
  };

  return {
    alt_magic_auto_generate: formState.autoGenerate ? "1" : "0",
    alt_magic_language: mapLanguageNameToCode(formState.language),
    alt_magic_prepend_string: formState.textPrefix || "",
    alt_magic_append_string: formState.textSuffix || "",
    alt_magic_use_post_title: formState.postContext ? "1" : "0",
    alt_magic_use_product_name: formState.fieldMapping.useForDescription ? "1" : "0"
  };
};

// Helper function to transform API data to form format
export const transformAPIDataToForm = (apiData) => {
  const mapLanguageCodeToName = (code) => {
    const languageMap = {
      'en': 'english',
      'es': 'spanish',
      'fr': 'french',
      'de': 'german',
      'ja': 'japanese',
      'ko': 'korean',
      'hi': 'hindi'
    };
    return languageMap[code] || 'english';
  };

  const storeSettings = apiData.store_data?.store_settings || {};
  const userDetails = apiData.user_details || {};
  const aiGenSettings = userDetails.ai_gen_settings || {};

  return {
    autoGenerate: storeSettings.alt_magic_auto_generate === "1",
    verbosity: aiGenSettings.alt_gen_type || userDetails.alt_gen_type || "standard",
    language: mapLanguageCodeToName(
      storeSettings.alt_magic_language || 
      userDetails.language || 
      "en"
    ),
    fieldMapping: {
      useForTitle: false,
      useForCaption: false,
      useForDescription: storeSettings.alt_magic_use_product_name === "1",
    },
    textPrefix: storeSettings.alt_magic_prepend_string || "",
    textSuffix: storeSettings.alt_magic_append_string || "",
    seoIntegration: true,
    postContext: storeSettings.alt_magic_use_post_title === "1",
    updateStrategy: "empty_only",
    performanceLevel: "1",
  };
};

// Add this function to your utils/api.js or create a new API function
export const fetchShopInfo = async (shop) => {
  try {
    const response = await fetch(`/api/shop-info?shop=${shop}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching shop info:', error);
    throw error;
  }
};


// // utils/api.js
// // utils/api.js

// const API_BASE_URL = 'https://alt-magic-api-eabaa2c8506a.herokuapp.com';

// // API service for fetching user data
// export const fetchUserData = async (userId, storeUrl) => {
//   try {
//     const response = await fetch(`${API_BASE_URL}/shopify-get-user-details`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         user_id: userId,
//         store_url: storeUrl
//       })
//     });
    
//     if (!response.ok) {
//       const errorText = await response.text();
//       throw new Error(`Failed to fetch user data: ${response.status} ${errorText}`);
//     }
    
//     const data = await response.json();
//     return data;
//   } catch (error) {
//     console.error('Error in fetchUserData:', error);
//     throw error;
//   }
// };

// // API service for saving user settings
// export const saveUserSettings = async (userId, storeUrl, settings) => {
//   try {
//     const response = await fetch(`${API_BASE_URL}/shopify-update-shopify-settings`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         user_id: userId,
//         store_url: storeUrl,
//         store_settings: settings
//       })
//     });
    
//     if (!response.ok) {
//       const errorText = await response.text();
//       throw new Error(`Failed to save settings: ${response.status} ${errorText}`);
//     }
    
//     const data = await response.json();
//     return data;
//   } catch (error) {
//     console.error('Error in saveUserSettings:', error);
//     throw error;
//   }
// };

// // Helper function to transform form data to API format
// export const transformFormDataToAPI = (formState) => {
//   const mapLanguageNameToCode = (name) => {
//     const languageMap = {
//       'english': 'en',
//       'spanish': 'es',
//       'french': 'fr',
//       'german': 'de',
//       'japanese': 'ja',
//       'korean': 'ko'
//     };
//     return languageMap[name] || 'en';
//   };

//   // Return only the store_settings object as expected by your API
//   return {
//     alt_magic_auto_generate: formState.autoGenerate ? "1" : "0",
//     alt_magic_language: mapLanguageNameToCode(formState.language),
//     alt_magic_prepend_string: formState.textPrefix || "",
//     alt_magic_append_string: formState.textSuffix || "",
//     alt_magic_use_post_title: formState.postContext ? "1" : "0",
//     alt_magic_use_product_name: "1" // Keep this as default
//   };
// };

// // Helper function to transform API data to form format
// export const transformAPIDataToForm = (apiData) => {
//   const mapLanguageCodeToName = (code) => {
//     const languageMap = {
//       'en': 'english',
//       'es': 'spanish',
//       'fr': 'french',
//       'de': 'german',
//       'ja': 'japanese',
//       'ko': 'korean'
//     };
//     return languageMap[code] || 'english';
//   };

//   const storeSettings = apiData.store_data?.store_settings || {};
//   const userDetails = apiData.user_details || {};
//   const aiGenSettings = userDetails.ai_gen_settings || {};

//   return {
//     autoGenerate: storeSettings.alt_magic_auto_generate === "1",
//     verbosity: aiGenSettings.alt_gen_type || "standard",
//     language: mapLanguageCodeToName(storeSettings.alt_magic_language || userDetails.language || "en"),
//     fieldMapping: {
//       useForTitle: false,
//       useForCaption: false,
//       useForDescription: false,
//     },
//     textPrefix: storeSettings.alt_magic_prepend_string || "",
//     textSuffix: storeSettings.alt_magic_append_string || "",
//     seoIntegration: true,
//     postContext: storeSettings.alt_magic_use_post_title === "1",
//     updateStrategy: "empty_only",
//     performanceLevel: "1",
//   };
// };
