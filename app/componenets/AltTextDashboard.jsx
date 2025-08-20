// import {
//   Page,
//   Card,
//   Button,
//   Thumbnail,
//   TextField,
//   IndexTable,
//   useIndexResourceState,
//   Badge,
//   Toast,
//   Frame,
//   Loading,
// } from '@shopify/polaris';
// import { useState } from 'react';

// export default function AltTextDashboard({
//   initialImages,
//   onAltTextChange,
//   onAltTextGenerated,
//   filterType, // New prop to show current filter
// }) {
//   const [loading, setLoading] = useState(false);
//   const [loadingStates, setLoadingStates] = useState({});
//   const [toastMessage, setToastMessage] = useState('');
//   const [showToast, setShowToast] = useState(false);

//   const {
//     selectedResources,
//     allResourcesSelected,
//     handleSelectionChange,
//   } = useIndexResourceState(initialImages);

//   const showToastMessage = (message) => {
//     setToastMessage(message);
//     setShowToast(true);
//   };

//   const setItemLoading = (id, isLoading) => {
//     setLoadingStates(prev => ({
//       ...prev,
//       [id]: isLoading
//     }));
//   };

//   // Function to get alt text quality badge
//   const getAltTextQualityBadge = (altText) => {
//     if (!altText || altText.trim() === '') {
//       return <Badge status="critical">Empty</Badge>;
//     }
//     if (altText.trim().length < 10) {
//       return <Badge status="warning">Bad ({altText.trim().length} chars)</Badge>;
//     }
//     return <Badge status="success">Good ({altText.trim().length} chars)</Badge>;
//   };

//   // Single function that generates and saves alt text
//   const handleGenerateAndSave = async (id) => {
//     const imageToUpdate = initialImages.find((img) => img.id === id);
//     if (!imageToUpdate) return;

//     setItemLoading(id, true);

//     try {
//       // Step 1: Generate alt text
//       console.log('Starting generation for image:', id);
//       const response = await fetch(imageToUpdate.image);
//       if (!response.ok) {
//         throw new Error(`Failed to fetch image: ${response.status}`);
//       }

//       const blob = await response.blob();
//       const base64 = await new Promise((resolve, reject) => {
//         const reader = new FileReader();
//         reader.onloadend = () => resolve(reader.result.split(',')[1]);
//         reader.onerror = reject;
//         reader.readAsDataURL(blob);
//       });

//       const res = await fetch('/api/generate-alt-text', {
//         method: 'POST',
//         headers: { 
//           'Content-Type': 'application/json',
//           'Accept': 'application/json'
//         },
//         body: JSON.stringify({
//           imageBase64: base64,
//           type: imageToUpdate.type,
//         }),
//       });

//       if (!res.ok) {
//         const errorText = await res.text();
//         console.error('Generate alt text error response:', errorText);
//         throw new Error(`Generation failed: ${res.status}`);
//       }

//       const data = await res.json();
      
//       if (!data.altText) {
//         throw new Error('No alt text returned from generation service');
//       }

//       console.log('Alt text generated:', data.altText);

//       // Update local state first
//       onAltTextGenerated(id, data.altText);
      
//       // Step 2: Automatically save the generated alt text
//       console.log('Auto-saving generated alt text for image:', id);
      
//       // Create updated image object with the new alt text
//       const updatedImage = { ...imageToUpdate, altText: data.altText };
      
//       // Image type detection
//       const isPageImage = updatedImage.id.includes('gid://shopify/Page/') || updatedImage.type === 'page';
//       const isBlogImage = updatedImage.type === 'blog' || updatedImage.blogId;
//       const isProductImage = updatedImage.productId || updatedImage.type === 'product';

//       let requestData;
//       let apiEndpoint;

//       if (isBlogImage) {
//         const isFeaturedImage = 
//           updatedImage.imageType === "featured" || 
//           updatedImage.isFeaturedImage === true || 
//           updatedImage.id.includes('_featured') ||
//           updatedImage.featuredImageData?.isArticleFeaturedImage;

//         const isInlineImage = 
//           updatedImage.imageType === "inline" || 
//           updatedImage.isFeaturedImage === false || 
//           updatedImage.id.includes('_html_') ||
//           updatedImage.inlineImageData?.isInlineImage;

//         if (!isFeaturedImage && !isInlineImage) {
//           throw new Error(`Unable to determine blog image type for ${updatedImage.id}`);
//         }

//         if (isFeaturedImage && isInlineImage) {
//           throw new Error(`Conflicting image type detection for ${updatedImage.id}`);
//         }

