// app/routes/api.user-email.jsx
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function action({ request }) {
  try {
    // Authenticate with Shopify
    const { admin } = await authenticate.admin(request);
    
    // Get shop information
    const response = await admin.rest.resources.Shop.all({
      session: admin.session,
    });
    
    const shop = response.data[0];
    const userEmail = shop.email || shop.customer_email;
    
    return json({ 
      email: userEmail,
      success: true 
    });
    
  } catch (error) {
    console.error('Error fetching user email:', error);
    return json({ 
      error: 'Failed to fetch user email',
      success: false 
    }, { status: 500 });
  }
}

export async function loader() {
  return new Response(null, { status: 405 });
}
