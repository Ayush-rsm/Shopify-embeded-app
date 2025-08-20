import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const url = new URL(request.url);
  const first = parseInt(url.searchParams.get("first") || "20");
  const after = url.searchParams.get("after");

  const pageQuery = `
    query GetPages($first: Int!, $after: String) {
      pages(first: $first, after: $after) {
        pageInfo { hasNextPage endCursor }
        edges {
          node { id title body }
        }
      }
    }
  `;

  const res = await admin.graphql(pageQuery, {
    variables: { first, after },
  });

  const data = await res.json();
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
        processedOn: "",
      };
    });
  });

  const pageInfo = data?.data?.pages?.pageInfo || {
    hasNextPage: false,
    endCursor: null,
  };

  return json({
    images: pageImages,
    pageInfo,
  });
};
