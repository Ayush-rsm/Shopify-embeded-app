import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const productQuery = `
    query GetAllProductMedia {
      products(first: 250) {
        edges {
          node {
            id
            title
            media(first: 50) {
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
    }
  `;

  const res = await admin.graphql(productQuery);
  const data = await res.json();

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
        processedOn: "",
        shopifyImageId: node.id,
        productId: productId,
      }];
    });
  });

  return json({
    images: productImages,
  });
};
