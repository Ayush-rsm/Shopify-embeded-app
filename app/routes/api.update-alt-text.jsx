import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';

export const action = async ({ request }) => {
  try {
    const bodyData = await request.json();
    const { admin } = await authenticate.admin(request);
    const { imageId, altText, productId } = bodyData;

    console.log('Updating alt text for:', { imageId, altText, productId });

    if (!imageId || !altText) {
      return json({
        error: 'Missing required fields',
        details: 'imageId and altText are required',
      }, { status: 400 });
    }

    let productGraphqlId = productId;

    // If no productId provided, try to infer it by searching products
    if (!productGraphqlId && imageId.includes('MediaImage')) {
      try {
        console.log('Fetching MediaImage data (without product)...');

        // This only confirms the image exists — no product link here
        const imageQuery = `
          query getImageProduct($id: ID!) {
            node(id: $id) {
              ... on MediaImage {
                id
                alt
              }
            }
          }
        `;

        const imageResponse = await admin.graphql(imageQuery, {
          variables: { id: imageId },
        });
        const imageResult = await imageResponse.json();

        console.log('Image query result (MediaImage only):', imageResult);

        // Now do fallback: Search products to find one containing this image
        const productsQuery = `
          query findProductByImage {
            products(first: 50) {
              edges {
                node {
                  id
                  media(first: 50) {
                    edges {
                      node {
                        id
                      }
                    }
                  }
                }
              }
            }
          }
        `;

        const productsResponse = await admin.graphql(productsQuery);
        const productsResult = await productsResponse.json();

        const product = productsResult.data?.products?.edges?.find(productEdge =>
          productEdge.node.media.edges.some(mediaEdge =>
            mediaEdge.node.id === imageId
          )
        );

        if (product) {
          productGraphqlId = product.node.id;
          console.log('Found product ID via products query:', productGraphqlId);
        } else {
          return json({
            error: 'Product not found',
            details: 'Unable to find the product for this image. Please ensure the productId is included in your image data.',
          }, { status: 400 });
        }
      } catch (queryError) {
        console.error('Error fetching product ID:', queryError);
        return json({
          error: 'Failed to fetch product information',
          details: queryError.message,
        }, { status: 500 });
      }
    } else if (productGraphqlId && !productGraphqlId.startsWith('gid://')) {
      productGraphqlId = `gid://shopify/Product/${productGraphqlId}`;
    }

    if (!productGraphqlId) {
      return json({
        error: 'Product ID required',
        details: 'productId is required for media updates. Please include productId in your image data or ensure the image ID is valid.',
      }, { status: 400 });
    }

    // Use GraphQL mutation for MediaImage (GraphQL ID)
    if (imageId.includes('MediaImage')) {
      const mutation = `
        mutation productUpdateMedia($productId: ID!, $media: [UpdateMediaInput!]!) {
          productUpdateMedia(productId: $productId, media: $media) {
            media {
              id
              alt
              status
              ... on MediaImage {
                image {
                  url
                }
              }
            }
            mediaUserErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        productId: productGraphqlId,
        media: [{
          id: imageId,
          alt: altText,
        }],
      };

      console.log('ProductUpdateMedia variables:', variables);

      const response = await admin.graphql(mutation, { variables });
      const result = await response.json();

      console.log('ProductUpdateMedia response:', result);

      if (result.data?.productUpdateMedia?.mediaUserErrors?.length > 0) {
        return json({
          error: 'Shopify API error',
          details: result.data.productUpdateMedia.mediaUserErrors[0].message,
        }, { status: 400 });
      }

      return json({
        success: true,
        method: 'productUpdateMedia',
        data: result.data,
      });
    }

    // Use REST API for legacy numeric image IDs
    else if (!isNaN(imageId) && productGraphqlId) {
      try {
        const numericProductId = productGraphqlId.split('/').pop();

        const image = new admin.rest.resources.Image({
          session: admin.session,
        });

        image.product_id = parseInt(numericProductId);
        image.id = parseInt(imageId);
        image.alt = altText;

        await image.save({ update: true });

        return json({
          success: true,
          method: 'rest',
          data: { image: { id: imageId, altText: altText } },
        });
      } catch (restError) {
        console.error('REST API error:', restError);
        return json({
          error: 'REST API request failed',
          details: restError.message,
        }, { status: 500 });
      }
    }

    return json({
      error: 'Unsupported image ID format',
      details: `Received imageId: ${imageId}. Unable to determine update method.`,
    }, { status: 400 });

  } catch (error) {
    console.error('API Error:', error);
    return json({
      error: 'Internal server error',
      details: error.message,
    }, { status: 500 });
  }
};

export const loader = async () => {
  return json({
    error: 'Method not allowed',
    message: 'This endpoint only accepts POST requests',
  }, { status: 405 });
};


