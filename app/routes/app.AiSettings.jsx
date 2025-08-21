// app/routes/app.ai-settings.jsx
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Button,
  Avatar,
  Text,
  Banner,
  Badge,
  Divider,
  BlockStack,
  InlineStack,
  Spinner
} from "@shopify/polaris";
import { useState, useEffect } from "react";
import { authenticate } from "../shopify.server";
import apiService from "../utils/api";

// Loader function to fetch user details using dynamic session data
export const loader = async ({ request }) => {
  try {
    const { session, admin } = await authenticate.admin(request);
    
    // Get store URL from session
    const storeUrl = session.shop;
    const fullStoreUrl = `https://${storeUrl}`;
    
    // Initialize user variables
    let userEmail = null;
    let userId = null;
    let userName = null;
    
    // Check if we have online session with user info
    if (session.onlineAccessInfo?.associated_user) {
      const user = session.onlineAccessInfo.associated_user;
      userEmail = user.email;
      userId = user.id;
      userName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      
      console.log('User ID:', userId);
      console.log('User Email:', userEmail);
      console.log('Store URL:', fullStoreUrl);
    } else {
      // Fallback: use shop domain as identifier if no user info available
      userEmail = storeUrl;
      console.log('No user info available, using store URL:', fullStoreUrl);
    }
    
    // Call your API service with dynamic data
    const result = await apiService.getUserDetails(
      userEmail,
      fullStoreUrl
    );

    if (result.success) {
      return json({ 
        userDetails: result.data, 
        success: true,
        sessionInfo: {
          storeUrl: fullStoreUrl,
          shopDomain: storeUrl,
          userEmail,
          userId,
          userName
        }
      });
    } else {
      return json({ 
        userDetails: null, 
        success: false, 
        error: result.error,
        sessionInfo: {
          storeUrl: fullStoreUrl,
          shopDomain: storeUrl,
          userEmail,
          userId,
          userName
        }
      });
    }
  } catch (error) {
    console.error('Loader error:', error);
    return json({ 
      success: false, 
      error: 'Failed to load user details',
      sessionInfo: null
    });
  }
};

// Updated Action function with consistent user identifier logic
export const action = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    
    // Use the SAME identifier logic as the loader
    let userIdentifier = null;
    if (session.onlineAccessInfo?.associated_user) {
      // Use EMAIL instead of numeric ID (same as loader)
      userIdentifier = session.onlineAccessInfo.associated_user.email;
      console.log('Using user email:', userIdentifier);
    } else {
      // Fallback to shop domain (same as loader)
      userIdentifier = session.shop;
      console.log('Using fallback shop domain:', userIdentifier);
    }
    
    console.log('Session info available:', {
      hasOnlineInfo: !!session.onlineAccessInfo,
      hasUser: !!session.onlineAccessInfo?.associated_user,
      shop: session.shop,
      userIdentifier: userIdentifier
    });
    
    const settings = {
      language: formData.get("language"),
      alt_prefix: formData.get("alt_prefix"),
      alt_suffix: formData.get("alt_suffix"),
      alt_gen_type: formData.get("alt_gen_type"),
      chatgpt_prompt_layer: formData.get("chatgpt_prompt_layer")
    };

    console.log('Form data received:', settings);
    console.log('Using user identifier for update:', userIdentifier);

    const result = await apiService.updateUserDetails(userIdentifier, settings);

    if (result.success) {
      return json({ 
        success: true, 
        message: result.data.message || 'Settings updated successfully!',
        updatedFields: result.data.updatedFields || []
      });
    } else {
      return json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Action error:', error);
    return json({ success: false, error: 'Failed to update settings: ' + error.message });
  }
};

