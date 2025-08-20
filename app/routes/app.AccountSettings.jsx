// import { useState, useCallback, useEffect } from "react";
// import {
//   Page,
//   Layout,
//   Card,
//   TextField,
//   Button,
//   BlockStack,
//   Text,
//   Banner,
//   Badge,
//   Divider,
//   Avatar,
//   InlineStack,
// } from "@shopify/polaris";
// import { 
//   completeVerificationFlow, 
//   verifyApiKey, 
//   getUserDetails, 
//   getCurrentStoreUrl,
//   handleApiResponse,
//   localStorage               // <-- Import localStorage
// } from "../utils/shopifyApi";

// export default function AccountSettings() {
//   const [apiKey, setApiKey] = useState("");
//   const [isVerified, setIsVerified] = useState(false);
//   const [userDetails, setUserDetails] = useState(null);
//   const [error, setError] = useState("");
//   const [isLoading, setIsLoading] = useState(true);
//   const [isVerifying, setIsVerifying] = useState(false);

//   const handleApiKeyChange = useCallback((value) => {
//     setApiKey(value);
//     setError("");
//   }, []);

//   const mapUserDetails = (apiResponse) => {
//     const userDetailsData = apiResponse.userDetails || apiResponse.user_details;
//     const apiKey = apiResponse.apiKey || apiResponse.api_key;
//     return {
//       apiKey: apiKey || "****",
//       username: userDetailsData?.user_name?.split(' ')[0]?.toLowerCase() ||
//                 userDetailsData?.username ||
//                 userDetailsData?.email?.split('@') ||
//                 "user",
//       profile: {
//         name: userDetailsData?.user_name || userDetailsData?.name || "User",
//         email: userDetailsData?.email || "user@example.com",
//         avatar: userDetailsData?.profile_picture || userDetailsData?.avatar || null,
//       },
//       planName: userDetailsData?.plan_type === "free" ? "Free Plan" :
//                 userDetailsData?.plan_type === "pro" ? "Pro Plan" :
//                 userDetailsData?.plan || "Free Plan",
//       creditsAvailable: userDetailsData?.credits_available ||
//                         userDetailsData?.credits || 0,
//       usage: userDetailsData?.usage || null,
//     };
//   };

//   useEffect(() => {
//     const checkStoreVerification = async () => {
//       setIsLoading(true);
//       setError("");
//       try {
//         const storeUrl = getCurrentStoreUrl();
//         if (!storeUrl) {
//           setError("Could not determine store URL");
//           setIsLoading(false);
//           return;
//         }
//         const result = await getUserDetails(storeUrl);
//         if (result.success && result.verified) {
//           setIsVerified(true);
//           setUserDetails(mapUserDetails(result));
//         } else {
//           setIsVerified(false);
//           setUserDetails(null);
//         }
//       } catch (err) {
//         setError(`Failed to check store verification: ${err?.message}`);
//       } finally {
//         setIsLoading(false);
//       }
//     };
//     checkStoreVerification();
//   }, []);

//   const handleVerification = async () => {
//     if (!apiKey.trim()) {
//       setError("Please enter an API key");
//       return;
//     }
//     setIsVerifying(true);
//     setError("");
//     try {
//       const storeUrl = getCurrentStoreUrl();
//       if (!storeUrl) {
//         setError("Could not determine store URL");
//         setIsVerifying(false);
//         return;
//       }
//       const result = await verifyApiKey(apiKey, storeUrl);
//       if (result.success) {
//         setUserDetails(mapUserDetails(result));
//         setIsVerified(true);
//         setError("");
//       } else {
//         setError(result.error || "API key verification failed");
//         setIsVerified(false);
//         setUserDetails(null);
//       }
//     } catch (err) {
//       setError(`An error occurred during verification: ${err?.message}`);
//     } finally {
//       setIsVerifying(false);
//     }
//   };

//   const handleCompleteVerificationFlow = async (providedApiKey = null) => {
//     setIsLoading(true);
//     setError("");
//     try {
//       const result = await completeVerificationFlow(providedApiKey);
//       const response = handleApiResponse(result);
//       switch (response.type) {
//         case 'SUCCESS':
//           setIsVerified(true);
//           setUserDetails(mapUserDetails(response));
//           break;
//         case 'REQUIRES_API_KEY':
//           setIsVerified(false);
//           setUserDetails(null);
//           break;
//         case 'ERROR':
//           setError(response.message);
//           setIsVerified(false);
//           setUserDetails(null);
//           break;
//       }
//     } catch (err) {
//       setError(`Verification process failed: ${err?.message}`);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleDisconnect = () => {
//     // Clear persisted credentials from localStorage
//     localStorage.clearCredentials();
//     setApiKey("");
//     setIsVerified(false);
//     setUserDetails(null);
//     setError("");
//   };