//         requestData = {
//           imageId: updatedImage.image,
//           altText: data.altText.trim(),
//           blogId: updatedImage.blogId,
//           articleId: updatedImage.articleId,
//           shopDomain: "empowered-equity-dev.myshopify.com",
//           imageType: isFeaturedImage ? "featured" : "inline",
//           blogTitle: updatedImage.blogTitle,
//           articleTitle: updatedImage.articleTitle,
//           originalImageType: updatedImage.imageType,
//           debugInfo: {
//             originalId: updatedImage.id,
//             detectionMethod: isFeaturedImage ? 'featured_image_detection' : 'inline_image_detection',
//             confidence: 'high'
//           }
//         };

//         apiEndpoint = '/api/update-blog-alt-text';

//       } else if (isPageImage) {
//         const pageIdMatch = updatedImage.id.match(/gid:\/\/shopify\/Page\/(\d+)_img_/);
//         if (!pageIdMatch) {
//           throw new Error(`Invalid page image ID format: ${updatedImage.id}`);
//         }

//         const pageId = pageIdMatch[1];
//         requestData = {
//           imageId: updatedImage.image,
//           altText: data.altText.trim(),
//           pageId: pageId,
//           shopDomain: "empowered-equity-dev.myshopify.com"
//         };

//         apiEndpoint = '/api/update-page-alt-text';

//       } else if (isProductImage) {
//         requestData = {
//           altText: data.altText.trim(),
//           imageId: updatedImage.shopifyImageId || updatedImage.originalId || updatedImage.id,
//           productId: updatedImage.productId
//         };

//         apiEndpoint = '/api/update-alt-text';

//       } else {
//         throw new Error(`Unsupported image type: ${updatedImage.type || 'unknown'} for image ${updatedImage.id}`);
//       }

//       console.log('Using API endpoint:', apiEndpoint);
//       console.log('Request data:', requestData);

//       // Make the save API request
//       const saveResponse = await fetch(apiEndpoint, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'Accept': 'application/json'
//         },
//         body: JSON.stringify(requestData)
//       });

//       const contentType = saveResponse.headers.get('content-type');
//       if (!contentType || !contentType.includes('application/json')) {
//         const textResponse = await saveResponse.text();
//         console.error('Non-JSON response received during auto-save:', textResponse);
//         throw new Error(`Save failed: Invalid response format`);
//       }

//       const saveResult = await saveResponse.json();

//       if (!saveResponse.ok) {
//         console.error('Auto-save response not OK:', saveResult);
//         throw new Error(saveResult.details || saveResult.error || `Server error: ${saveResponse.status}`);
//       }

//       if (saveResult.success) {
//         let imageTypeText = 'unknown';
//         let featuredText = '';
        
//         if (isPageImage) {
//           imageTypeText = 'page';
//         } else if (isBlogImage) {
//           imageTypeText = 'blog';
//           if (requestData.imageType === 'featured') {
//             featuredText = ' featured';
//           } else {
//             featuredText = ' inline';
//           }
//         } else if (isProductImage) {
//           imageTypeText = 'product';
//         }

//         showToastMessage(`Great! Alt text created and saved for your ${imageTypeText}${featuredText} image.`);
//         console.log('Success: Alt text generated and saved for image:', id);
//       } else {
//         throw new Error('Save operation failed - success flag is false');
//       }

//     } catch (error) {
//       console.error('Error during generate and save:', error);
      
//       // User-friendly error messages
//       if (error.message.includes('Generation failed')) {
//         showToastMessage('Sorry, our AI service is temporarily unavailable. Please try again.');
//       } else if (error.message.includes('Save failed')) {
//         showToastMessage('Alt text was created but couldn\'t be saved to Shopify. Please try again.');
//       } else if (error.message.includes('Unable to determine blog image type')) {
//         showToastMessage('We couldn\'t identify this image type. Please contact support.');
//       } else if (error.message.includes('fetch')) {
//         showToastMessage('Network connection issue. Please check your internet and try again.');
//       } else {
//         showToastMessage(`Something went wrong: ${error.message}`);
//       }
//     } finally {
//       setItemLoading(id, false);
//     }
//   };

//   // Bulk generate and save for selected images
//   const handleGenerateSelectedImages = async () => {
//     if (selectedResources.length === 0) return;

//     setLoading(true);
//     let successCount = 0;
//     let errorCount = 0;
//     const errors = [];

