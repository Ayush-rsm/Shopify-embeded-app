import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';

export const action = async ({ request }) => {
  try {
    console.log('🚀 API endpoint hit - update-blog-alt-text');
    
    // ✅ Get store-specific authentication
    const { admin, session } = await authenticate.admin(request);
    const shopDomain = session.shop;
    
    const bodyData = await request.json();
    const { imageId, altText, blogId, articleId, imageType } = bodyData;

    console.log('📝 Received data:', { imageId, altText, blogId, articleId, shopDomain, imageType });

    // Validation
    const missingFields = [];
    if (!imageId) missingFields.push('imageId');
    if (!altText) missingFields.push('altText');
    if (!blogId) missingFields.push('blogId');
    if (!articleId) missingFields.push('articleId');

    if (missingFields.length > 0) {
      return json({
        error: 'Missing required fields',
        details: `The following fields are required: ${missingFields.join(', ')}`,
      }, { status: 400 });
    }

    try {
      // ✅ CRITICAL: Check imageType FIRST before any API calls
      console.log('🔍 Image type received:', imageType);
      console.log('🏪 Processing for shop:', shopDomain);
      
      if (imageType === 'featured') {
        console.log('🖼️ Processing FEATURED image - using direct article.image.alt update');
        
        // ✅ FOR FEATURED IMAGES: Update article.image.alt directly
        // Use both REST API and fallback to manual fetch for compatibility
        try {
          // Try Shopify REST API first
          const article = new admin.rest.resources.Article({ session });
          article.blog_id = parseInt(blogId);
          article.id = parseInt(articleId);
          article.image = { alt: altText };

          await article.save({ update: true });

          console.log('✅ Featured image updated successfully via REST API');

          return json({
            success: true,
            message: `Successfully updated featured image alt text to "${altText}"`,
            data: {
              blogId,
              articleId,
              imageId,
              newAltText: altText,
              imageType: 'featured',
              shopDomain,
              updatedAt: new Date().toISOString(),
              methodUsed: 'shopify_rest_api'
            }
          });

        } catch (restError) {
          console.log('⚠️ REST API failed, trying manual fetch method...', restError.message);
          
          // ✅ Fallback to manual fetch method
          const accessToken = session.accessToken;
          
          const updateResponse = await fetch(
            `https://${shopDomain}/admin/api/2023-10/blogs/${blogId}/articles/${articleId}.json`,
            {
              method: 'PUT',
              headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                article: {
                  id: parseInt(articleId),
                  image: {
                    alt: altText // ✅ Update ONLY the alt text of the featured image
                  }
                }
              }),
            }
          );

          console.log('💾 Featured image update response status:', updateResponse.status);

          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('❌ Featured image update error:', errorText);
            
            // Try to get more specific error info
            try {
              const errorJson = JSON.parse(errorText);
              throw new Error(`Featured image update failed: ${errorJson.errors || errorText}`);
            } catch {
              throw new Error(`Featured image update failed: ${updateResponse.status} ${updateResponse.statusText}`);
            }
          }

          const result = await updateResponse.json();
          console.log('✅ Featured image updated successfully via fetch fallback:', result);

          return json({
            success: true,
            message: `Successfully updated featured image alt text to "${altText}"`,
            data: {
              blogId,
              articleId,
              imageId,
              newAltText: altText,
              imageType: 'featured',
              shopDomain,
              updatedAt: new Date().toISOString(),
              methodUsed: 'fetch_fallback_method'
            }
          });
        }

      } else if (imageType === 'inline') {
        console.log('📝 Processing INLINE image - using HTML content modification');
        
        // ✅ FOR INLINE IMAGES: Modify HTML content
        try {
          // Try REST API first
          const article = new admin.rest.resources.Article({ session });
          article.blog_id = parseInt(blogId);
          article.id = parseInt(articleId);
          
          await article.find();
          
          if (!article.body_html) {
            throw new Error('Article body_html not found via REST API');
          }

          // Modify HTML content
          let updatedContent = article.body_html;
          const originalContent = updatedContent;

          // Find and update the inline image
          const imageUrlWithAltRegex = new RegExp(
            `(<img[^>]*src=["']\\s*${escapeRegex(imageId)}\\s*["'][^>]*alt=["'])[^"']*(['"][^>]*>)`,
            'gi'
          );
          updatedContent = updatedContent.replace(imageUrlWithAltRegex, `$1${altText}$2`);

          // Add alt if doesn't exist
          if (updatedContent === originalContent) {
            const imageUrlNoAltRegex = new RegExp(
              `(<img[^>]*src=["']\\s*${escapeRegex(imageId)}\\s*["'])([^>]*?)(?![^>]*alt=)([^>]*>)`,
              'gi'
            );
            updatedContent = updatedContent.replace(imageUrlNoAltRegex, `$1$2 alt="${altText}"$3`);
          }

          if (updatedContent === originalContent) {
            return json({
              error: 'Inline image not found in article HTML content',
              details: `No inline image with URL "${imageId}" found in article body_html`,
            }, { status: 404 });
          }

          // Update the article with modified HTML
          article.body_html = updatedContent;
          await article.save({ update: true });

          return json({
            success: true,
            message: `Successfully updated inline image alt text to "${altText}"`,
            data: {
              blogId,
              articleId,
              imageId,
              newAltText: altText,
              imageType: 'inline',
              shopDomain,
              updatedAt: new Date().toISOString(),
              methodUsed: 'rest_api_html_content_update'
            }
          });

        } catch (restError) {
          console.log('⚠️ REST API failed for inline image, trying fetch method...', restError.message);
          
          // ✅ Fallback to manual fetch method for inline images
          const accessToken = session.accessToken;
          
          // First get the article
          const articleResponse = await fetch(
            `https://${shopDomain}/admin/api/2023-10/blogs/${blogId}/articles/${articleId}.json`,
            {
              method: 'GET',
              headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!articleResponse.ok) {
            throw new Error(`Failed to fetch article: ${articleResponse.status}`);
          }

          const articleData = await articleResponse.json();
          const article = articleData.article;

          // Modify HTML content
          let updatedContent = article.body_html || '';
          const originalContent = updatedContent;

          // Find and update the inline image
          const imageUrlWithAltRegex = new RegExp(
            `(<img[^>]*src=["']\\s*${escapeRegex(imageId)}\\s*["'][^>]*alt=["'])[^"']*(['"][^>]*>)`,
            'gi'
          );
          updatedContent = updatedContent.replace(imageUrlWithAltRegex, `$1${altText}$2`);

          // Add alt if doesn't exist
          if (updatedContent === originalContent) {
            const imageUrlNoAltRegex = new RegExp(
              `(<img[^>]*src=["']\\s*${escapeRegex(imageId)}\\s*["'])([^>]*?)(?![^>]*alt=)([^>]*>)`,
              'gi'
            );
            updatedContent = updatedContent.replace(imageUrlNoAltRegex, `$1$2 alt="${altText}"$3`);
          }

          if (updatedContent === originalContent) {
            return json({
              error: 'Inline image not found in article HTML content',
              details: `No inline image with URL "${imageId}" found in article body_html`,
            }, { status: 404 });
          }

          // Update the article with modified HTML
          const updateResponse = await fetch(
            `https://${shopDomain}/admin/api/2023-10/blogs/${blogId}/articles/${articleId}.json`,
            {
              method: 'PUT',
              headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                article: {
                  id: parseInt(articleId),
                  body_html: updatedContent,
                },
              }),
            }
          );

          if (!updateResponse.ok) {
            throw new Error(`Failed to update inline image: ${updateResponse.status}`);
          }

          return json({
            success: true,
            message: `Successfully updated inline image alt text to "${altText}"`,
            data: {
              blogId,
              articleId,
              imageId,
              newAltText: altText,
              imageType: 'inline',
              shopDomain,
              updatedAt: new Date().toISOString(),
              methodUsed: 'fetch_fallback_html_content_update'
            }
          });
        }

      } else {
        // ❌ Unknown image type
        throw new Error(`Unknown imageType: "${imageType}". Expected "featured" or "inline"`);
      }

    } catch (apiError) {
      console.error('❌ API Error:', apiError);
      return json({
        error: 'Failed to update blog image',
        details: apiError.message,
        imageType: imageType,
        shopDomain,
      }, { status: 500 });
    }

  } catch (authError) {
    console.error('❌ Authentication Error:', authError);
    return json({
      error: 'Authentication failed',
      details: 'Unable to authenticate with Shopify. Please ensure the app is properly installed.',
    }, { status: 401 });
  }
};

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const loader = async () => {
  return json({
    error: 'Method not allowed',
    message: 'This endpoint only accepts POST requests',
  }, { status: 405 });
};