//   const renderVerificationSection = () => (
//     <Card>
//       <BlockStack gap="400">
//         <Text variant="headingMd">API Key Verification</Text>
//         <Text variant="bodyMd" tone="subdued">
//           Enter your API key to access your account details and credits information.
//         </Text>
//         <InlineStack gap="200">
//           <div style={{ flexGrow: 1 }}>
//             <TextField
//               label="API Key"
//               value={apiKey}
//               onChange={handleApiKeyChange}
//               placeholder="Enter your API key"
//               type="password"
//               error={error}
//               autoComplete="off"
//               disabled={isVerifying}
//             />
//           </div>
//           <Button
//             variant="primary"
//             onClick={handleVerification}
//             loading={isVerifying}
//             disabled={!apiKey.trim() || isVerifying}
//           >
//             {isVerifying ? "Verifying..." : "Verify"}
//           </Button>
//         </InlineStack>
//         {error && (
//           <Banner tone="critical">
//             <Text>{error}</Text>
//           </Banner>
//         )}
//         {process.env.NODE_ENV === 'development' && (
//           <Card>
//             <BlockStack gap="200">
//               <Text variant="headingSm">Debug Info</Text>
//               <Text variant="bodyMd" tone="subdued">
//                 Store URL: {getCurrentStoreUrl()}
//               </Text>
//               <Text variant="bodyMd" tone="subdued">
//                 API Key: {apiKey ? `${apiKey.substring(0, 6)}...` : 'Not entered'}
//               </Text>
//             </BlockStack>
//           </Card>
//         )}
//       </BlockStack>
//     </Card>
//   );

//   const renderUserDetails = () => {
//     if (!userDetails) return null;
//     return (
//       <Card>
//         <BlockStack gap="500">
//           <InlineStack align="space-between">
//             <Text variant="headingMd">Account Information</Text>
//             <Button variant="secondary" onClick={handleDisconnect}>
//               Disconnect
//             </Button>
//           </InlineStack>
//           <InlineStack gap="200" align="center">
//             <Avatar
//               customer
//               size="large"
//               name={userDetails.profile.name}
//               source={userDetails.profile.avatar}
//             />
//             <BlockStack gap="100">
//               <Text variant="headingMd">{userDetails.profile.name}</Text>
//               <Text variant="bodyMd" tone="subdued">
//                 @{userDetails.username}
//               </Text>
//               <Text variant="bodyMd" tone="subdued">
//                 {userDetails.profile.email}
//               </Text>
//             </BlockStack>
//           </InlineStack>
//           <Divider />
//           <BlockStack gap="200">
//             <Text variant="headingSm">API Key</Text>
//             <TextField
//               value={userDetails.apiKey}
//               readOnly
//               type="password"
//               connectedRight={
//                 <Button
//                   onClick={() => {
//                     navigator.clipboard.writeText(userDetails.apiKey);
//                     // Optional: Show success message
//                     console.log('📋 API key copied to clipboard');
//                   }}
//                 >
//                   Copy
//                 </Button>
//               }
//             />
//           </BlockStack>
//           <Divider />
//           <InlineStack gap="400">
//             <div style={{ flex: 1 }}>
//               <Card>
//                 <BlockStack gap="200">
//                   <Text variant="headingSm">Current Plan</Text>
//                   <Badge tone={userDetails.planName.includes('Pro') ? "success" : "info"}>
//                     {userDetails.planName}
//                   </Badge>
//                 </BlockStack>
//               </Card>
//             </div>
//             <div style={{ flex: 1 }}>
//               <Card>
//                 <BlockStack gap="200">
//                   <Text variant="headingSm">Credits Available</Text>
//                   <Text variant="heading2xl" as="p" alignment="center">
//                     {userDetails.creditsAvailable.toLocaleString()}
//                   </Text>
//                   <Text variant="bodyMd" tone="subdued" alignment="center">
//                     API calls remaining
//                   </Text>
//                 </BlockStack>
//               </Card>
//             </div>
//           </InlineStack>
//         </BlockStack>
//       </Card>
//     );
//   };

//   if (isLoading && !isVerified && !error) {
//     return (
//       <Page
//         title="Account Settings"
//         subtitle="Manage your API key and view account details"
//         backAction={{ content: "Dashboard", url: "/app" }}
//       >
//         <Layout>
//           <Layout.Section>
//             <Card>
//               <BlockStack gap="400">
//                 <Text variant="headingMd">Loading...</Text>
//                 <Text variant="bodyMd" tone="subdued">
//                   Checking store verification status...
//                 </Text>
//                 <Text variant="bodyMd" tone="subdued">
//                   Store URL: {getCurrentStoreUrl()}
//                 </Text>
//               </BlockStack>
//             </Card>
//           </Layout.Section>
//         </Layout>
//       </Page>
//     );
//   }