//     try {
//       // Process images one by one to avoid overwhelming the API
//       for (const id of selectedResources) {
//         const imageToUpdate = initialImages.find((img) => img.id === id);
//         if (!imageToUpdate) {
//           errorCount++;
//           errors.push(`Image ${id}: Not found`);
//           continue;
//         }

//         setItemLoading(id, true);

//         try {
//           // Step 1: Generate alt text
//           const response = await fetch(imageToUpdate.image);
//           if (!response.ok) {
//             throw new Error(`Failed to fetch image: ${response.status}`);
//           }

//           const blob = await response.blob();
//           const base64 = await new Promise((resolve, reject) => {
//             const reader = new FileReader();
//             reader.onloadend = () => resolve(reader.result.split(',')[1]);
//             reader.onerror = reject;
//             reader.readAsDataURL(blob);
//           });

//           const res = await fetch('/api/generate-alt-text', {
//             method: 'POST',
//             headers: { 
//               'Content-Type': 'application/json',
//               'Accept': 'application/json'
//             },
//             body: JSON.stringify({
//               imageBase64: base64,
//               type: imageToUpdate.type,
//             }),
//           });

//           if (!res.ok) {
//             throw new Error(`Generation failed: ${res.status}`);
//           }

//           const data = await res.json();
          
//           if (!data.altText) {
//             throw new Error('No alt text returned');
//           }

//           // Update local state
//           onAltTextGenerated(id, data.altText);

//           // Step 2: Auto-save
//           const updatedImage = { ...imageToUpdate, altText: data.altText };
          
//           // Determine save endpoint and data
//           let requestData;
//           let apiEndpoint;

//           const isPageImage = updatedImage.id.includes('gid://shopify/Page/') || updatedImage.type === 'page';
//           const isBlogImage = updatedImage.type === 'blog' || updatedImage.blogId;
//           const isProductImage = updatedImage.productId || updatedImage.type === 'product';

//           if (isBlogImage) {
//             const isFeaturedImage = 
//               updatedImage.imageType === "featured" || 
//               updatedImage.isFeaturedImage === true || 
//               updatedImage.id.includes('_featured') ||
//               updatedImage.featuredImageData?.isArticleFeaturedImage;

//             const isInlineImage = 
//               updatedImage.imageType === "inline" || 
//               updatedImage.isFeaturedImage === false || 
//               updatedImage.id.includes('_html_') ||
//               updatedImage.inlineImageData?.isInlineImage;

//             if (!isFeaturedImage && !isInlineImage) {
//               throw new Error(`Unable to determine blog image type for ${updatedImage.id}`);
//             }

//             requestData = {
//               imageId: updatedImage.image,
//               altText: data.altText.trim(),
//               blogId: updatedImage.blogId,
//               articleId: updatedImage.articleId,
//               shopDomain: "empowered-equity-dev.myshopify.com",
//               imageType: isFeaturedImage ? "featured" : "inline",
//               blogTitle: updatedImage.blogTitle,
//               articleTitle: updatedImage.articleTitle,
//               originalImageType: updatedImage.imageType
//             };
//             apiEndpoint = '/api/update-blog-alt-text';

//           } else if (isPageImage) {
//             const pageIdMatch = updatedImage.id.match(/gid:\/\/shopify\/Page\/(\d+)_img_/);
//             if (!pageIdMatch) {
//               throw new Error(`Invalid page image ID format: ${updatedImage.id}`);
//             }

//             const pageId = pageIdMatch[1];
//             requestData = {
//               imageId: updatedImage.image,
//               altText: data.altText.trim(),
//               pageId: pageId,
//               shopDomain: "empowered-equity-dev.myshopify.com"
//             };
//             apiEndpoint = '/api/update-page-alt-text';

//           } else if (isProductImage) {
//             requestData = {
//               altText: data.altText.trim(),
//               imageId: updatedImage.shopifyImageId || updatedImage.originalId || updatedImage.id,
//               productId: updatedImage.productId
//             };
//             apiEndpoint = '/api/update-alt-text';

//           } else {
//             throw new Error(`Unsupported image type: ${updatedImage.type || 'unknown'}`);
//           }

//           const saveResponse = await fetch(apiEndpoint, {
//             method: 'POST',
//             headers: {
//               'Content-Type': 'application/json',
//               'Accept': 'application/json'
//             },
//             body: JSON.stringify(requestData)
//           });

//           const saveResult = await saveResponse.json();

//           if (!saveResponse.ok || !saveResult.success) {
//             throw new Error(saveResult.details || saveResult.error || 'Failed to save generated alt text');
//           }

//           successCount++;

