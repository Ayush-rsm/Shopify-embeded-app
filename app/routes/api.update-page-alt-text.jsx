import { json } from '@remix-run/node';

export const action = async ({ request }) => {
  try {
    // Add request logging for debugging
    console.log('🚀 API endpoint hit - update-page-alt-text');
    
    const bodyData = await request.json();
    const { imageId, altText, pageId, shopDomain } = bodyData;

    console.log('📝 Received data:', { imageId, altText, pageId, shopDomain });

    // Enhanced validation
    const missingFields = [];
    if (!imageId) missingFields.push('imageId');
    if (!altText) missingFields.push('altText');
    if (!pageId) missingFields.push('pageId');
    if (!shopDomain) missingFields.push('shopDomain');

    if (missingFields.length > 0) {
      console.log('❌ Validation failed:', missingFields);
      return json({
        error: 'Missing required fields',
        details: `The following fields are required: ${missingFields.join(', ')}`,
        receivedFields: Object.keys(bodyData),
      }, { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

     const accessToken =  process.env.SHOPIFY_ACCESS_TOKEN;

    // Validate shop domain format
    if (!shopDomain.includes('.myshopify.com')) {
      return json({
        error: 'Invalid shop domain format',
        details: 'Shop domain should be in format: your-shop.myshopify.com',
        example: 'empowered-equity-dev.myshopify.com'
      }, { status: 400 });
    }

    try {
      console.log('📡 Fetching page data from Shopify...');

      // Step 1: GET page content
      const pageResponse = await fetch(
        `https://${shopDomain}/admin/api/2023-10/pages/${pageId}.json`,
        {
          method: 'GET',
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('📄 Page fetch response status:', pageResponse.status);

      if (!pageResponse.ok) {
        const errorText = await pageResponse.text();
        console.error('❌ Page fetch error:', errorText);
        
        if (pageResponse.status === 401) {
          return json({
            error: 'Authentication failed',
            details: 'Invalid access token or insufficient permissions',
          }, { status: 401 });
        }
        
        if (pageResponse.status === 404) {
          return json({
            error: 'Page not found',
            details: `Page with ID ${pageId} does not exist`,
          }, { status: 404 });
        }
        
        throw new Error(`Failed to fetch page: ${pageResponse.status} ${pageResponse.statusText}`);
      }

      const pageData = await pageResponse.json();
      const page = pageData.page;

      if (!page) {
        return json({
          error: 'Page not found',
          details: `Page with ID ${pageId} not found in response`,
        }, { status: 404 });
      }

      console.log('✅ Page found:', page.title);
      console.log('📝 Original content length:', page.body_html?.length || 0);

      // Step 2: Update HTML content
      let updatedContent = page.body_html || '';
      const originalContent = updatedContent;

      console.log('🔍 Searching for image with URL:', imageId);

      // Method 1: Find by exact image URL and update existing alt
      const imageUrlWithAltRegex = new RegExp(
        `(<img[^>]*src=["']\\s*${escapeRegex(imageId)}\\s*["'][^>]*alt=["'])[^"']*(['"][^>]*>)`,
        'gi'
      );
      updatedContent = updatedContent.replace(imageUrlWithAltRegex, `$1${altText}$2`);
      console.log('🔄 After method 1, changed:', updatedContent !== originalContent);

      // Method 2: Find by URL and add alt attribute if it doesn't exist
      if (updatedContent === originalContent) {
        console.log('🔧 Method 2: Adding alt attribute...');
        const imageUrlNoAltRegex = new RegExp(
          `(<img[^>]*src=["']\\s*${escapeRegex(imageId)}\\s*["'])([^>]*?)(?![^>]*alt=)([^>]*>)`,
          'gi'
        );
        updatedContent = updatedContent.replace(imageUrlNoAltRegex, `$1$2 alt="${altText}"$3`);
        console.log('🔄 After method 2, changed:', updatedContent !== originalContent);
      }

      // Method 3: More flexible matching
      if (updatedContent === originalContent) {
        console.log('🔧 Method 3: Flexible URL matching...');
        const flexibleUrlRegex = new RegExp(
          `(<img[^>]*${escapeRegex(imageId)}[^>]*alt=["'])[^"']*(['"][^>]*>)`,
          'gi'
        );
        updatedContent = updatedContent.replace(flexibleUrlRegex, `$1${altText}$2`);
        console.log('🔄 After method 3, changed:', updatedContent !== originalContent);
      }

      // Method 4: Try partial URL matching (filename only)
      if (updatedContent === originalContent && imageId.includes('/')) {
        console.log('🔧 Method 4: Trying filename only...');
        const filename = imageId.split('/').pop();
        const filenameRegex = new RegExp(
          `(<img[^>]*src=["'][^"']*${escapeRegex(filename)}[^"']*["'][^>]*alt=["'])[^"']*(['"][^>]*>)`,
          'gi'
        );
        updatedContent = updatedContent.replace(filenameRegex, `$1${altText}$2`);
        console.log('🔄 After method 4, changed:', updatedContent !== originalContent);
      }

      // Check if any changes were made
      if (updatedContent === originalContent) {
        console.log('❌ No matching image found');
        
        const imgTags = originalContent.match(/<img[^>]*>/gi) || [];
        const imgSources = imgTags.map(tag => {
          const srcMatch = tag.match(/src=["']([^"']*)["']/);
          return srcMatch ? srcMatch[1] : 'no src found';
        });

        console.log('🔍 Available images:', imgSources);

        return json({
          error: 'Image not found in page content',
          details: `No image with URL "${imageId}" found in page content`,
          debug: {
            pageId,
            pageTitle: page.title,
            searchedImageId: imageId,
            totalImagesFound: imgTags.length,
            availableImageSources: imgSources.slice(0, 5),
            suggestions: [
              'Check if the imageId exactly matches the src URL',
              'Try using just the filename instead of full URL',
              'Verify the image exists in the page content'
            ]
          }
        }, { status: 404 });
      }

      console.log('✅ Content updated successfully');

      // Step 3: PUT updated HTML back to Shopify
      console.log('💾 Saving updated content to Shopify...');
      
      const updateResponse = await fetch(
        `https://${shopDomain}/admin/api/2023-10/pages/${pageId}.json`,
        {
          method: 'PUT',
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            page: {
              id: parseInt(pageId),
              body_html: updatedContent,
            },
          }),
        }
      );

      console.log('💾 Update response status:', updateResponse.status);

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('❌ Page update error:', errorText);
        throw new Error(`Failed to update page: ${updateResponse.status} ${updateResponse.statusText}`);
      }

      console.log('🎉 Page updated successfully in Shopify');

      return json({
        success: true,
        message: `Successfully updated alt text for image in page "${page.title}"`,
        data: {
          pageId: pageId,
          pageTitle: page.title,
          imageId: imageId,
          newAltText: altText,
          updatedAt: new Date().toISOString(),
          methodUsed: 'page_rest_api'
        }
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

    } catch (apiError) {
      console.error('❌ API Error:', apiError);
      return json({
        error: 'Failed to update page',
        details: apiError.message,
        stack: process.env.NODE_ENV === 'development' ? apiError.stack : undefined,
      }, { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

  } catch (error) {
    console.error('❌ General Error:', error);
    return json({
      error: 'Internal server error',
      details: error.message,
      type: error.name,
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
};

// Helper function to escape special regex characters
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const loader = async () => {
  console.log('📋 GET request received - should be POST');
  return json({
    error: 'Method not allowed',
    message: 'This endpoint only accepts POST requests for page alt text updates',
    endpoint: '/api/update-page-alt-text',
    method: 'POST'
  }, { 
    status: 405,
    headers: {
      'Content-Type': 'application/json',
    }
  });
};