//   return (
//     <Page
//       title="Account Settings"
//       subtitle="Manage your API key and view account details"
//       backAction={{ content: "Dashboard", url: "/app" }}
//     >
//       <Layout>
//         <Layout.Section>
//           {!isVerified ? renderVerificationSection() : renderUserDetails()}
//           {isVerified }
//         </Layout.Section>
//       </Layout>
//     </Page>
//   );
// }


import { useState, useCallback, useEffect } from "react";
import {
  Page,
  Layout,
  Card,
  TextField,
  Button,
  BlockStack,
  Text,
  Banner,
  Badge,
  Divider,
  Avatar,
  InlineStack,
  Box,
} from "@shopify/polaris";
import {
  completeVerificationFlow,
  verifyApiKey,
  getUserDetails,
  getCurrentStoreUrl,
  handleApiResponse,
  localStorage
} from "../utils/shopifyApi";

export default function AccountSettings() {
  const [apiKey, setApiKey] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleApiKeyChange = useCallback((value) => {
    setApiKey(value);
    setError("");
  }, []);

  const mapUserDetails = (apiResponse) => {
    const userDetailsData = apiResponse.userDetails || apiResponse.user_details;
    const apiKey = apiResponse.apiKey || apiResponse.api_key;
    // Language mapping for better display
  const getLanguageDisplay = (langCode) => {
    const languageMap = {
      'en': 'English',
      'es': 'Spanish', 
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese'
    };
    return languageMap[langCode] || langCode?.toUpperCase();
  };
    return {
      apiKey: apiKey || "****",
      username: userDetailsData?.user_name?.split(' ')[0]?.toLowerCase() ||
        userDetailsData?.username ||
        userDetailsData?.email?.split('@') ||
        "user",
      profile: {
        name: userDetailsData?.user_name || userDetailsData?.name || "User",
        email: userDetailsData?.email || "user@example.com",
        avatar: userDetailsData?.profile_picture || userDetailsData?.avatar || null,
      },
      planName: userDetailsData?.plan_type === "free" ? "Free Plan" :
        userDetailsData?.plan_type === "pro" ? "Pro Plan" :
          userDetailsData?.plan || "Free Plan",
      creditsAvailable: userDetailsData?.credits_available ||
        userDetailsData?.credits || 0,
      usage: userDetailsData?.usage || null,
      language: getLanguageDisplay(userDetailsData?.language), // Added language field
    };
  };

  useEffect(() => {
    const checkStoreVerification = async () => {
      setIsLoading(true);
      setError("");
      try {
        const storeUrl = getCurrentStoreUrl();
        if (!storeUrl) {
          setError("Could not determine store URL");
          setIsLoading(false);
          return;
        }
        const result = await getUserDetails(storeUrl);
        if (result.success && result.verified) {
          setIsVerified(true);
          setUserDetails(mapUserDetails(result));
        } else {
          setIsVerified(false);
          setUserDetails(null);
        }
      } catch (err) {
        setError(`Failed to check store verification: ${err?.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    checkStoreVerification();
  }, []);

  const handleVerification = async () => {
    if (!apiKey.trim()) {
      setError("Please enter an API key");
      return;
    }
    setIsVerifying(true);
    setError("");
    try {
      const storeUrl = getCurrentStoreUrl();
      if (!storeUrl) {
        setError("Could not determine store URL");
        setIsVerifying(false);
        return;
      }
      const result = await verifyApiKey(apiKey, storeUrl);
      if (result.success) {
        setUserDetails(mapUserDetails(result));
        setIsVerified(true);
        setError("");
      } else {
        setError(result.error || "API key verification failed");
        setIsVerified(false);
        setUserDetails(null);
      }
    } catch (err) {
      setError(`An error occurred during verification: ${err?.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCompleteVerificationFlow = async (providedApiKey = null) => {
    setIsLoading(true);
    setError("");
    try {
      const result = await completeVerificationFlow(providedApiKey);
      const response = handleApiResponse(result);
      switch (response.type) {
        case 'SUCCESS':
          setIsVerified(true);
          setUserDetails(mapUserDetails(response));
          break;
        case 'REQUIRES_API_KEY':
          setIsVerified(false);
          setUserDetails(null);
          break;
        case 'ERROR':
          setError(response.message);
          setIsVerified(false);
          setUserDetails(null);
          break;
      }
    } catch (err) {
      setError(`Verification process failed: ${err?.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.clearCredentials();
    setApiKey("");
    setIsVerified(false);
    setUserDetails(null);
    setError("");
  };

  const renderVerificationSection = () => (
    <Card>
      <Box padding="500">
        <BlockStack gap="500">
          <Text variant="headingLg">API Key Verification</Text>
          <Text variant="bodyMd" tone="subdued">
            Enter your API key to access your account details and credits information.
          </Text>
          <InlineStack gap="300">
            <div style={{ flexGrow: 1 }}>
              <TextField

                value={apiKey}
                onChange={handleApiKeyChange}
                placeholder="Enter your API key"
                type="password"
                error={error}
                autoComplete="off"
                disabled={isVerifying}
              />
            </div>
            <Button
              variant="primary"
              onClick={handleVerification}
              loading={isVerifying}
              disabled={!apiKey.trim() || isVerifying}
            >
              {isVerifying ? "Verifying..." : "Verify"}
            </Button>
          </InlineStack>
          {error && (
            <Banner tone="critical">
              <Text>{error}</Text>
            </Banner>
          )}
        </BlockStack>
      </Box>
    </Card>
  );

  const renderUserDetails = () => {
    if (!userDetails) return null;
    return (
      <Card>
        <Box padding="500">
          <BlockStack gap="500">
            <InlineStack align="space-between">
              <Text variant="headingLg">Account Information</Text>
              <Button variant="secondary" onClick={handleDisconnect}>
                Disconnect
              </Button>
            </InlineStack>

            <InlineStack gap="400" align="center">
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '2px solid var(--p-color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--p-color-bg-surface-secondary)'
              }}>
                {userDetails.profile.avatar ? (
                  <img
                    src={userDetails.profile.avatar}
                    alt={userDetails.profile.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <Avatar
                    customer
                    size="extraLarge"
                    name={userDetails.profile.name}
                  />
                )}
              </div>
              <BlockStack gap="200">
                <Text variant="headingMd">{userDetails.profile.name}</Text>
                <Text variant="bodyLg" tone="subdued">
                  @{userDetails.username}
                </Text>
                <Text variant="bodyMd" tone="subdued">
                  {userDetails.profile.email}
                </Text>
              </BlockStack>
            </InlineStack>

            <Divider />

            <BlockStack gap="300">
              <Text variant="headingSm">API Key</Text>
              <TextField
                value={userDetails.apiKey}
                readOnly
                type="password"
                connectedRight={
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(userDetails.apiKey);
                      console.log('📋 API key copied to clipboard');
                    }}
                  >
                    Copy
                  </Button>
                }
              />
            </BlockStack>


         



            <Divider />

            <InlineStack gap="500">
              <div style={{ flex: 1 }}>
                <BlockStack gap="100">
                <Card background="bg-surface-secondary">
                  <Box >
                  <BlockStack gap="200" align="center">
              <Text variant="headingSm">Language</Text>
              <Badge tone="info">
                {userDetails.language}
              </Badge>
            </BlockStack>
             </Box>
                </Card>
              
                <Card  background="bg-surface-secondary">
                  <Box >
                    <BlockStack gap="300" align="center">
                      <Text variant="headingSm">Current Plan</Text>
                      <Badge tone={userDetails.planName.includes('Pro') ? "success" : "info"}>
                        {userDetails.planName}
                      </Badge>
                    </BlockStack>
                  </Box>
                </Card>
                 </BlockStack>
                 
              </div>
              <div style={{ flex: 1 }}>
                <Card background="bg-surface-secondary">
                  <Box padding="400">
                    <BlockStack gap="300" align="center">
                      <Text variant="headingSm">Credits Available</Text>
                      <Text variant="heading2xl" as="p" alignment="center">
                        {userDetails.creditsAvailable.toLocaleString()}
                      </Text>
                      <Text variant="bodyMd" tone="subdued" alignment="center">
                        API calls remaining
                      </Text>
                    </BlockStack>
                  </Box>
                </Card>
              </div>
            </InlineStack>
          </BlockStack>
        </Box>
      </Card>
    );
  };

  if (isLoading && !isVerified && !error) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Card>
              <Box padding="500">
                <BlockStack gap="400">
                  <Text variant="headingMd">Loading...</Text>
                  <Text variant="bodyMd" tone="subdued">
                    Checking store verification status...
                  </Text>
                  <Text variant="bodyMd" tone="subdued">
                    Store URL: {getCurrentStoreUrl()}
                  </Text>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title="Account Settings"
      subtitle="Manage your API key and view account details"
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <Layout>
        <Layout.Section>
          {!isVerified ? renderVerificationSection() : renderUserDetails()}
        </Layout.Section>
      </Layout>
    </Page>
  );
}

