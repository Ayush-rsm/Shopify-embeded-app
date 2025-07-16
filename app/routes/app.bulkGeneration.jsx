import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import AltTextDashboard from "../componenets/AltTextDashboard";

// Loader to fetch Shopify product images
export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const query = `
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

  const response = await admin.graphql(query, {
    variables: { first: 10 },
  });

  const jsonResponse = await response.json();
  const products = jsonResponse?.data?.products?.edges || [];

  // Flatten and normalize image data for the dashboard
  const images = products.flatMap((product) =>
    product.node.images.edges.map((imgEdge) => ({
      id: imgEdge.node.id.split("/").pop(), // get just the numeric ID
      image: imgEdge.node.originalSrc,
      type: 'product',
      altText: imgEdge.node.altText || '',
      processedOn: '', // Optional: You can enhance this with metafields
    }))
  );

  return json({ images });
};

// Default export: pass fetched images to AltTextDashboard
export default function ImagesRoute() {
  const { images } = useLoaderData();
  return <AltTextDashboard initialImages={images} />;
}