//         } catch (error) {
//           console.error(`Error processing image ${id}:`, error);
//           errors.push(`Image ${id}: ${error.message}`);
//           errorCount++;
//         } finally {
//           setItemLoading(id, false);
//         }

//         // Small delay between requests
//         await new Promise(resolve => setTimeout(resolve, 500));
//       }

//       // Show summary message
//       if (successCount > 0 && errorCount === 0) {
//         showToastMessage(`Perfect! Generated and saved alt text for all ${successCount} images.`);
//       } else if (successCount > 0 && errorCount > 0) {
//         showToastMessage(`Done! Generated ${successCount} alt texts successfully. ${errorCount} had issues - check the console for details.`);
//         console.warn('Some errors occurred:', errors);
//       } else {
//         showToastMessage(`Oops! Couldn't process any of the selected images. Please try again or contact support.`);
//         console.error('All errors:', errors);
//       }

//     } catch (error) {
//       console.error('Error processing selected images:', error);
//       showToastMessage(`Something went wrong while processing your images: ${error.message}`);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Handle alt text change - only update local state
//   const handleAltTextChange = (id, value) => {
//     onAltTextChange(id, value);
//   };

//   // Get filter description text
//   const getFilterDescription = () => {
//     switch(filterType) {
//       case 'empty':
//         return 'Images with no alt text';
//       case 'bad':
//         return 'Images with alt text less than 10 characters';
//       case 'good':
//         return 'Images with good alt text (10+ characters)';
//       default:
//         return 'All images';
//     }
//   };

//   return (
//     <Frame>
//       <Page title={`Alt Text Dashboard - ${filterType?.charAt(0).toUpperCase() + filterType?.slice(1) || 'All'} Images`}>
//         <Card>
//           {loading && <Loading />}
          
//           {/* Show current filter info */}
//           {filterType && filterType !== 'all' && (
//             <div style={{ 
//               marginBottom: 16, 
//               padding: 12, 
//               backgroundColor: '#f6f6f7', 
//               borderRadius: 4,
//               border: '1px solid #e1e3e5'
//             }}>
//               <p style={{ margin: 0, fontSize: 14, color: '#202223' }}>
//                 <strong>Current Filter:</strong> {getFilterDescription()}
//               </p>
//             </div>
//           )}
          
//           <IndexTable
//             resourceName={{ singular: 'image', plural: 'images' }}
//             itemCount={initialImages.length}
//             selectedItemsCount={
//               allResourcesSelected ? 'All' : selectedResources.length
//             }
//             allResourcesSelected={allResourcesSelected}
//             onSelectionChange={handleSelectionChange}
//             headings={[
//               { title: 'ID' },
//               { title: 'Image' },
//               { title: 'Type' },
//               { title: 'Alt Text' },
//               { title: 'Quality' }, // New column for quality indicator
//               { title: 'Processed On' },
//               { title: 'Actions' },
//             ]}
//           >
//             {initialImages.map(({ id, image, type, altText, processedOn, productId, shopifyImageId, originalId }, index) => (
//               <IndexTable.Row
//                 id={id.toString()}
//                 key={id}
//                 selected={selectedResources.includes(id)}
//                 position={index}
//               >
//                 <IndexTable.Cell>{id}</IndexTable.Cell>

//                 <IndexTable.Cell>
//                   <div onClick={(e) => e.stopPropagation()}>
//                     <Thumbnail source={image} alt={`Image ${id}`} size="medium" />
//                   </div>
//                 </IndexTable.Cell>

//                 <IndexTable.Cell>
//                   <div onClick={(e) => e.stopPropagation()}>
//                     <Badge status="info">{type}</Badge>
//                   </div>
//                 </IndexTable.Cell>

//                 <IndexTable.Cell>
//                   <div onClick={(e) => e.stopPropagation()}>
//                     <TextField
//                       value={altText || ''}
//                       autoComplete="off"
//                       onChange={(value) => handleAltTextChange(id, value)}
//                       placeholder="Alt text will appear here after generation..."
//                       error={altText && altText.length > 512 ? 'Alt text must be 512 characters or less' : undefined}
//                     />
//                   </div>
//                 </IndexTable.Cell>

//                 {/* New Quality Column */}
//                 <IndexTable.Cell>
//                   <div onClick={(e) => e.stopPropagation()}>
//                     {getAltTextQualityBadge(altText)}
//                   </div>
//                 </IndexTable.Cell>

//                 <IndexTable.Cell>
//                   <div onClick={(e) => e.stopPropagation()}>{processedOn || 'Not processed'}</div>
//                 </IndexTable.Cell>

