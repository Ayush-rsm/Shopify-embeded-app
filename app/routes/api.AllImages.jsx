import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import * as cheerio from "cheerio";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  try {
    // Single GraphQL query for products, blogs, pages with publishedAt
    const allDataQuery = `
      query GetAllStoreImages {
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
        blogs(first: 250) {
          edges {
            node {
              id 
              title
              articles(first: 20) {
                edges {
                  node {
                    id 
                    title
                    image { altText url }
                    body
                    publishedAt    # Added for article visibility
                  }
                }
              }
            }
          }
        }
        pages(first: 250) {
          edges {
            node { 
              id 
              title 
              body 
              publishedAt      # Added for page visibility
            }
          }
        }
      }
    `;

    console.log('🔍 Fetching all products, blogs, and pages with status and visibility...');
    
    const res = await admin.graphql(allDataQuery);
    const data = await res.json();

    // Process products with status inheritance on images
    const products = data?.data?.products?.edges || [];
    const pageInfo = data?.data?.products?.pageInfo || {};
    console.log(`📊 Fetched ${products.length} products from GraphQL`);

    const productImages = products.flatMap((product) => {
      const productNode = product.node;
      const productId = productNode.id;
      const productStatus = productNode.status;
      const productTitle = productNode.title;
      const productHandle = productNode.handle;
      const publishedAt = productNode.publishedAt;
      
      console.log(`\n🔍 PROCESSING PRODUCT: "${productTitle}"`);
      console.log(`  Original status: "${productStatus}"`);
      console.log(`  Published at: ${publishedAt}`);
      console.log(`  Media count: ${productNode.media?.edges?.length || 0}`);

      return (productNode.media?.edges || []).flatMap((edge) => {
        const mediaNode = edge.node;
        if (!mediaNode.image) {
          console.log(`  ⚠️ Skipping media ${mediaNode.id} - no image`);
          return [];
        }

        const normalizedStatus = productStatus ? productStatus.toLowerCase() : 'active';
        const isPublished = productStatus === 'ACTIVE';

        console.log(`  📸 Image ${mediaNode.id}: inheriting status "${productStatus}" → "${normalizedStatus}", published: ${isPublished}`);

        return [{
          id: mediaNode.id,
          image: mediaNode.image.url,
          altText: mediaNode.alt || "",
          type: "product",

          // Explicit status inheritance
          status: normalizedStatus,
          productStatus: normalizedStatus,
          published_status: normalizedStatus,
          published: isPublished,
          published_at: publishedAt,

          // Metadata
          processedOn: "",
          shopifyImageId: mediaNode.id,
          originalId: mediaNode.id,
          productId: productId,
          productTitle: productTitle,
          productHandle: productHandle,
          imageWidth: mediaNode.image.width,
          imageHeight: mediaNode.image.height,
          imageCreatedAt: mediaNode.createdAt,
          imageUpdatedAt: mediaNode.updatedAt,
          productCreatedAt: productNode.createdAt,
          productUpdatedAt: productNode.updatedAt,

          _statusDebug: {
            originalProductStatus: productStatus,
            normalizedStatus: normalizedStatus,
            isPublished: isPublished,
            inheritanceSource: 'product',
            productId: productId,
            mediaId: mediaNode.id,
          }
        }];
      });
    });

    // ✅ ENHANCED: Process blogs with publishedAt visibility
    const blogs = data?.data?.blogs?.edges || [];
    const blogImages = blogs.flatMap((blog) =>
      blog.node.articles.edges.flatMap((articleEdge) => {
        const article = articleEdge.node;
        const images = [];
        const blogId = blog.node.id.split('/').pop();
        const articleId = article.id.split('/').pop();

        // ✅ NEW: Determine article visibility from publishedAt
        const isVisible = article.publishedAt ? true : false;
        const visibility = isVisible ? "visible" : "hidden";

        console.log(`🔍 PROCESSING ARTICLE: "${article.title}"`);
        console.log(`  Published at: ${article.publishedAt}`);
        console.log(`  Visibility: ${visibility}`);

        // Featured image with visibility
        if (article.image?.url) {
          images.push({
            id: `${article.id}_featured`,
            image: article.image.url,
            altText: article.image.altText || "",
            type: "blog",
            sourceType: "blog",
            processedOn: "",

            // ✅ ADD: Visibility fields
            publishedAt: article.publishedAt,
            visibility: visibility,

            blogId: blogId,
            articleId: articleId,
            blogTitle: blog.node.title,
            articleTitle: article.title,
            imageType: "featured",
            isFeaturedImage: true,
            shopifyImageId: `${article.id}_featured`,
            originalId: `${article.id}_featured`,
            featuredImageData: {
              originalAlt: article.image.altText || "",
              isArticleFeaturedImage: true
            }
          });
        }

        // Inline images with visibility
        if (article.body) {
          const $ = cheerio.load(article.body);
          $("img").each((i, el) => {
            const src = $(el).attr("src");
            const alt = $(el).attr("alt") || "";
            if (src) {
              images.push({
                id: `${article.id}_html_${i}`,
                image: src,
                altText: alt,
                type: "blog",
                sourceType: "blog",
                processedOn: "",

                // ✅ ADD: Visibility fields (inherited from article)
                publishedAt: article.publishedAt,
                visibility: visibility,

                blogId: blogId,
                articleId: articleId,
                blogTitle: blog.node.title,
                articleTitle: article.title,
                imageType: "inline",
                isFeaturedImage: false,
                shopifyImageId: `${article.id}_html_${i}`,
                originalId: `${article.id}_html_${i}`,
                imageIndex: i,
                fullImgTag: $.html(el),
                inlineImageData: {
                  htmlIndex: i,
                  isInlineImage: true,
                  originalHtmlTag: $.html(el)
                }
              });
            }
          });
        }

        return images;
      })
    );

    // ✅ ENHANCED: Process pages with publishedAt visibility
    const pages = data?.data?.pages?.edges || [];
    const pageImages = pages.flatMap((page) => {
      if (!page.node.body) return [];

      // ✅ NEW: Determine page visibility from publishedAt
      const isVisible = page.node.publishedAt ? true : false;
      const visibility = isVisible ? "visible" : "hidden";

      console.log(`🔍 PROCESSING PAGE: "${page.node.title}"`);
      console.log(`  Published at: ${page.node.publishedAt}`);
      console.log(`  Visibility: ${visibility}`);

      const matches = [...page.node.body.matchAll(/<img[^>]*src=\"([^\"]+)\"[^>]*>/g)];
      return matches.map((match, index) => {
        const altMatch = match[0].match(/alt=\"([^\"]*)\"/);
        const altText = altMatch ? altMatch[1] : "";
        return {
          id: `${page.node.id}_img_${index}`,
          image: match[1],
          altText,
          type: "page",
          sourceType: "page",
          processedOn: "",

          // ✅ ADD: Visibility fields
          publishedAt: page.node.publishedAt,
          visibility: visibility,

          pageTitle: page.node.title,
          pageId: page.node.id.split('/').pop(),
        };
      });
    });

    // Combine and sort all images
    const allImages = [...productImages, ...blogImages, ...pageImages];
    allImages.sort((a, b) => {
      const getDate = (img) => new Date(img.createdAt || img.created_at || img.updatedAt || img.updated_at || Date.now());
      return getDate(b) - getDate(a);
    });

    console.log('📊 Single request results:', {
      totalProducts: products.length,
      totalBlogs: blogs.length,
      totalPages: pages.length,
      productImages: productImages.length,
      blogImages: blogImages.length,
      pageImages: pageImages.length,
      totalImages: allImages.length
    });

    // ✅ ENHANCED: Comprehensive status breakdown for all content types
    const statusBreakdown = {
      // Product statuses
      active: productImages.filter(img => img.status === 'active').length,
      draft: productImages.filter(img => img.status === 'draft').length,
      archived: productImages.filter(img => img.status === 'archived').length,
      
      // Blog/Page visibility
      visible: [...blogImages, ...pageImages].filter(img => img.visibility === 'visible').length,
      hidden: [...blogImages, ...pageImages].filter(img => img.visibility === 'hidden').length,
      
      total: allImages.length
    };

    console.log('🔍 Status breakdown:', statusBreakdown);

    return json({
      images: allImages,
      pageInfo: {
        hasNextPage: pageInfo.hasNextPage,
        endCursor: pageInfo.endCursor
      },
      summary: {
        totalImages: allImages.length,
        productImages: productImages.length,
        blogImages: blogImages.length,
        pageImages: pageImages.length,
        featuredBlogImages: blogImages.filter(img => img.imageType === "featured").length,
        inlineBlogImages: blogImages.filter(img => img.imageType === "inline").length,
        
        // ✅ ADD: Visibility summary
        visibleBlogImages: blogImages.filter(img => img.visibility === "visible").length,
        hiddenBlogImages: blogImages.filter(img => img.visibility === "hidden").length,
        visiblePageImages: pageImages.filter(img => img.visibility === "visible").length,
        hiddenPageImages: pageImages.filter(img => img.visibility === "hidden").length,
        
        totalProducts: products.length,
        totalBlogs: blogs.length,
        totalPages: pages.length
      },
      statusBreakdown,
      _debug: {
        productCount: products.length,
        timestamp: new Date().toISOString(),
        statusBreakdown,
        uniqueStatuses: [...new Set(productImages.map(img => img.status))],
        inheritanceWorking: [...new Set(productImages.map(img => img.status))].length > 1 ? 'YES' : 'CHECK_PRODUCTS',
        visibilityBreakdown: {
          blogVisible: blogImages.filter(img => img.visibility === "visible").length,
          blogHidden: blogImages.filter(img => img.visibility === "hidden").length,
          pageVisible: pageImages.filter(img => img.visibility === "visible").length,
          pageHidden: pageImages.filter(img => img.visibility === "hidden").length,
        }
      }
    });

  } catch (error) {
    console.error('❌ Error in combined API loader:', error);
    return json({
      error: 'Internal server error',
      details: error.message,
      images: [],
      pageInfo: { hasNextPage: false, endCursor: null },
      statusBreakdown: { active: 0, draft: 0, archived: 0, visible: 0, hidden: 0, total: 0 }
    }, { status: 500 });
  }
};
