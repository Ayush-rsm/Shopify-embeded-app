// import { useLoaderData } from "@remix-run/react";
// import { json } from "@remix-run/node";
// import { authenticate } from "../shopify.server";
// import AltTextDashboard from "../componenets/AltTextDashboard";

// export const loader = async ({ request }) => {
//   const { admin, session } = await authenticate.admin(request);

//   console.log("✅ Granted scopes:", session.scope);

//   const productQuery = `
//     query GetProductImages($first: Int!) {
//       products(first: $first) {
//         edges {
//           node {
//             id
//             title
//             images(first: 10) {
//               edges {
//                 node {
//                   id
//                   altText
//                   originalSrc
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//   `;

//   // Updated blog query to fetch both featured images AND summary
//   const blogQuery = `
//     query GetBlogArticleImages($first: Int!) {
//       blogs(first: $first) {
//         edges {
//           node {
//             id
//             title
//             articles(first: 10) {
//               edges {
//                 node {
//                   id
//                   title
//                   image {
//                     altText
//                     url
//                   }
//                   summary
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//   `;

//   const pageQuery = `
//     query GetPages($first: Int!) {
//       pages(first: $first) {
//         edges {
//           node {
//             id
//             title
//             body
//           }
//         }
//       }
//     }
//   `;

//   const [productRes, blogRes, pageRes] = await Promise.all([
//     admin.graphql(productQuery, { variables: { first: 50 } }),
//     admin.graphql(blogQuery, { variables: { first: 20 } }),
//     admin.graphql(pageQuery, { variables: { first: 20 } }),
//   ]);

//   const productData = await productRes.json();
//   const blogData = await blogRes.json();
//   const pageData = await pageRes.json();

//   // Extract product images (from actual image objects)
//   const productImages =
//     productData?.data?.products?.edges.flatMap((product) =>
//       product.node.images.edges.map((img) => ({
//         id: img.node.id,
//         image: img.node.originalSrc,
//         altText: img.node.altText || "",
//         type: "product",
//         processedOn: "",
//       }))
//     ) || [];

//   // Extract blog images (featured images only - Admin API limitation)
//   const blogImages = blogData?.data?.blogs?.edges.flatMap((blog) =>
//     blog.node.articles.edges.flatMap((article) => {
//       const images = [];
      
//       // Featured image (if exists)
//       if (article.node.image) {
//         images.push({
//           id: `${article.node.id}_featured`,
//           image: article.node.image.url,
//           altText: article.node.image.altText || "",
//           type: "blog",
//           subType: "featured",
//           processedOn: "",
//         });
//       }
      
//       // Note: Article content HTML is not available in Admin API
//       // Only summary and excerpt fields are available
      
//       return images;
//     })
//   ) || [];

//   // Extract page images (from HTML body content)
//   const pageImages = pageData?.data?.pages?.edges.flatMap((page) => {
//     if (!page.node.body) return [];
    
//     const matches = [...page.node.body.matchAll(/<img[^>]*src="([^"]+)"[^>]*>/g)];
//     return matches.map((match, index) => {
//       const altMatch = match[0].match(/alt="([^"]*)"/);
//       const altText = altMatch ? altMatch[1] : "";
      
//       return {
//         id: `${page.node.id}_img_${index}`,
//         image: match[1],
//         altText: altText,
//         type: "page",
//         processedOn: "",
//       };
//     });
//   }) || [];

//   const images = [...productImages, ...blogImages, ...pageImages];

//   console.log(`📊 Total images found: ${images.length}`);
//   console.log(`🛍️  Product images: ${productImages.length}`);
//   console.log(`📝 Blog images: ${blogImages.length}`);
//   console.log(`📄 Page images: ${pageImages.length}`);

//   return json({ images });
// };

// export default function ImagesRoute() {
//   const { images } = useLoaderData();
//   return <AltTextDashboard initialImages={images} />;
// }



// With graphql

// import { useLoaderData } from "@remix-run/react";
// import { json } from "@remix-run/node";
// import { authenticate } from "../shopify.server";
// import AltTextDashboard from "../componenets/AltTextDashboard";