export default function AISettings() {
  const { userDetails, success, error, sessionInfo } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  
  const [formData, setFormData] = useState({
    alt_gen_type: 'default',
    alt_prefix: '',
    alt_suffix: '',
    chatgpt_prompt_layer: '',
    language: 'en',
  });

  // Initialize form data when user details load
  useEffect(() => {
    if (userDetails) {
      setFormData({
        alt_gen_type: userDetails.ai_gen_settings?.alt_gen_type || 'default',
        alt_prefix: userDetails.ai_gen_settings?.alt_prefix || '',
        alt_suffix: userDetails.ai_gen_settings?.alt_suffix || '',
        chatgpt_prompt_layer: userDetails.ai_gen_settings?.chatgpt_prompt_layer || '',
        language: userDetails.language || 'en',
      });
    }
  }, [userDetails]);

  // Debug: Log session info
  useEffect(() => {
    if (sessionInfo) {
      console.log('Session Info:', sessionInfo);
    }
  }, [sessionInfo]);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const altGenTypeOptions = [
    { label: 'Default', value: 'default' },
    { label: 'Descriptive', value: 'descriptive' },
    { label: 'Concise', value: 'concise' },
  ];

  const languageOptions = [
    { label: 'English', value: 'en' },
    { label: 'Korean', value: 'ko' },
    { label: 'Spanish', value: 'es' },
    { label: 'French', value: 'fr' },
    { label: 'German', value: 'de' },
    { label: 'Japanese', value: 'ja' },
    { label: 'Chinese', value: 'zh' },
  ];

  const parseSurveyFeedback = (surveyFeedback) => {
    try {
      return JSON.parse(surveyFeedback);
    } catch {
      return null;
    }
  };

  if (!success || !userDetails) {
    return (
      <Page title="AI Settings">
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                {error ? (
                  <Banner status="critical">
                    <Text variant="bodyMd">{error}</Text>
                  </Banner>
                ) : (
                  <BlockStack gap="4" align="center">
                    <Spinner size="large" />
                    <Text variant="bodyMd">Loading AI Settings...</Text>
                  </BlockStack>
                )}
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const surveyData = parseSurveyFeedback(userDetails.survey_feedback);

  return (
    <Page 
      title="AI Settings"
      subtitle={`Store: ${sessionInfo?.shopDomain} ${sessionInfo?.userName ? `| User: ${sessionInfo.userName}` : ''}`}
    >
      <Layout>
        {actionData?.success && (
          <Layout.Section>
            <Banner status="success">
              <Text variant="bodyMd">
                {actionData.message}
                {actionData.updatedFields && actionData.updatedFields.length > 0 && (
                  <> Updated: {actionData.updatedFields.join(', ')}</>
                )}
              </Text>
            </Banner>
          </Layout.Section>
        )}

        {actionData?.error && (
          <Layout.Section>
            <Banner status="critical">
              <Text variant="bodyMd">{actionData.error}</Text>
            </Banner>
          </Layout.Section>
        )}

        {/* Debug Information (Remove in production) */}
        {sessionInfo && (
          <Layout.Section>
            <Card>
              <div style={{ padding: '20px' }}>
                <Text variant="headingMd" as="h2">Session Information (Debug)</Text>
                <div style={{ paddingTop: '16px' }}>
                  <BlockStack gap="2">
                    <Text variant="bodyMd">Store URL: {sessionInfo.storeUrl}</Text>
                    <Text variant="bodyMd">Shop Domain: {sessionInfo.shopDomain}</Text>
                    <Text variant="bodyMd">User Email: {sessionInfo.userEmail || 'Not available'}</Text>
                    <Text variant="bodyMd">User ID: {sessionInfo.userId || 'Not available'}</Text>
                    <Text variant="bodyMd">User Name: {sessionInfo.userName || 'Not available'}</Text>
                  </BlockStack>
                </div>
              </div>
            </Card>
          </Layout.Section>
        )}

        {/* AI Settings Form */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">AI Generation Settings</Text>
              <div style={{ paddingTop: '24px' }}>
                <Form method="post">
                  {/* Hidden field for user identification - now using email like loader */}
                  <input 
                    type="hidden" 
                    name="user_id" 
                    value={sessionInfo?.userEmail || sessionInfo?.shopDomain} 
                  />
                  
                  <FormLayout>
                    <Select
                      label="Alt Generation Type"
                      options={altGenTypeOptions}
                      value={formData.alt_gen_type}
                      name="alt_gen_type"
                      onChange={(value) => handleFieldChange('alt_gen_type', value)}
                    />

                    <TextField
                      label="Alt Prefix"
                      value={formData.alt_prefix}
                      name="alt_prefix"
                      onChange={(value) => handleFieldChange('alt_prefix', value)}
                    />

                    <TextField
                      label="Alt Suffix"
                      value={formData.alt_suffix}
                      name="alt_suffix"
                      onChange={(value) => handleFieldChange('alt_suffix', value)}
                    />

                    <TextField
                      label="ChatGPT Prompt Layer"
                      value={formData.chatgpt_prompt_layer}
                      name="chatgpt_prompt_layer"
                      onChange={(value) => handleFieldChange('chatgpt_prompt_layer', value)}
                    />

                    <Select
                      label="Language"
                      options={languageOptions}
                      value={formData.language}
                      name="language"
                      onChange={(value) => handleFieldChange('language', value)}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px' }}>
                      <Button
                        variant="primary"
                        submit
                        loading={isSubmitting}
                      >
                        {isSubmitting ? 'Saving...' : 'Save Settings'}
                      </Button>
                    </div>
                  </FormLayout>
                </Form>
              </div>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
