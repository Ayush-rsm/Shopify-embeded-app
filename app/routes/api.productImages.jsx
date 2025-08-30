import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);

    const productQuery = `
      query GetAllProductMedia {
        products(first: 250) {
          edges {
            node {
              id
              title
              handle
              status
              publishedAt
              createdAt
              updatedAt
              media(first: 50) {
                edges {
                  node {
                    ... on MediaImage {
                      id
                      alt
                      image {
                        url
                        width
                        height
                      }
                      createdAt
                      updatedAt
                    }
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage 
            endCursor
          }
        }
      }
    `;

    console.log('🔍 Fetching all products with status information...');
    
    const res = await admin.graphql(productQuery);
    const data = await res.json();

    // Check for GraphQL errors
    if (data.errors) {
      console.error('❌ GraphQL errors:', data.errors);
      return json({ 
        images: [], 
        error: 'Failed to fetch products',
        details: data.errors,
        totalCount: 0,
        statusBreakdown: { active: 0, draft: 0, archived: 0 }
      }, { status: 500 });
    }

    const products = data?.data?.products?.edges || [];
    const pageInfo = data?.data?.products?.pageInfo || {};
    console.log(`📊 Fetched ${products.length} products from GraphQL`);

    // 🚨 DETAILED DEBUGGING: Log raw product data
    console.log('🔍 RAW PRODUCT STATUS SAMPLE:');
    products.slice(0, 3).forEach((product, idx) => {
      console.log(`Product ${idx + 1}:`, {
        id: product.node.id,
        title: product.node.title,
        status: product.node.status,
        statusType: typeof product.node.status,
        publishedAt: product.node.publishedAt,
        mediaCount: product.node.media?.edges?.length || 0
      });
    });

    const productImages = products.flatMap((product) => {
      const productNode = product.node;
      const productId = productNode.id;
      const productStatus = productNode.status; // "ACTIVE", "DRAFT", or "ARCHIVED"
      const productTitle = productNode.title;
      const productHandle = productNode.handle;
      const publishedAt = productNode.publishedAt;
      
      // 🚨 DEBUG: Log each product's status processing
      console.log(`\n🔍 PROCESSING PRODUCT: "${productTitle}"`);
      console.log(`  Original status: "${productStatus}" (type: ${typeof productStatus})`);
      console.log(`  Published at: ${publishedAt}`);
      console.log(`  Media count: ${productNode.media?.edges?.length || 0}`);
      
      return (productNode.media?.edges || []).flatMap((edge) => {
        const mediaNode = edge.node;
        if (!mediaNode.image) {
          console.log(`  ⚠️ Skipping media ${mediaNode.id} - no image`);
          return [];
        }

        // Status inheritance logic
        const normalizedStatus = productStatus ? productStatus.toLowerCase() : 'active';
        const isPublished = productStatus === 'ACTIVE';

        // 🚨 DEBUG: Log inheritance for each image
        console.log(`  📸 Image ${mediaNode.id}:`);
        console.log(`    Inheriting status: "${productStatus}" → "${normalizedStatus}"`);
        console.log(`    Published: ${isPublished}`);

        const imageObject = {
          id: mediaNode.id,
          image: mediaNode.image.url,
          altText: mediaNode.alt || "",
          type: "product",
          
          // 🚨 EXPLICIT STATUS INHERITANCE
          status: normalizedStatus,
          productStatus: normalizedStatus, 
          published_status: normalizedStatus,
          published: isPublished,
          published_at: publishedAt,
          
          // Additional metadata
          processedOn: "",
          shopifyImageId: mediaNode.id,
          originalId: mediaNode.id,
          productId: productId,
          productTitle: productTitle,
          productHandle: productHandle,
          
          // Image metadata
          imageWidth: mediaNode.image.width,
          imageHeight: mediaNode.image.height,
          imageCreatedAt: mediaNode.createdAt,
          imageUpdatedAt: mediaNode.updatedAt,
          
          // Product metadata
          productCreatedAt: productNode.createdAt,
          productUpdatedAt: productNode.updatedAt,
          
          // 🚨 ENHANCED DEBUG INFO
          _statusDebug: {
            originalProductStatus: productStatus,
            normalizedStatus: normalizedStatus,
            isPublished: isPublished,
            inheritanceSource: 'product',
            productId: productId,
            mediaId: mediaNode.id
          }
        };

        // 🚨 VERIFY: Log the final image object status fields
        console.log(`    ✅ Final image object status fields:`);
        console.log(`      status: "${imageObject.status}"`);
        console.log(`      productStatus: "${imageObject.productStatus}"`);
        console.log(`      published: ${imageObject.published}`);

        return [imageObject];
      });
    });

    // 🚨 COMPREHENSIVE STATUS ANALYSIS
    console.log('\n📊 COMPREHENSIVE STATUS ANALYSIS:');
    const statusBreakdown = {
      active: productImages.filter(img => img.status === 'active').length,
      draft: productImages.filter(img => img.status === 'draft').length,
      archived: productImages.filter(img => img.status === 'archived').length,
      total: productImages.length
    };

    console.log(`Total images: ${productImages.length}`);
    console.log('Status breakdown:', statusBreakdown);
    
    // 🚨 DETAILED STATUS VERIFICATION
    console.log('\n🔍 SAMPLE IMAGE STATUS VERIFICATION:');
    productImages.slice(0, 5).forEach((img, idx) => {
      console.log(`Image ${idx + 1}: ${img.id}`);
      console.log(`  status: "${img.status}" (${typeof img.status})`);
      console.log(`  published: ${img.published} (${typeof img.published})`);
      console.log(`  from product: "${img.productTitle}"`);
      console.log(`  original product status: "${img._statusDebug.originalProductStatus}"`);
    });

    // 🚨 CHECK FOR STATUS DISTRIBUTION ISSUES
    const uniqueStatuses = [...new Set(productImages.map(img => img.status))];
    console.log('\n🔍 UNIQUE STATUS VALUES FOUND:', uniqueStatuses);
    
    if (uniqueStatuses.length === 1 && uniqueStatuses[0] === 'active') {
      console.warn('⚠️ WARNING: ALL IMAGES HAVE STATUS "active" - Check if all products are ACTIVE');
      console.warn('⚠️ To test filtering, you need products with DRAFT or ARCHIVED status');
    }

    // 🚨 API RESPONSE VERIFICATION
    console.log('\n📤 API RESPONSE PREVIEW:');
    console.log('First 2 images being returned:');
    productImages.slice(0, 2).forEach((img, idx) => {
      console.log(`Image ${idx + 1}:`, {
        id: img.id,
        status: img.status,
        published: img.published,
        productTitle: img.productTitle
      });
    });

    return json({
      images: productImages,
      totalCount: productImages.length,
      statusBreakdown: statusBreakdown,
      pagination: {
        hasNextPage: pageInfo.hasNextPage,
        endCursor: pageInfo.endCursor,
        currentPageSize: products.length,
        limit: 250
      },
      _debug: {
        productCount: products.length,
        timestamp: new Date().toISOString(),
        statusBreakdown: statusBreakdown,
        uniqueStatuses: uniqueStatuses,
        inheritanceWorking: uniqueStatuses.length > 1 ? 'YES' : 'CHECK_PRODUCTS'
      }
    });

  } catch (error) {
    console.error('❌ Error in productImages API:', error);
    
    return json({
      images: [],
      error: 'Internal server error',
      details: error.message,
      totalCount: 0,
      statusBreakdown: { active: 0, draft: 0, archived: 0 }
    }, { status: 500 });
  }
};