// export const loader = async ({ request }) => {
//   const { admin, session } = await authenticate.admin(request);

//   console.log("✅ Granted scopes:", session.scope);

//   // 🛍️ Product image query
//   const productQuery = `
//     query GetProductImages($first: Int!) {
//       products(first: $first) {
//         edges {
//           node {
//             id
//             title
//             images(first: 10) {
//               edges {
//                 node {
//                   id
//                   altText
//                   originalSrc
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//   `;

//   // 📄 Page query (for embedded image tags inside body)
//   const pageQuery = `
//     query GetPages($first: Int!) {
//       pages(first: $first) {
//         edges {
//           node {
//             id
//             title
//             body
//           }
//         }
//       }
//     }
//   `;

//   // 📝 Blog article query (GraphQL-only)
//   const blogQuery = `
//     query GetBlogsWithArticles($blogLimit: Int!, $articleLimit: Int!) {
//       blogs(first: $blogLimit) {
//         edges {
//           node {
//             id
//             title
//             articles(first: $articleLimit) {
//               edges {
//                 node {
//                   id
//                   title
//                   image {
//                     originalSrc
//                     altText
//                   }
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//   `;

//   // Perform all three GraphQL queries in parallel
//   const [productRes, pageRes, blogRes] = await Promise.all([
//     admin.graphql(productQuery, { variables: { first: 50 } }),
//     admin.graphql(pageQuery, { variables: { first: 20 } }),
//     admin.graphql(blogQuery, { variables: { blogLimit: 10, articleLimit: 10 } }),
//   ]);

//   const productData = await productRes.json();
//   const pageData = await pageRes.json();
//   const blogData = await blogRes.json();

//   // 🛍️ Extract product images
//   const productImages = productData?.data?.products?.edges.flatMap((product) =>
//     product.node.images.edges.map((img) => ({
//       id: img.node.id,
//       image: img.node.originalSrc,
//       altText: img.node.altText || "",
//       type: "product",
//       processedOn: "",
//     }))
//   ) || [];

//   // 📝 Extract featured images from blog articles
//   const blogImages = blogData?.data?.blogs?.edges.flatMap((blog) =>
//     blog.node.articles.edges
//       .filter((article) => article.node.image)
//       .map((article) => ({
//         id: `${article.node.id}_featured`,
//         image: article.node.image.originalSrc,
//         altText: article.node.image.altText || "",
//         type: "blog",
//         subType: "featured",
//         processedOn: "",
//       }))
//   ) || [];

//   // 📄 Extract images from page body (HTML parsing)
//   const pageImages = pageData?.data?.pages?.edges.flatMap((page) => {
//     if (!page.node.body) return [];

//     const matches = [...page.node.body.matchAll(/<img[^>]*src="([^"]+)"[^>]*>/g)];
//     return matches.map((match, index) => {
//       const altMatch = match[0].match(/alt="([^"]*)"/);
//       const altText = altMatch ? altMatch[1] : "";

//       return {
//         id: `${page.node.id}_img_${index}`,
//         image: match[1],
//         altText: altText,
//         type: "page",
//         processedOn: "",
//       };
//     });
//   }) || [];

//   const images = [...productImages, ...blogImages, ...pageImages];

//   console.log(`📊 Total images found: ${images.length}`);
//   console.log(`🛍️  Product images: ${productImages.length}`);
//   console.log(`📝 Blog images: ${blogImages.length}`);
//   console.log(`📄 Page images: ${pageImages.length}`);

//   return json({ images });
// };

// export default function ImagesRoute() {
//   const { images } = useLoaderData();
//   return <AltTextDashboard initialImages={images} />;
// }


// withotb graphql

// import { useLoaderData } from "@remix-run/react";
// import { json } from "@remix-run/node";
// import { authenticate } from "../shopify.server";
// import AltTextDashboard from "../componenets/AltTextDashboard";

// export const loader = async ({ request }) => {
//   const { admin, session } = await authenticate.admin(request);

//   console.log("✅ Granted scopes:", session.scope);

