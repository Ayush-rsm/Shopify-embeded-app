import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import * as cheerio from "cheerio";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const url = new URL(request.url);
  const first = parseInt(url.searchParams.get("first") || "5");
  const after = url.searchParams.get("after");

  const blogQuery = `
    query GetBlogArticleImages($first: Int!, $after: String) {
      blogs(first: $first, after: $after) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id 
            title
            articles(first: 10) {
              edges {
                node {
                  id 
                  title
                  image { altText url }
                  body
                  publishedAt    # Added for visibility
                }
              }
            }
          }
        }
      }
    }
  `;

  const res = await admin.graphql(blogQuery, {
    variables: { first, after },
  });

  const data = await res.json();
  const blogs = data?.data?.blogs?.edges || [];

  const blogImages = blogs.flatMap((blog) =>
    blog.node.articles.edges.flatMap((articleEdge) => {
      const article = articleEdge.node;
      const images = [];

      // Extract numeric IDs for REST API compatibility
      const blogId = blog.node.id.split('/').pop();
      const articleId = article.id.split('/').pop();
      
      // Determine visibility from publishedAt
      const isVisible = article.publishedAt ? true : false;
      const visibility = isVisible ? "visible" : "hidden";

      console.log('Processing article:', {
        blogId,
        articleId,
        blogTitle: blog.node.title,
        articleTitle: article.title,
        publishedAt: article.publishedAt,
        visibility: visibility,
        hasFeaturedImage: !!article.image?.url
      });

      // ✅ Featured image - PROPERLY MARKED
      if (article.image?.url) {
        images.push({
          id: `${article.id}_featured`,
          image: article.image.url,
          altText: article.image.altText || "",
          type: "blog",
          processedOn: "",
          // ✅ Visibility fields
          publishedAt: article.publishedAt,
          visibility: visibility,
          // ✅ Critical fields for proper detection
          blogId: blogId,
          articleId: articleId,
          blogTitle: blog.node.title,
          articleTitle: article.title,
          imageType: "featured", // ✅ Explicitly set as featured
          isFeaturedImage: true,  // ✅ Additional flag for certainty
          shopifyImageId: `${article.id}_featured`,
          originalId: `${article.id}_featured`,
          // ✅ Additional metadata
          featuredImageData: {
            originalAlt: article.image.altText || "",
            isArticleFeaturedImage: true
          }
        });
        
        console.log('✅ Added featured image:', {
          id: `${article.id}_featured`,
          url: article.image.url,
          visibility: visibility,
          currentAlt: article.image.altText || ""
        });
      }

      // ✅ Inline images from body HTML - PROPERLY MARKED
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
              processedOn: "",
              // ✅ Visibility fields (inherited from article)
              publishedAt: article.publishedAt,
              visibility: visibility,
              // ✅ Critical fields for proper detection
              blogId: blogId,
              articleId: articleId,
              blogTitle: blog.node.title,
              articleTitle: article.title,
              imageType: "inline", // ✅ Explicitly set as inline
              isFeaturedImage: false, // ✅ Explicitly NOT featured
              shopifyImageId: `${article.id}_html_${i}`,
              originalId: `${article.id}_html_${i}`,
              // ✅ Additional metadata
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
        
        console.log('✅ Added inline images:', $("img").length, 'with visibility:', visibility);
      }

      return images;
    })
  );

  console.log(`📊 Blog images summary:`, {
    totalImages: blogImages.length,
    featuredImages: blogImages.filter(img => img.imageType === "featured").length,
    inlineImages: blogImages.filter(img => img.imageType === "inline").length,
    visibleImages: blogImages.filter(img => img.visibility === "visible").length,
    hiddenImages: blogImages.filter(img => img.visibility === "hidden").length,
    totalBlogs: blogs.length
  });

  const pageInfo = data?.data?.blogs?.pageInfo || {
    hasNextPage: false,
    endCursor: null,
  };

  return json({
    images: blogImages,
    pageInfo,
    summary: {
      totalImages: blogImages.length,
      totalBlogs: blogs.length,
      featuredImages: blogImages.filter(img => img.imageType === "featured").length,
      inlineImages: blogImages.filter(img => img.imageType === "inline").length,
      visibleImages: blogImages.filter(img => img.visibility === "visible").length,
      hiddenImages: blogImages.filter(img => img.visibility === "hidden").length,
      imageBreakdown: blogImages.map(img => ({
        id: img.id,
        type: img.imageType,
        isFeatured: img.isFeaturedImage,
        visibility: img.visibility,
        url: img.image.substring(0, 50) + '...'
      }))
    }
  });
};
