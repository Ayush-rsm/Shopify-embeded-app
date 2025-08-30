import { useState, useCallback, useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  Checkbox,
  Select,
  TextField,
  Text,
  BlockStack,
  Banner,
  Spinner,
  Frame,
  Toast
} from "@shopify/polaris";
import {
  fetchUserData,
  saveUserSettings,
  transformFormDataToAPI,
  transformAPIDataToForm,
  validateFormData
} from "../utils/api";

// -- localStorage keys
const STORAGE_KEYS = {
  USER_DATA: 'altMagic_userData',
  FORM_STATE: 'altMagic_formState',
  SHOP_INFO: 'altMagic_shopInfo'
};

// -- helpers for localStorage
const saveToStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

const loadFromStorage = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return null;
  }
};

const clearStorage = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
};

export default function AiSettings() {
  const app = useAppBridge();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [formErrors, setFormErrors] = useState([]);
  const [shopInfo, setShopInfo] = useState(null);

  const [formState, setFormState] = useState({
    autoGenerate: false,

    language: "english",
    fieldMapping: {
      useForTitle: false,
      useForCaption: false,
      useForDescription: false,
    },
    textPrefix: "",
    textSuffix: "",

    postContext: true,


  });

const CLIENT_ID = import.meta.env.VITE_SHOPIFY_CLIENT_ID;

  // 1. Load data from localStorage on component mount
  useEffect(() => {
    const savedUserData = loadFromStorage(STORAGE_KEYS.USER_DATA);
    const savedFormState = loadFromStorage(STORAGE_KEYS.FORM_STATE);
    const savedShopInfo = loadFromStorage(STORAGE_KEYS.SHOP_INFO);

    if (savedUserData) {
      setUserData(savedUserData);
      setLoading(false);
    }
    if (savedFormState) {
      setFormState(savedFormState);
    }
    if (savedShopInfo) {
      setShopInfo(savedShopInfo);
    }
  }, []);

  // 2. Save formState to localStorage whenever it changes
  useEffect(() => {
    if (formState) {
      saveToStorage(STORAGE_KEYS.FORM_STATE, formState);
    }
  }, [formState]);

  // 3. Get shop information from App Bridge and construct the correct store URL
  useEffect(() => {
    const getShopInfo = async () => {
      try {
        if (app) {
          const config = app.config;
          const shopDomain = config.shop;
          const fullStoreUrl = `https://${shopDomain}/admin/oauth/redirect_from_cli?client_id=${CLIENT_ID}`;

          const shopInfoObj = {
            shop: shopDomain,
            userId: shopDomain,
            storeUrl: fullStoreUrl
          };
          setShopInfo(shopInfoObj);
          saveToStorage(STORAGE_KEYS.SHOP_INFO, shopInfoObj);
        }
      } catch (error) {
        try {
          if (app && app.localOrigin) {
            const shopDomain = app.localOrigin.replace('https://', '').split('.')[0] + '.myshopify.com';
            const fullStoreUrl = `https://${shopDomain}/admin/oauth/redirect_from_cli?client_id=${CLIENT_ID}`;

            const shopInfoObj = {
              shop: shopDomain,
              userId: shopDomain,
              storeUrl: fullStoreUrl
            };
            setShopInfo(shopInfoObj);
            saveToStorage(STORAGE_KEYS.SHOP_INFO, shopInfoObj);
          }
        } catch (fallbackError) {
          console.error('Fallback method also failed:', fallbackError);
        }
      }
    };

    if (app && !shopInfo) {
      getShopInfo();
    }
  }, [app]); // do NOT depend on shopInfo here

  // 4. Load user data when shop info is available (and update localStorage)
  useEffect(() => {
    const loadUserData = async () => {
      if (!shopInfo) return;

      try {
        setLoading(true);
        setError(null);

        const data = await fetchUserData(shopInfo.userId, shopInfo.storeUrl);

        // Check if data is valid before setting
        if (data && typeof data === 'object') {
          setUserData(data);
          saveToStorage(STORAGE_KEYS.USER_DATA, data);

          // Extract correct user_id
          const actualUserId = data.store_data?.user_id || shopInfo.userId;
          const updatedShopInfo = { ...shopInfo, userId: actualUserId };
          setShopInfo(updatedShopInfo);
          saveToStorage(STORAGE_KEYS.SHOP_INFO, updatedShopInfo);

          const transformedFormState = transformAPIDataToForm(data);
          setFormState(transformedFormState);
          saveToStorage(STORAGE_KEYS.FORM_STATE, transformedFormState);
        } else {
          setError('Invalid data received from server');
        }
      } catch (err) {
        setError(err.message);
        setToastMessage(`Error loading settings: ${err.message}`);
        setShowToast(true);
      } finally {
        setLoading(false);
      }
    };

    // Only trigger when shop changes (not shopInfo object!)
    if (shopInfo?.shop) {
      loadUserData();
    }
  }, [shopInfo?.shop]);

  // Save Handler. Updates localStorage after saving
  const handleSubmit = useCallback(async () => {
    if (!shopInfo || !userData) {
      setToastMessage("Shop information or user data not available");
      setShowToast(true);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setFormErrors([]);

      const validationErrors = validateFormData(formState);
      if (validationErrors.length > 0) {
        setFormErrors(validationErrors);
        setToastMessage(`Please fix the following errors: ${validationErrors.join(', ')}`);
        setShowToast(true);
        return;
      }

      const storeSettings = transformFormDataToAPI(formState);
      const correctUserId = userData.store_data?.user_id || shopInfo.userId;

      const result = await saveUserSettings(correctUserId, shopInfo.storeUrl, storeSettings);

      if (window.shopify && window.shopify.toast) {
        window.shopify.toast.show("Settings saved successfully!");
      } else {
        setToastMessage("Settings saved successfully!");
        setShowToast(true);
      }

      // Reload user data and update localStorage
      const updatedData = await fetchUserData(correctUserId, shopInfo.storeUrl);
      if (updatedData && typeof updatedData === 'object') {
        setUserData(updatedData);
        saveToStorage(STORAGE_KEYS.USER_DATA, updatedData);

        const updatedFormState = transformAPIDataToForm(updatedData);
        setFormState(updatedFormState);
        saveToStorage(STORAGE_KEYS.FORM_STATE, updatedFormState);
      }
    } catch (err) {
      setError(err.message);
      if (window.shopify && window.shopify.toast) {
        window.shopify.toast.show(`Error saving settings: ${err.message}`, { isError: true });
      } else {
        setToastMessage(`Error saving settings: ${err.message}`);
        setShowToast(true);
      }
    } finally {
      setSaving(false);
    }
  }, [formState, shopInfo, userData]);

  const updateFormState = useCallback((field, value) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    if (formErrors.length > 0) {
      setFormErrors([]);
    }
  }, [formErrors]);

  const updateNestedFormState = useCallback((parent, field, value) => {
    setFormState(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
    if (formErrors.length > 0) {
      setFormErrors([]);
    }
  }, [formErrors]);


  const languageOptions = [
    { label: "English", value: "english" },
    { label: "Spanish", value: "spanish" },
    { label: "French", value: "french" },
    { label: "German", value: "german" },
    { label: "Japanese", value: "japanese" },
    { label: "Korean", value: "korean" },
    { label: "Hindi", value: "hindi" },
  ];

  if (!shopInfo) {
    return (
      <Frame>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '400px',
          flexDirection: 'column'
        }}>
          <Spinner size="large" />
          <div style={{ marginTop: '16px' }}>
            <Text variant="bodyMd">Loading shop information...</Text>
          </div>
        </div>
      </Frame>
    );
  }

  if (loading) {
    return (
      <Frame>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '400px',
          flexDirection: 'column'
        }}>
          <Spinner size="large" />
          <div style={{ marginTop: '16px' }}>
            <Text variant="bodyMd">Loading your AI settings...</Text>
          </div>
        </div>
      </Frame>
    );
  }

  if (error && !userData) {
    return (
      <Frame>
        <Banner tone="critical">
          <Text variant="bodyMd">
            Error loading settings: {error}
          </Text>
          <div style={{ marginTop: '12px' }}>
            <Text variant="bodyMd" tone="subdued">
              Shop: {shopInfo?.shop || 'Unknown'}
            </Text>
          </div>
        </Banner>
      </Frame>
    );
  }

  const toastMarkup = showToast ? (
    <Toast
      content={toastMessage}
      onDismiss={() => setShowToast(false)}
      duration={4000}
    />
  ) : null;

  const displayUserId = userData?.store_data?.user_id || shopInfo.userId;

  return (
    <Frame>
      {toastMarkup}
      <Page
        title="Alt Magic AI Settings"
        primaryAction={{
          content: saving ? "Saving..." : "Save Settings",
          onAction: handleSubmit,
          loading: saving,
        }}
      >
        <Layout>
          <Layout.Section>
            {formErrors.length > 0 && (
              <Banner tone="critical">
                <Text variant="bodyMd">Please fix the following errors:</Text>
                <ul style={{ marginTop: '8px', marginLeft: '16px' }}>
                  {formErrors.map((error, index) => (
                    <li key={index}>
                      <Text as="span" variant="bodyMd">{error}</Text>  
                    </li>
                  ))}
                </ul>
              </Banner>
            )}

            <BlockStack gap="500">
              {/* Auto-generate Alt Text */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    Auto-generate Alt Text
                  </Text>
                  <Text variant="bodyMd" tone="subdued">
                    Automatically generate alt text for new images
                  </Text>
                  <Checkbox
                    label="Automatically generate alt text when new images are added"
                    checked={formState.autoGenerate}
                    onChange={(value) => updateFormState("autoGenerate", value)}
                    helpText="It will automatically generate alt text for all images added to your website."
                  />
                </BlockStack>
              </Card>
              {/* Alt Text Language */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    Alt Text Language
                  </Text>
                  <Text variant="bodyMd" tone="subdued">
                    Select the language for generated alt text
                  </Text>
                  <Select
                    label=""
                    options={languageOptions}
                    value={formState.language}
                    onChange={(value) => updateFormState("language", value)}
                  />
                </BlockStack>
              </Card>
              {/* Field Mapping */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    Field Mapping
                  </Text>
                  <Text variant="bodyMd" tone="subdued">
                    Use generated alt text for other image fields
                  </Text>
                  <FormLayout>
                    <Checkbox
                      label="Use same alt text value for product names"
                      checked={formState.fieldMapping.useForDescription}
                      onChange={(value) => updateNestedFormState("fieldMapping", "useForDescription", value)}
                    />
                  </FormLayout>
                </BlockStack>
              </Card>
              {/* Text Prefix and Suffix */}
              <Card>
                <BlockStack gap="400">
                  <FormLayout>
                    <FormLayout.Group>
                      <div>
                        <Text variant="headingMd" as="h3">
                          Text Prefix
                        </Text>
                        <Text variant="bodyMd" tone="subdued">
                          Add text to the beginning of alt text
                        </Text>
                        <div style={{ marginTop: '12px' }}>
                          <TextField
                            label=""
                            value={formState.textPrefix}
                            onChange={(value) => updateFormState("textPrefix", value)}
                            autoComplete="off"
                            maxLength={100}
                            showCharacterCount
                          />
                        </div>
                      </div>
                      <div>
                        <Text variant="headingMd" as="h3">
                          Text Suffix
                        </Text>
                        <Text variant="bodyMd" tone="subdued">
                          Add text to the end of alt text
                        </Text>
                        <div style={{ marginTop: '12px' }}>
                          <TextField
                            label=""
                            value={formState.textSuffix}
                            onChange={(value) => updateFormState("textSuffix", value)}
                            autoComplete="off"
                            maxLength={100}
                            showCharacterCount
                          />
                        </div>
                      </div>
                    </FormLayout.Group>
                  </FormLayout>
                </BlockStack>
              </Card>
              {/* Post Context */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    Post Context
                  </Text>
                  <Text variant="bodyMd" tone="subdued">
                    Use post information for better alt text
                  </Text>
                  <Checkbox
                    label="Use post title as keywords if SEO keywords not found"
                    checked={formState.postContext}
                    onChange={(value) => updateFormState("postContext", value)}
                    helpText="Note: Image should be linked to a post for using post title as context."
                  />
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