//   const productQuery = `
//     query GetProductImages($first: Int!) {
//       products(first: $first) {
//         edges {
//           node {
//             id
//             title
//             images(first: 10) {
//               edges {
//                 node {
//                   id
//                   altText
//                   originalSrc
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//   `;

//   const pageQuery = `
//     query GetPages($first: Int!) {
//       pages(first: $first) {
//         edges {
//           node {
//             id
//             title
//             body
//           }
//         }
//       }
//     }
//   `;

  
//   const getBlogImagesViaREST = async () => {
//     const blogImages = [];
    
//     try {
//       // Get blogs via REST API (has access to body_html)
//       const blogsResponse = await fetch(`https://${session.shop}/admin/api/2023-10/blogs.json?limit=20`, {
//         headers: {
//           'X-Shopify-Access-Token': session.accessToken,
//         },
//       });
      
//       if (!blogsResponse.ok) {
//         console.error('Failed to fetch blogs via REST');
//         return [];
//       }
      
//       const blogsData = await blogsResponse.json();
      
//       // For each blog, get its articles
//       for (const blog of blogsData.blogs) {
//         const articlesResponse = await fetch(`https://${session.shop}/admin/api/2023-10/blogs/${blog.id}/articles.json?limit=10`, {
//           headers: {
//             'X-Shopify-Access-Token': session.accessToken,
//           },
//         });
        
//         if (!articlesResponse.ok) continue;
        
//         const articlesData = await articlesResponse.json();
        
//         // Process each article
//         for (const article of articlesData.articles) {
//           // Featured image
//           if (article.image) {
//             blogImages.push({
//               id: `${article.id}_featured`,
//               image: article.image.src,
//               altText: article.image.alt || "",
//               type: "blog",
//               subType: "featured",
//               processedOn: "",
//             });
//           }
          
//           // Images from body_html content
//           if (article.body_html) {
//             const matches = [...article.body_html.matchAll(/<img[^>]*src="([^"]+)"[^>]*>/g)];
//             const contentImages = matches.map((match, index) => {
//               const altMatch = match[0].match(/alt="([^"]*)"/);
//               const altText = altMatch ? altMatch[1] : "";
              
//               return {
//                 id: `${article.id}_content_${index}`,
//                 image: match[1],
//                 altText: altText,
//                 type: "blog",
//                 subType: "content",
//                 processedOn: "",
//               };
//             });
//             blogImages.push(...contentImages);
//           }
//         }
//       }
//     } catch (error) {
//       console.error('Error fetching blog content via REST:', error);
//     }
    
//     return blogImages;
//   };

//   const [productRes, pageRes, blogImages] = await Promise.all([
//     admin.graphql(productQuery, { variables: { first: 50 } }),
//     admin.graphql(pageQuery, { variables: { first: 20 } }),
//     getBlogImagesViaREST(),
//   ]);

//   const productData = await productRes.json();
//   const pageData = await pageRes.json();


  
//   const productImages =
//     productData?.data?.products?.edges.flatMap((product) =>
//       product.node.images.edges.map((img) => ({
//         id: img.node.id,
//         image: img.node.originalSrc,
//         altText: img.node.altText || "",
//         type: "product",
//         processedOn: "",
//       }))
//     ) || [];

 


//   const pageImages = pageData?.data?.pages?.edges.flatMap((page) => {
//     if (!page.node.body) return [];
    
//     const matches = [...page.node.body.matchAll(/<img[^>]*src="([^"]+)"[^>]*>/g)];
//     return matches.map((match, index) => {
//       const altMatch = match[0].match(/alt="([^"]*)"/);
//       const altText = altMatch ? altMatch[1] : "";
      
//       return {
//         id: `${page.node.id}_img_${index}`,
//         image: match[1],
//         altText: altText,
//         type: "page",
//         processedOn: "",
//       };
//     });
//   }) || [];

//   const images = [...productImages, ...blogImages, ...pageImages];

//   console.log(`📊 Total images found: ${images.length}`);
//   console.log(`🛍️  Product images: ${productImages.length}`);
//   console.log(`📝 Blog images: ${blogImages.length}`);
//   console.log(`📄 Page images: ${pageImages.length}`);

//   return json({ images });
// };