//                 <IndexTable.Cell>
//                   <div onClick={(e) => e.stopPropagation()}>
//                     {/* Single Generate button that does everything */}
//                     <Button
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         handleGenerateAndSave(id);
//                       }}
//                       variant="primary"
//                       size="slim"
//                       loading={loadingStates[id]}
//                       disabled={loadingStates[id]}
//                     >
//                       {loadingStates[id] ? 'Working...' : 'Generate'}
//                     </Button>
//                   </div>
//                 </IndexTable.Cell>
//               </IndexTable.Row>
//             ))}
//           </IndexTable>

//           <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//             <div>
//               <Button
//                 onClick={handleGenerateSelectedImages}
//                 disabled={selectedResources.length === 0 || loading}
//                 variant="primary"
//                 loading={loading}
//               >
//                 {loading ? 'Processing...' : `Generate for Selected (${selectedResources.length})`}
//               </Button>
//             </div>

//             <div style={{ fontSize: '14px', color: '#6D7175' }}>
//               {selectedResources.length > 0 && `${selectedResources.length} selected`}
//               {initialImages.length > 0 && ` • ${initialImages.length} total images`}
//             </div>
//           </div>
//         </Card>

//         {showToast && (
//           <Toast
//             content={toastMessage}
//             onDismiss={() => setShowToast(false)}
//             duration={5000}
//           />
//         )}
//       </Page>
//     </Frame>
//   );
// }


import {
  Page,
  Card,
  Button,
  Thumbnail,
  TextField,
  IndexTable,
  useIndexResourceState,
  Badge,
  Toast,
  Frame,
  Loading,
} from '@shopify/polaris';
import { useState } from 'react';
import { localStorage } from "../utils/shopifyApi"; // Import localStorage utility

export default function AltTextDashboard({
  initialImages,
  onAltTextChange,
  onAltTextGenerated,
  filterType,
}) {
  const [loading, setLoading] = useState(false);
  const [loadingStates, setLoadingStates] = useState({});
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
  } = useIndexResourceState(initialImages);

  const showToastMessage = (message) => {
    setToastMessage(message);
    setShowToast(true);
  };

  const setItemLoading = (id, isLoading) => {
    setLoadingStates(prev => ({
      ...prev,
      [id]: isLoading
    }));
  };

  const getAltTextQualityBadge = (altText) => {
    if (!altText || altText.trim() === '') {
      return <Badge status="critical">Empty</Badge>;
    }
    if (altText.trim().length < 10) {
      return <Badge status="warning">Bad ({altText.trim().length} chars)</Badge>;
    }
    return <Badge status="success">Good ({altText.trim().length} chars)</Badge>;
  };

  // Updated handleGenerateAndSave with localStorage credentials
