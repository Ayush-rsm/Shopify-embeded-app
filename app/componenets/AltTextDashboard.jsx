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
import { useState, useEffect } from 'react';
import { localStorage } from "../utils/shopifyApi";

export default function AltTextDashboard({
  initialImages,
  onAltTextChange,
  onAltTextGenerated,
  filterType,
  onStatusFilterChange,
  currentStatusFilter,
  getImageStatus, // ✅ Accept the function as a prop
}) {
  const [loading, setLoading] = useState(false);
  const [loadingStates, setLoadingStates] = useState({});
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [shopDomain, setShopDomain] = useState('');
  const [statusFilter, setStatusFilter] = useState(currentStatusFilter || 'all');

  // ✅ Remove the local getImageStatus function and use the passed one

  // ✅ Update the filter logic to use the passed function
  const filteredImages = initialImages.filter(imageObj => {
    if (statusFilter === 'all') return true;
    const imageStatus = getImageStatus(imageObj); // Use the passed function
    return imageStatus === statusFilter;
  });

  // ✅ Update status counts calculation
  const statusCounts = {
    all: initialImages.length,
    active: initialImages.filter(img => getImageStatus(img) === 'active').length,
    draft: initialImages.filter(img => getImageStatus(img) === 'draft').length,
    archived: initialImages.filter(img => getImageStatus(img) === 'archived').length,
  };

  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
  } = useIndexResourceState(filteredImages);

  // Sync with parent status filter
  useEffect(() => {
    if (currentStatusFilter !== statusFilter) {
      setStatusFilter(currentStatusFilter || 'all');
    }
  }, [currentStatusFilter]);

  // Get shop domain from localStorage
  useEffect(() => {
    const getShopDomainFromStorage = () => {
      try {
        if (typeof window !== 'undefined') {
          const shopInfoStr = window.localStorage.getItem('altMagic_shopInfo');
          if (shopInfoStr) {
            const shopInfo = JSON.parse(shopInfoStr);
            if (shopInfo && shopInfo.shop) {
              console.log('🏪 Shop domain from localStorage:', shopInfo.shop);
              return shopInfo.shop;
            }
          }
        }
        console.warn('Could not find shop domain in altMagic_shopInfo');
        return '';
      } catch (error) {
        console.error('Error reading shop domain from localStorage:', error);
        return '';
      }
    };
    const domain = getShopDomainFromStorage();
    setShopDomain(domain);
  }, []);

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

  // Helper function to extract numeric ID from various ID formats
  const getNumericId = (id) => {
    if (typeof id === 'string') {
      const gidMatch = id.match(/gid:\/\/shopify\/\w+\/(\d+)/);
      if (gidMatch) {
        return gidMatch[1];
      }
      const pageMatch = id.match(/gid:\/\/shopify\/Page\/(\d+)_img_(\d+)/);
      if (pageMatch) {
        return `${pageMatch[1]}_${pageMatch[2]}`;
      }
      const featuredMatch = id.match(/(\d+)_featured/);
      if (featuredMatch) {
        return featuredMatch[1];
      }
      const inlineMatch = id.match(/(\d+)*html*(\d+)/);
      if (inlineMatch) {
        return `${inlineMatch[1]}_${inlineMatch[2]}`;
      }
      const numberMatch = id.match(/(\d+)/);
      if (numberMatch) {
        return numberMatch[1];
      }
    }
    return id;
  };

  // Handle status filter change
  const handleStatusFilterChange = (newFilter) => {
    setStatusFilter(newFilter);
    if (onStatusFilterChange) {
      onStatusFilterChange(newFilter);
    }
  };

  // Generate and save function
  const handleGenerateAndSave = async (id) => {
    const imageToUpdate = filteredImages.find((img) => img.id === id);
    if (!imageToUpdate) return;

    setItemLoading(id, true);
    try {
      // Get credentials from localStorage
      const apiKey = localStorage.getApiKey();
      const userId = localStorage.getUserId();
      
      if (!apiKey || !userId) {
        throw new Error('Please log in to use alt text generation');
      }

      // Get AI settings including language, prefix, and suffix from localStorage
      let language = 'english';
      let textPrefix = '';
      let textSuffix = '';
      let postContext = false;
      
      try {
        if (typeof window !== 'undefined') {
          const saved = window.localStorage.getItem('altMagic_formState');
          if (saved) {
            const aiSettings = JSON.parse(saved);
            language = aiSettings.language || 'english';
            textPrefix = aiSettings.textPrefix || '';
            textSuffix = aiSettings.textSuffix || '';
            postContext = aiSettings.postContext || false;
            
            console.log('📱 Retrieved from localStorage:', {
              language: language,
              textPrefix: textPrefix,
              textSuffix: textSuffix,
              postContext: postContext,
              shopDomain: shopDomain
            });
          }
        }
      } catch (error) {
        console.warn('Could not load AI settings:', error);
      }

      // Fetch image and convert to base64
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

      // Send generation request
      const res = await fetch('/api/generate-alt-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          imageBase64: base64,
          type: imageToUpdate.type,
          apiKey: apiKey,
          userId: userId,
          productTitle: imageToUpdate.productTitle || imageToUpdate.title || '',
          language: language,
          textPrefix: textPrefix,
          textSuffix: textSuffix,
          postContext: postContext
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

      console.log('🎉 Alt text generated:', data.altText);
      onAltTextGenerated(id, data.altText);

      // Save logic with shop domain from localStorage
      console.log('Auto-saving generated alt text for image:', id);
      const updatedImage = { ...imageToUpdate, altText: data.altText };
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
          shopDomain: shopDomain,
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
        const pageIdMatch = updatedImage.id.match(/gid:\/\/shopify\/Page\/(\d+)_img_(\d+)/);
        if (!pageIdMatch) {
          throw new Error(`Invalid page image ID format: ${updatedImage.id}`);
        }
        const pageId = pageIdMatch[1];
        requestData = {
          imageId: updatedImage.image,
          altText: data.altText.trim(),
          pageId: pageId,
          shopDomain: shopDomain
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

// Bulk generate and save function
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
      const imageToUpdate = filteredImages.find((img) => img.id === id);
      if (!imageToUpdate) {
        errorCount++;
        errors.push(`Image ${id}: Not found`);
        continue;
      }

      setItemLoading(id, true);
      try {
        // Get AI settings from localStorage (same as handleGenerateAndSave)
        let language = 'english';
        let textPrefix = '';
        let textSuffix = '';
        let postContext = false;
        
        try {
          if (typeof window !== 'undefined') {
            const saved = window.localStorage.getItem('altMagic_formState');
            if (saved) {
              const aiSettings = JSON.parse(saved);
              language = aiSettings.language || 'english';
              textPrefix = aiSettings.textPrefix || '';
              textSuffix = aiSettings.textSuffix || '';
              postContext = aiSettings.postContext || false;
              
              console.log('📱 Retrieved from localStorage for bulk:', {
                language: language,
                textPrefix: textPrefix,
                textSuffix: textSuffix,
                postContext: postContext,
                shopDomain: shopDomain
              });
            }
          }
        } catch (error) {
          console.warn('Could not load AI settings:', error);
        }

        // Generate alt text
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
            apiKey: apiKey,
            userId: userId,
            productTitle: imageToUpdate.productTitle || imageToUpdate.title || '',
            language: language,
            textPrefix: textPrefix,
            textSuffix: textSuffix,
            postContext: postContext
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

        console.log('🎉 Alt text generated for bulk:', data.altText);
        onAltTextGenerated(id, data.altText);

        // AUTO-SAVE LOGIC (same as handleGenerateAndSave)
        console.log('Auto-saving generated alt text for bulk image:', id);
        const updatedImage = { ...imageToUpdate, altText: data.altText };
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
            shopDomain: shopDomain,
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
          const pageIdMatch = updatedImage.id.match(/gid:\/\/shopify\/Page\/(\d+)_img_(\d+)/);
          if (!pageIdMatch) {
            throw new Error(`Invalid page image ID format: ${updatedImage.id}`);
          }
          const pageId = pageIdMatch[1];
          requestData = {
            imageId: updatedImage.image,
            altText: data.altText.trim(),
            pageId: pageId,
            shopDomain: shopDomain
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
          console.error('Non-JSON response received during bulk auto-save:', textResponse);
          throw new Error(`Save failed: Invalid response format`);
        }

        const saveResult = await saveResponse.json();
        if (!saveResponse.ok) {
          console.error('Bulk auto-save response not OK:', saveResult);
          throw new Error(saveResult.details || saveResult.error || `Server error: ${saveResponse.status}`);
        }

        if (saveResult.success) {
          successCount++;
          console.log('Success: Alt text generated and saved for bulk image:', id);
        } else {
          throw new Error('Save operation failed - success flag is false');
        }

      } catch (error) {
        console.error(`Error processing image ${id}:`, error);
        let errorMessage = error.message;
        if (error.message.includes('Please log in to use alt text generation')) {
          errorMessage = 'Authentication required';
        } else if (error.message.includes('Generation failed')) {
          errorMessage = 'AI service unavailable';
        } else if (error.message.includes('Save failed')) {
          errorMessage = 'Could not save to Shopify';
        } else if (error.message.includes('Unable to determine blog image type')) {
          errorMessage = 'Unknown image type';
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Network connection issue';
        }
        errors.push(`Image ${getNumericId(id)}: ${errorMessage}`);
        errorCount++;
      } finally {
        setItemLoading(id, false);
      }

      // Small delay between requests to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Show summary message
    if (successCount > 0 && errorCount === 0) {
      showToastMessage(`Great! Alt text created and saved for all ${successCount} selected images.`);
    } else if (successCount > 0 && errorCount > 0) {
      showToastMessage(`Partial success! Generated and saved ${successCount} alt texts. ${errorCount} images had issues - check console for details.`);
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

  return (
    <Frame>
      <div>
        <Card>
          {loading && <Loading />}

          {/* Top section with filters and bulk actions */}
          <div style={{
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 16
          }}>
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
          </div>

          <IndexTable
            resourceName={{ singular: 'image', plural: 'images' }}
            itemCount={filteredImages.length}
            selectedItemsCount={
              allResourcesSelected ? 'All' : selectedResources.length
            }
            allResourcesSelected={allResourcesSelected}
            onSelectionChange={handleSelectionChange}
            headings={[
               { title: 'ID' },
              { title: 'Image' },
              { title: 'Type' },
              { title: 'Status' },
              { title: 'Alt Text' },
              { title: 'Actions' },
            ]}
          >
            {/* ✅ Use the passed getImageStatus function consistently */}
            {filteredImages.map((imageObj, index) => {
              const imageStatus = getImageStatus(imageObj); // Use the passed function
              console.log(`🔍 Rendering row for ${imageObj.id}: status="${imageStatus}"`);
              
              return (
                <IndexTable.Row
                  id={imageObj.id.toString()}
                  key={imageObj.id}
                  selected={selectedResources.includes(imageObj.id)}
                  position={index}
                >
                   <IndexTable.Cell>{getNumericId(imageObj.id)}</IndexTable.Cell>
                  <IndexTable.Cell>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Thumbnail source={imageObj.image} alt={`Image ${imageObj.id}`} size="large" />
                    </div>
                  </IndexTable.Cell>
                 
                  <IndexTable.Cell>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Badge status="info">{imageObj.type}</Badge>
                    </div>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <div onClick={(e) => e.stopPropagation()}>
                      {/* ✅ Use the passed function for consistent status display */}
                      <Badge status={
                        imageStatus === 'active' ? 'success' : 
                        imageStatus === 'draft' ? 'attention' : 
                        'critical'
                      }>
                        {imageStatus.charAt(0).toUpperCase() + imageStatus.slice(1)}
                      </Badge>
                    </div>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <div onClick={(e) => e.stopPropagation()}>
                      <TextField
                        value={imageObj.altText || ''}
                        autoComplete="off"
                        onChange={(value) => handleAltTextChange(imageObj.id, value)}
                        placeholder="Alt text will appear here after generation..."
                        error={imageObj.altText && imageObj.altText.length > 512 ? 'Alt text must be 512 characters or less' : undefined}
                      />
                    </div>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateAndSave(imageObj.id);
                        }}
                        variant="primary"
                        size="slim"
                        loading={loadingStates[imageObj.id]}
                        disabled={loadingStates[imageObj.id]}
                      >
                        {loadingStates[imageObj.id] ? 'Working...' : 'Generate'}
                      </Button>
                    </div>
                  </IndexTable.Cell>
                </IndexTable.Row>
              );
            })}
          </IndexTable>

          {/* Bottom summary info */}
          <div style={{
            marginTop: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <div style={{ fontSize: '14px', color: '#6D7175' }}>
              Showing {filteredImages.length} of {initialImages.length} images
              {statusFilter !== 'all' && ` • Filtered by: ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`}
            </div>
            <div style={{ fontSize: '14px', color: '#6D7175' }}>
              {selectedResources.length > 0 && `${selectedResources.length} selected`}
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
    </Frame>
  );
}