// export default function ImagesRoute() {
//   const { images } = useLoaderData();
//   return <AltTextDashboard initialImages={images} />;
// }



import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import AltTextDashboard from "../componenets/AltTextDashboard";
import * as cheerio from "cheerio";

const STOREFRONT_ACCESS_TOKEN = "b6fdecd84f655bd7552ca3e60c59e9b1";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  console.log("✅ Granted scopes:", session.scope);

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop || !STOREFRONT_ACCESS_TOKEN) {
    throw new Error("Missing shop domain or Storefront token");
  }

  // GraphQL queries
  const productQuery = `
    query GetProductImages($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            images(first: 10) {
              edges {
                node {
                  id
                  altText
                  originalSrc
                }
              }
            }
          }
        }
      }
    }
  `;

  const pageQuery = `
    query GetPages($first: Int!) {
      pages(first: $first) {
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

  const storefrontQuery = `
    query GetArticles($first: Int!) {
      blogs(first: 5) {
        edges {
          node {
            id
            handle
            articles(first: $first) {
              edges {
                node {
                  id
                  title
                  contentHtml
                  image {
                    originalSrc
                    altText
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  // Run all queries
  const [productRes, pageRes, storefrontRes] = await Promise.all([
    admin.graphql(productQuery, { variables: { first: 50 } }),
    admin.graphql(pageQuery, { variables: { first: 20 } }),
    fetch(`https://${shop}/api/2023-10/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": STOREFRONT_ACCESS_TOKEN,
      },
      body: JSON.stringify({
        query: storefrontQuery,
        variables: { first: 10 },
      }),
    }),
  ]);

  // Parse responses
  const productData = await productRes.json();
  const pageData = await pageRes.json();
  const blogData = await storefrontRes.json();

  // Extract product images
  const productImages =
    productData?.data?.products?.edges.flatMap((product) =>
      product.node.images.edges.map((img) => ({
        id: img.node.id,
        image: img.node.originalSrc,
        altText: img.node.altText || "",
        type: "product",
        processedOn: "",
      }))
    ) || [];

  // Extract page images from HTML
  const pageImages =
    pageData?.data?.pages?.edges.flatMap((page) => {
      if (!page.node.body) return [];

      const matches = [...page.node.body.matchAll(/<img[^>]*src="([^"]+)"[^>]*>/g)];
      return matches.map((match, index) => {
        const altMatch = match[0].match(/alt="([^"]*)"/);
        const altText = altMatch ? altMatch[1] : "";
        return {
          id: `${page.node.id}_img_${index}`,
          image: match[1],
          altText,
          type: "page",
          processedOn: "",
        };
      });
    }) || [];

  // Extract blog images (featured + embedded)
  const blogImages = [];
const articles = blogData?.data?.blogs?.edges?.flatMap(blog =>
  blog?.node?.articles?.edges ?? []
) ?? [];

for (const articleEdge of articles) {
  const article = articleEdge?.node;
  if (!article) continue;

  // Featured image
  if (article.image?.originalSrc) {
    blogImages.push({
      id: `${article.id}_featured`,
      image: article.image.originalSrc,
      altText: article.image.altText || "",
      type: "blog",
      subType: "featured",
      processedOn: "",
    });
  }

  // Embedded images from contentHtml
  const $ = cheerio.load(article.contentHtml || "");
  $("img").each((i, img) => {
    const src = $(img).attr("src");
    const alt = $(img).attr("alt") || "";
    if (src) {
      blogImages.push({
        id: `${article.id}_content_${i}`,
        image: src,
        altText: alt,
        type: "blog",
        subType: "content",
        processedOn: "",
      });
    }
  });
}

  // const images = [...productImages, ...blogImages, ...pageImages];
  const images = [ ...blogImages, ...pageImages];

  console.log(`📊 Total images found: ${images.length}`);
  console.log(`🛍️ Product images: ${productImages.length}`);
  console.log(`📝 Blog images: ${blogImages.length}`);
  console.log(`📄 Page images: ${pageImages.length}`);

  return json({ images });
};

export default function ImagesRoute() {
  const { images } = useLoaderData();
  return <AltTextDashboard initialImages={images} />;
}