const handleGenerateAndSave = async (id) => {
  const imageToUpdate = initialImages.find((img) => img.id === id);
  if (!imageToUpdate) return;
  
  setItemLoading(id, true);
  try {
    // Get credentials from localStorage
    const apiKey = localStorage.getApiKey();
    const userId = localStorage.getUserId();
    // Check if credentials exist
    if (!apiKey || !userId) {
      throw new Error('Please log in to use alt text generation');
    }
    // Step 1: Generate alt text
    console.log('Starting generation for image:', id);
    const response = await fetch(imageToUpdate.image);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    
    const blob = await response.blob();
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const res = await fetch('/api/generate-alt-text', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        imageBase64: base64,
        type: imageToUpdate.type,
        apiKey: apiKey,    // Add API key from localStorage
        userId: userId     // Add user ID from localStorage
      }),
    });
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Generate alt text error response:', errorText);
      throw new Error(`Generation failed: ${res.status}`);
    }
    const data = await res.json();
    if (!data.altText) {
      throw new Error('No alt text returned from generation service');
    }
    console.log('Alt text generated:', data.altText);
    onAltTextGenerated(id, data.altText);
    
    // Step 2: Automatically save the generated alt text
    console.log('Auto-saving generated alt text for image:', id);
    const updatedImage = { ...imageToUpdate, altText: data.altText };
    
    // Image type detection and save logic
    const isPageImage = updatedImage.id.includes('gid://shopify/Page/') || updatedImage.type === 'page';
    const isBlogImage = updatedImage.type === 'blog' || updatedImage.blogId;
    const isProductImage = updatedImage.productId || updatedImage.type === 'product';
    let requestData;
    let apiEndpoint;
    
    if (isBlogImage) {
      const isFeaturedImage = 
        updatedImage.imageType === "featured" || 
        updatedImage.isFeaturedImage === true || 
        updatedImage.id.includes('_featured') ||
        updatedImage.featuredImageData?.isArticleFeaturedImage;
      const isInlineImage = 
        updatedImage.imageType === "inline" || 
        updatedImage.isFeaturedImage === false || 
        updatedImage.id.includes('*html*') ||
        updatedImage.inlineImageData?.isInlineImage;
      if (!isFeaturedImage && !isInlineImage) {
        throw new Error(`Unable to determine blog image type for ${updatedImage.id}`);
      }
      if (isFeaturedImage && isInlineImage) {
        throw new Error(`Conflicting image type detection for ${updatedImage.id}`);
      }
      requestData = {
        imageId: updatedImage.image,
        altText: data.altText.trim(),
        blogId: updatedImage.blogId,
        articleId: updatedImage.articleId,
        shopDomain: "empowered-equity-dev.myshopify.com",
        imageType: isFeaturedImage ? "featured" : "inline",
        blogTitle: updatedImage.blogTitle,
        articleTitle: updatedImage.articleTitle,
        originalImageType: updatedImage.imageType,
        debugInfo: {
          originalId: updatedImage.id,
          detectionMethod: isFeaturedImage ? 'featured_image_detection' : 'inline_image_detection',
          confidence: 'high'
        }
      };
      apiEndpoint = '/api/update-blog-alt-text';
    } else if (isPageImage) {
      // Fixed regex pattern to properly extract page ID and image index
      const pageIdMatch = updatedImage.id.match(/gid:\/\/shopify\/Page\/(\d+)_img_(\d+)/);
      if (!pageIdMatch) {
        throw new Error(`Invalid page image ID format: ${updatedImage.id}`);
      }
      const pageId = pageIdMatch[1];
      const imageIndex = pageIdMatch[1];
      
      console.log('Page image debug:', {
        originalId: updatedImage.id,
        extractedPageId: pageId,
        imageIndex: imageIndex,
        imageUrl: updatedImage.image
      });
      
      requestData = {
        imageId: updatedImage.image, // Use the actual image URL, not the GID
        altText: data.altText.trim(),
        pageId: pageId,
        shopDomain: "empowered-equity-dev.myshopify.com"
      };
      apiEndpoint = '/api/update-page-alt-text';
    } else if (isProductImage) {
      requestData = {
        altText: data.altText.trim(),
        imageId: updatedImage.shopifyImageId || updatedImage.originalId || updatedImage.id,
        productId: updatedImage.productId
      };
      apiEndpoint = '/api/update-alt-text';
    } else {
      throw new Error(`Unsupported image type: ${updatedImage.type || 'unknown'} for image ${updatedImage.id}`);
    }
    
    console.log('Using API endpoint:', apiEndpoint);
    console.log('Request data:', requestData);
    
    // Make the save API request
    const saveResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    const contentType = saveResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await saveResponse.text();
      console.error('Non-JSON response received during auto-save:', textResponse);
      throw new Error(`Save failed: Invalid response format`);
    }
    
    const saveResult = await saveResponse.json();
    if (!saveResponse.ok) {
      console.error('Auto-save response not OK:', saveResult);
      throw new Error(saveResult.details || saveResult.error || `Server error: ${saveResponse.status}`);
    }
    
    if (saveResult.success) {
      let imageTypeText = 'unknown';
      let featuredText = '';
      
      if (isPageImage) {
        imageTypeText = 'page';
      } else if (isBlogImage) {
        imageTypeText = 'blog';
        if (requestData.imageType === 'featured') {
          featuredText = ' featured';
        } else {
          featuredText = ' inline';
        }
      } else if (isProductImage) {
        imageTypeText = 'product';
      }
      showToastMessage(`Great! Alt text created and saved for your ${imageTypeText}${featuredText} image.`);
      console.log('Success: Alt text generated and saved for image:', id);
    } else {
      throw new Error('Save operation failed - success flag is false');
    }
  } catch (error) {
    console.error('Error during generate and save:', error);
    
    // Enhanced error messages including authentication
    if (error.message.includes('Please log in to use alt text generation')) {
      showToastMessage('Please log in to your account to generate alt text.');
    } else if (error.message.includes('Generation failed')) {
      showToastMessage('Sorry, our AI service is temporarily unavailable. Please try again.');
    } else if (error.message.includes('Save failed')) {
      showToastMessage('Alt text was created but couldn\'t be saved to Shopify. Please try again.');
    } else if (error.message.includes('Unable to determine blog image type')) {
      showToastMessage('We couldn\'t identify this image type. Please contact support.');
    } else if (error.message.includes('fetch')) {
      showToastMessage('Network connection issue. Please check your internet and try again.');
    } else {
      showToastMessage(`Something went wrong: ${error.message}`);
    }
  } finally {
    setItemLoading(id, false);
  }
};


  // Bulk generate and save for selected images (also updated)
  const handleGenerateSelectedImages = async () => {
    if (selectedResources.length === 0) return;

    // Check credentials upfront
    const apiKey = localStorage.getApiKey();
    const userId = localStorage.getUserId();

    if (!apiKey || !userId) {
      showToastMessage('Please log in to your account to generate alt text.');
      return;
    }

    setLoading(true);
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    try {
      // Process images one by one to avoid overwhelming the API
      for (const id of selectedResources) {
        const imageToUpdate = initialImages.find((img) => img.id === id);
        if (!imageToUpdate) {
          errorCount++;
          errors.push(`Image ${id}: Not found`);
          continue;
        }

        setItemLoading(id, true);
        try {
          // Step 1: Generate alt text
          const response = await fetch(imageToUpdate.image);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`);
          }

          const blob = await response.blob();
          const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const res = await fetch('/api/generate-alt-text', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              imageBase64: base64,
              type: imageToUpdate.type,
              apiKey: apiKey,    // Add API key from localStorage
              userId: userId     // Add user ID from localStorage
            }),
          });

          if (!res.ok) {
            throw new Error(`Generation failed: ${res.status}`);
          }

          const data = await res.json();
          if (!data.altText) {
            throw new Error('No alt text returned');
          }

          // Update local state
          onAltTextGenerated(id, data.altText);

          // Step 2: Auto-save (same logic as single image)
          const updatedImage = { ...imageToUpdate, altText: data.altText };
          
          let requestData;
          let apiEndpoint;
          const isPageImage = updatedImage.id.includes('gid://shopify/Page/') || updatedImage.type === 'page';
          const isBlogImage = updatedImage.type === 'blog' || updatedImage.blogId;
          const isProductImage = updatedImage.productId || updatedImage.type === 'product';

          if (isBlogImage) {
            const isFeaturedImage = 
              updatedImage.imageType === "featured" || 
              updatedImage.isFeaturedImage === true || 
              updatedImage.id.includes('_featured') ||
              updatedImage.featuredImageData?.isArticleFeaturedImage;
            const isInlineImage = 
              updatedImage.imageType === "inline" || 
              updatedImage.isFeaturedImage === false || 
              updatedImage.id.includes('*html*') ||
              updatedImage.inlineImageData?.isInlineImage;

            if (!isFeaturedImage && !isInlineImage) {
              throw new Error(`Unable to determine blog image type for ${updatedImage.id}`);
            }

            requestData = {
              imageId: updatedImage.image,
              altText: data.altText.trim(),
              blogId: updatedImage.blogId,
              articleId: updatedImage.articleId,
              shopDomain: "empowered-equity-dev.myshopify.com",
              imageType: isFeaturedImage ? "featured" : "inline",
              blogTitle: updatedImage.blogTitle,
              articleTitle: updatedImage.articleTitle,
              originalImageType: updatedImage.imageType
            };
            apiEndpoint = '/api/update-blog-alt-text';
          } else if (isPageImage) {
            const pageIdMatch = updatedImage.id.match(/gid:\/\/shopify\/Page\/(\d+)*img*/);
            if (!pageIdMatch) {
              throw new Error(`Invalid page image ID format: ${updatedImage.id}`);
            }
            const pageId = pageIdMatch[1];
            requestData = {
              imageId: updatedImage.image,
              altText: data.altText.trim(),
              pageId: pageId,
              shopDomain: "empowered-equity-dev.myshopify.com"
            };
            apiEndpoint = '/api/update-page-alt-text';
          } else if (isProductImage) {
            requestData = {
              altText: data.altText.trim(),
              imageId: updatedImage.shopifyImageId || updatedImage.originalId || updatedImage.id,
              productId: updatedImage.productId
            };
            apiEndpoint = '/api/update-alt-text';
          } else {
            throw new Error(`Unsupported image type: ${updatedImage.type || 'unknown'}`);
          }

          const saveResponse = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(requestData)
          });

          const saveResult = await saveResponse.json();
          if (!saveResponse.ok || !saveResult.success) {
            throw new Error(saveResult.details || saveResult.error || 'Failed to save generated alt text');
          }

          successCount++;
        } catch (error) {
          console.error(`Error processing image ${id}:`, error);
          errors.push(`Image ${id}: ${error.message}`);
          errorCount++;
        } finally {
          setItemLoading(id, false);
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Show summary message
      if (successCount > 0 && errorCount === 0) {
        showToastMessage(`Perfect! Generated and saved alt text for all ${successCount} images.`);
      } else if (successCount > 0 && errorCount > 0) {
        showToastMessage(`Done! Generated ${successCount} alt texts successfully. ${errorCount} had issues - check the console for details.`);
        console.warn('Some errors occurred:', errors);
      } else {
        showToastMessage(`Oops! Couldn't process any of the selected images. Please try again or contact support.`);
        console.error('All errors:', errors);
      }
    } catch (error) {
      console.error('Error processing selected images:', error);
      showToastMessage(`Something went wrong while processing your images: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAltTextChange = (id, value) => {
    onAltTextChange(id, value);
  };

  const getFilterDescription = () => {
    switch(filterType) {
      case 'empty':
        return 'Images with no alt text';
      case 'bad':
        return 'Images with alt text less than 10 characters';
      case 'good':
        return 'Images with good alt text (10+ characters)';
      default:
        return 'All images';
    }
  };

  return (
    <div>
     
        <Card>
          {loading && <Loading />}
          
          {/* {filterType && filterType !== 'all' && (
            <div style={{ 
              marginBottom: 16, 
              padding: 12, 
              backgroundColor: '#f6f6f7', 
              borderRadius: 4,
              border: '1px solid #e1e3e5'
            }}>
              <p style={{ margin: 0, fontSize: 14, color: '#202223' }}>
                <strong>Current Filter:</strong> {getFilterDescription()}
              </p>
            </div>
          )} */}
          
          <IndexTable
            resourceName={{ singular: 'image', plural: 'images' }}
            itemCount={initialImages.length}
            selectedItemsCount={
              allResourcesSelected ? 'All' : selectedResources.length
            }
            allResourcesSelected={allResourcesSelected}
            onSelectionChange={handleSelectionChange}
            headings={[
              { title: 'ID' },
              { title: 'Image' },
              { title: 'Type' },
              { title: 'Alt Text' },
              { title: 'Quality' },
              { title: 'Processed On' },
              { title: 'Actions' },
            ]}
          >
            {initialImages.map(({ id, image, type, altText, processedOn, productId, shopifyImageId, originalId }, index) => (
              <IndexTable.Row
                id={id.toString()}
                key={id}
                selected={selectedResources.includes(id)}
                position={index}
              >
                <IndexTable.Cell>{id}</IndexTable.Cell>
                <IndexTable.Cell>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Thumbnail source={image} alt={`Image ${id}`} size="medium" />
                  </div>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Badge status="info">{type}</Badge>
                  </div>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <div onClick={(e) => e.stopPropagation()}>
                    <TextField
                      value={altText || ''}
                      autoComplete="off"
                      onChange={(value) => handleAltTextChange(id, value)}
                      placeholder="Alt text will appear here after generation..."
                      error={altText && altText.length > 512 ? 'Alt text must be 512 characters or less' : undefined}
                    />
                  </div>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <div onClick={(e) => e.stopPropagation()}>
                    {getAltTextQualityBadge(altText)}
                  </div>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <div onClick={(e) => e.stopPropagation()}>{processedOn || 'Not processed'}</div>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateAndSave(id);
                      }}
                      variant="primary"
                      size="slim"
                      loading={loadingStates[id]}
                      disabled={loadingStates[id]}
                    >
                      {loadingStates[id] ? 'Working...' : 'Generate'}
                    </Button>
                  </div>
                </IndexTable.Cell>
              </IndexTable.Row>
            ))}
          </IndexTable>
          
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Button
                onClick={handleGenerateSelectedImages}
                disabled={selectedResources.length === 0 || loading}
                variant="primary"
                loading={loading}
              >
                {loading ? 'Processing...' : `Generate for Selected (${selectedResources.length})`}
              </Button>
            </div>
            <div style={{ fontSize: '14px', color: '#6D7175' }}>
              {selectedResources.length > 0 && `${selectedResources.length} selected`}
              {initialImages.length > 0 && ` • ${initialImages.length} total images`}
            </div>
          </div>
        </Card>
        
        {showToast && (
          <Toast
            content={toastMessage}
            onDismiss={() => setShowToast(false)}
            duration={5000}
          />
        )}
     
    </div>
  );
}
