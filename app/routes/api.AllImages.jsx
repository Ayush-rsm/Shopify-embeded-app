import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import * as cheerio from "cheerio";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  try {
    // Single GraphQL query to fetch all data at once
    const allDataQuery = `
      query GetAllStoreImages {
        products(first: 250) {
          edges {
            node {
              id
              title
              media(first: 20) {
                edges {
                  node {
                    ... on MediaImage {
                      id
                      alt
                      image {
                        url
                      }
                    }
                  }
                }
              }
            }
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
            }
          }
        }
      }
    `;

    console.log('🚀 Fetching ALL images in single request...');
    
    // Single GraphQL request
    const res = await admin.graphql(allDataQuery);
    const data = await res.json();

    // Process products
    const products = data?.data?.products?.edges || [];
    const productImages = products.flatMap((product) => {
      const productId = product.node.id;

      return (product.node.media?.edges || []).flatMap((edge) => {
        const node = edge.node;
        if (!node.image) return [];

        return [{
          id: node.id,
          image: node.image.url,
          altText: node.alt || "",
          type: "product",
          sourceType: "product",
          processedOn: "",
          shopifyImageId: node.id,
          productId: productId,
          productTitle: product.node.title,
        }];
      });
    });

    // Process blogs
    const blogs = data?.data?.blogs?.edges || [];
    const blogImages = blogs.flatMap((blog) =>
      blog.node.articles.edges.flatMap((articleEdge) => {
        const article = articleEdge.node;
        const images = [];
        const blogId = blog.node.id.split('/').pop();
        const articleId = article.id.split('/').pop();

        // Featured image
        if (article.image?.url) {
          images.push({
            id: `${article.id}_featured`,
            image: article.image.url,
            altText: article.image.altText || "",
            type: "blog",
            sourceType: "blog",
            processedOn: "",
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

        // Inline images from body HTML
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

    // Process pages
    const pages = data?.data?.pages?.edges || [];
    const pageImages = pages.flatMap((page) => {
      if (!page.node.body) return [];
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
          pageTitle: page.node.title,
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

    const response = {
      images: allImages,
      pageInfo: {
        hasNextPage: false,
        endCursor: null
      },
      summary: {
        totalImages: allImages.length,
        productImages: productImages.length,
        blogImages: blogImages.length,
        pageImages: pageImages.length,
        featuredBlogImages: blogImages.filter(img => img.imageType === "featured").length,
        inlineBlogImages: blogImages.filter(img => img.imageType === "inline").length,
        totalProducts: products.length,
        totalBlogs: blogs.length,
        totalPages: pages.length
      }
    };

    console.log('✅ Single request completed - Total images:', allImages.length);

    return json(response);

  } catch (error) {
    console.error('❌ Error in single request /api/allImages:', error);
    
    // If single request fails due to query cost, provide helpful error
    if (error.message?.includes('cost') || error.message?.includes('limit')) {
      return json({ 
        error: 'Query too large for single request. Consider reducing limits or using pagination.',
        details: error.message,
        suggestion: 'Reduce first: values or use the multi-request approach',
        images: [],
        pageInfo: { hasNextPage: false, endCursor: null }
      }, { status: 500 });
    }

    return json({ 
      error: 'Failed to fetch images',
      details: error.message,
      images: [],
      pageInfo: { hasNextPage: false, endCursor: null }
    }, { status: 500 });
  }
};
