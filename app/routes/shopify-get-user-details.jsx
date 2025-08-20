import { json } from "@remix-run/node";

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ message: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();

    // Forward the request to your Heroku API
    const response = await fetch('https://alt-magic-api-eabaa2c8506a.herokuapp.com/shopify-get-user-details', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    // Add verified field for frontend compatibility
    if (response.ok) {
      data.verified = true;
    } else {
      data.verified = false;
    }

    return json(data, { status: response.status });

  } catch (error) {
    console.error("Error calling Heroku API:", error);
    return json(
      { message: "Internal server error", verified: false },
      { status: 500 }
    );
  }
};

export default function ShopifyGetUserDetails() {
  return null;
}
