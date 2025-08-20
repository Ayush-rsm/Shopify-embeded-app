import { useState, useEffect, useCallback } from "react";
import { LegacyCard, Tabs, Spinner } from '@shopify/polaris';
import AltTextDashboard from "../componenets/AltTextDashboard";

const IMAGE_TYPE_ENDPOINTS = {
  product: "/api/productImages",
  blog: "/api/blogImages",
  article: "/api/articleImages",
  all: "/api/allImages",
};

export default function BulkGeneration() {
  const [imageType, setImageType] = useState("all");
  const [altTextFilter, setAltTextFilter] = useState("all");
  const [selected, setSelected] = useState(0);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Function to categorize alt text quality
  const categorizeAltText = (altText) => {
    if (!altText || altText.trim() === '') {
      return 'empty';
    }
    if (altText.trim().length < 10) {
      return 'bad';
    }
    return 'good';
  };

  // Filter images based on alt text quality
  const getFilteredImages = () => {
    if (altTextFilter === 'all') {
      return images;
    }
    
    return images.filter(img => {
      const category = categorizeAltText(img.altText);
      return category === altTextFilter;
    });
  };

  // Simplified fetch function
  const fetchImages = async () => {
    setLoading(true);

    try {
      const url = IMAGE_TYPE_ENDPOINTS[imageType];
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch images: ${res.status}`);
      }
      
      const data = await res.json();

      const newImages = (data.images || []).map(img => ({
        ...img,
        sourceType: imageType === 'all' ? img.sourceType : imageType
      }));
      
      setImages(newImages);

    } catch (error) {
      console.error('Error fetching images:', error);
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch images when imageType changes
  useEffect(() => {
    fetchImages();
  }, [imageType]);

  // Handler to update altText for an image
  const handleAltTextChange = (id, newText) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === id ? { ...img, altText: newText } : img
      )
    );
  };

  // Handler to update processedOn after generation
  const handleAltTextGenerated = (id, generatedText) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === id
          ? {
              ...img,
              altText: generatedText,
              processedOn: new Date().toLocaleString(),
            }
          : img
      )
    );
  };

  // Get counts for each filter category
  const getCounts = () => {
    const counts = {
      all: images.length,
      empty: 0,
      bad: 0,
      good: 0
    };

    images.forEach(img => {
      const category = categorizeAltText(img.altText);
      counts[category]++;
    });

    return counts;
  };

  const counts = getCounts();
  const filteredImages = getFilteredImages();

  // Handle tab change
  const handleTabChange = useCallback((selectedTabIndex) => {
    setSelected(selectedTabIndex);
    const filterTypes = ['all', 'empty', 'bad', 'good'];
    setAltTextFilter(filterTypes[selectedTabIndex]);
  }, []);

  // Tab configuration with badges
  const tabs = [
    {
      id: 'all-images-tab',
      content: 'All Images',
      badge: counts.all > 99 ? '99+' : counts.all.toString(),
      accessibilityLabel: 'All images',
      panelID: 'all-images-panel',
    },
    {
      id: 'empty-alt-tab',
      content: 'Empty Alt Text',
      badge: counts.empty > 99 ? '99+' : counts.empty.toString(),
      accessibilityLabel: 'Images with empty alt text',
      panelID: 'empty-alt-panel',
    },
    {
      id: 'bad-alt-tab',
      content: 'Bad Alt Text',
      badge: counts.bad > 99 ? '99+' : counts.bad.toString(),
      accessibilityLabel: 'Images with bad alt text',
      panelID: 'bad-alt-panel',
    },
    {
      id: 'good-alt-tab',
      content: 'Good Alt Text',
      badge: counts.good > 99 ? '99+' : counts.good.toString(),
      accessibilityLabel: 'Images with good alt text',
      panelID: 'good-alt-panel',
    },
  ];

  return (
    <div style={{ padding: '24px', backgroundColor: '#f6f6f7', minHeight: '100vh' }}>
      {/* Header Section */}
    

      {/* Image Type Filter */}
      <LegacyCard sectioned>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: '500', color: '#202223' }}>Filter by:</span>
            <select
              value={imageType}
              onChange={(e) => setImageType(e.target.value)}
              style={{ 
                padding: '8px 12px',
                border: '1px solid #c9cccf',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Images</option>
              <option value="product">Product Images</option>
              <option value="blog">Blog Images</option>
              <option value="article">Article Images</option>
            </select>
          </div>
          
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Spinner size="small" />
              <span style={{ fontSize: '14px', color: '#6d7175' }}>Loading images...</span>
            </div>
          )}
        </div>
      </LegacyCard>

      {/* Main Content with Tabs */}
      <LegacyCard>
        <Tabs tabs={tabs} selected={selected} onSelect={handleTabChange} fitted>
          <LegacyCard.Section   >
            {/* Dashboard Component */}
            <AltTextDashboard
              initialImages={filteredImages}
              onAltTextChange={handleAltTextChange}
              onAltTextGenerated={handleAltTextGenerated}
              filterType={altTextFilter}
            />
          </LegacyCard.Section>
        </Tabs>
      </LegacyCard>
    </div>
  );
}
