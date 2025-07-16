// // app/routes/api/product-images.jsx
// import { json } from '@remix-run/node';
// import { shopifyApi } from '../../shopify.server'; // Update path based on your project

// export const loader = async ({ request }) => {
//   const { admin } = await shopifyApi.authenticate.admin(request);

//   const query = `
//     query {
//       products(first: 20) {
//         edges {
//           node {
//             id
//             title
//             images(first: 5) {
//               edges {
//                 node {
//                   id
//                   url
//                   altText
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//   `;

//   const response = await admin.graphql(query);
//   const result = await response.json();

//   const productImages = result.data.products.edges.flatMap((product) =>
//     product.node.images.edges.map((image) => ({
//       productId: product.node.id,
//       productTitle: product.node.title,
//       imageId: image.node.id,
//       imageUrl: image.node.url,
//       altText: image.node.altText,
//     }))
//   );

//   return json({ images: productImages });
// };
