import { useState, useEffect, useCallback, useMemo } from "react";
import {
  LegacyCard,
  Tabs,
  Spinner,
  Filters,
  ChoiceList
} from '@shopify/polaris';
import AltTextDashboard from "../componenets/AltTextDashboard";

const IMAGE_TYPE_ENDPOINTS = {
  product: "/api/productImages",
  blog: "/api/blogImages",
  article: "/api/articleImages",
  all: "/api/allImages",
};

export default function BulkGeneration() {
  const [imageType, setImageType] = useState("all");
  const [altTextFilter, setAltTextFilter] = useState("empty"); // ✅ Changed default from "all" to "empty"
  const [selected, setSelected] = useState(0); // ✅ This will now point to "Empty Alt Text" tab
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filter states for Polaris Filters component
  const [queryValue, setQueryValue] = useState('');
  const [imageTypeFilters, setImageTypeFilters] = useState([]);
  const [statusFilters, setStatusFilters] = useState([]);

  // ✅ ADD: Internal status filter for the dashboard
  const [dashboardStatusFilter, setDashboardStatusFilter] = useState('all');

  // Memoize filters to prevent infinite loops
  const memoizedStatusFilters = useMemo(() => statusFilters, [statusFilters.join(',')]);
  const memoizedImageTypeFilters = useMemo(() => imageTypeFilters, [imageTypeFilters.join(',')]);

  // ✅ ENHANCED: Helper function to get image status with blog/page publishedAt support
  const getImageStatus = useCallback((imageObj) => {
    console.log('🔍 getImageStatus called for image:', {
      id: imageObj.id,
      type: imageObj.type,
      publishedAt: imageObj.publishedAt,
      visibility: imageObj.visibility,
      status: imageObj.status
    });

    // ✅ NEW: Handle blog article visibility based on publishedAt
    if (imageObj.type === 'blog' && imageObj.hasOwnProperty('publishedAt')) {
      const status = imageObj.publishedAt ? 'active' : 'draft';
      console.log(`✅ Blog image ${imageObj.id}: publishedAt=${imageObj.publishedAt} -> status=${status}`);
      return status;
    }

    // ✅ NEW: Handle page visibility based on publishedAt
    if (imageObj.type === 'page' && imageObj.hasOwnProperty('publishedAt')) {
      const status = imageObj.publishedAt ? 'active' : 'draft';
      console.log(`✅ Page image ${imageObj.id}: publishedAt=${imageObj.publishedAt} -> status=${status}`);
      return status;
    }

    // Check for explicit status first (for products)
    if (imageObj.status) {
      console.log(`✅ Found explicit status for ${imageObj.id}:`, imageObj.status);
      return imageObj.status.toLowerCase();
    }
    
    // Check for published_status
    if (imageObj.published_status) {
      console.log(`✅ Found published_status for ${imageObj.id}:`, imageObj.published_status);
      return imageObj.published_status.toLowerCase();
    }
    
    // Check for boolean published field
    if (typeof imageObj.published === 'boolean') {
      const status = imageObj.published ? 'active' : 'draft';
      console.log(`✅ Found boolean published for ${imageObj.id}:`, imageObj.published, '-> status:', status);
      return status;
    }

    // Check for visibility field (visible/hidden) -> map to active/draft
    if (imageObj.visibility) {
      const status = imageObj.visibility === 'visible' ? 'active' : 'draft';
      console.log(`✅ Found visibility for ${imageObj.id}: ${imageObj.visibility} -> ${status}`);
      return status;
    }

    // Check for other possible status fields
    if (imageObj.state) {
      console.log(`✅ Found state for ${imageObj.id}:`, imageObj.state);
      return imageObj.state.toLowerCase();
    }
    
    // ⚠️ Default fallback
    console.warn(`⚠️ No status information found for ${imageObj.id}, defaulting to 'active'`);
    console.log(`🔍 Available fields for ${imageObj.id}:`, Object.keys(imageObj));
    
    return 'active';
  }, []);

  // Function to categorize alt text quality
  const categorizeAltText = useCallback((altText) => {
    if (!altText || altText.trim() === '') {
      return 'empty';
    }
    if (altText.trim().length < 35) {
      return 'bad';
    }
    return 'good';
  }, []);

  // Enhanced filtering function
  const getFilteredImages = useCallback(() => {
    console.log('🔍 getFilteredImages called with filters:', {
      altTextFilter,
      queryValue,
      imageTypeFilters: memoizedImageTypeFilters,
      statusFilters: memoizedStatusFilters,
      dashboardStatusFilter,
      totalImages: images.length
    });

    let filtered = images;

    // ✅ UPDATED: Filter by alt text quality (from tabs) - no longer includes "all"
    if (altTextFilter !== 'all') {
      const beforeCount = filtered.length;
      filtered = filtered.filter(img => {
        const category = categorizeAltText(img.altText);
        return category === altTextFilter;
      });
      console.log(`🔍 After alt text filter (${altTextFilter}): ${beforeCount} -> ${filtered.length}`);
    }

    // Filter by search query
    if (queryValue) {
      const beforeCount = filtered.length;
      filtered = filtered.filter(img =>
        img.id.toLowerCase().includes(queryValue.toLowerCase()) ||
        img.type.toLowerCase().includes(queryValue.toLowerCase()) ||
        (img.altText && img.altText.toLowerCase().includes(queryValue.toLowerCase())) ||
        (img.productTitle && img.productTitle.toLowerCase().includes(queryValue.toLowerCase())) ||
        (img.blogTitle && img.blogTitle.toLowerCase().includes(queryValue.toLowerCase())) ||
        (img.articleTitle && img.articleTitle.toLowerCase().includes(queryValue.toLowerCase())) ||
        (img.pageTitle && img.pageTitle.toLowerCase().includes(queryValue.toLowerCase()))
      );
      console.log(`🔍 After search query filter (${queryValue}): ${beforeCount} -> ${filtered.length}`);
    }

    // Filter by image type
    if (memoizedImageTypeFilters.length > 0 && !memoizedImageTypeFilters.includes('all')) {
      const beforeCount = filtered.length;
      filtered = filtered.filter(img => memoizedImageTypeFilters.includes(img.type));
      console.log(`🔍 After image type filter (${memoizedImageTypeFilters.join(', ')}): ${beforeCount} -> ${filtered.length}`);
    }

    // Filter by status (from Polaris filters)
    if (memoizedStatusFilters.length > 0) {
      const beforeCount = filtered.length;
      filtered = filtered.filter(img => {
        const imageStatus = getImageStatus(img);
        const matches = memoizedStatusFilters.includes(imageStatus);
        console.log(`🔍 Status filter check for ${img.id}: status=${imageStatus}, matches=${matches}`);
        return matches;
      });
      console.log(`🔍 After status filter (${memoizedStatusFilters.join(', ')}): ${beforeCount} -> ${filtered.length}`);
    }

    // ✅ ADD: Filter by dashboard status filter
    if (dashboardStatusFilter !== 'all') {
      const beforeCount = filtered.length;
      filtered = filtered.filter(img => {
        const imageStatus = getImageStatus(img);
        const matches = imageStatus === dashboardStatusFilter;
        console.log(`🔍 Dashboard status filter check for ${img.id}: status=${imageStatus}, matches=${matches}`);
        return matches;
      });
      console.log(`🔍 After dashboard status filter (${dashboardStatusFilter}): ${beforeCount} -> ${filtered.length}`);
    }

    console.log(`🔍 Final filtered images count: ${filtered.length}`);
    return filtered;
  }, [images, altTextFilter, queryValue, memoizedImageTypeFilters, memoizedStatusFilters, dashboardStatusFilter, categorizeAltText, getImageStatus]);

  // ✅ ENHANCED: Calculate status counts with blog/page publishedAt support
  const getStatusCounts = useCallback(() => {
    console.log('🔍 Calculating status counts for', images.length, 'images');
    
    const counts = {
      all: images.length,
      active: 0,
      draft: 0,
      archived: 0
    };

    const statusBreakdown = {};

    images.forEach(img => {
      const status = getImageStatus(img);
      
      // Track all unique statuses for debugging
      if (!statusBreakdown[status]) {
        statusBreakdown[status] = 0;
      }
      statusBreakdown[status]++;
      
      // Map statuses to counts
      if (status === 'active') {
        counts.active++;
      } else if (status === 'draft') {
        counts.draft++;
      } else if (status === 'archived') {
        counts.archived++;
      } else {
        console.warn(`⚠️ Unexpected status '${status}' for image ${img.id}`);
        // Default unexpected statuses to active
        counts.active++;
      }
    });

    console.log('🔍 Status breakdown:', statusBreakdown);
    console.log('🔍 Final status counts:', counts);
    
    return counts;
  }, [images, getImageStatus]);

  // Filter configurations
  const filters = useMemo(() => [
    {
      key: 'imageType',
      label: 'Image Type',
      filter: (
        <ChoiceList
          title="Image Type"
          titleHidden
          choices={[
            { label: 'All Images', value: 'all' },
            { label: 'Product', value: 'product' },
            { label: 'Blog', value: 'blog' },
            { label: 'Page', value: 'page' },
          ]}
          selected={imageTypeFilters}
          onChange={(selected) => {
            console.log('🔍 Image type filter changed:', selected);
            if (selected.includes('all')) {
              setImageTypeFilters(['all']);
            } else {
              const filteredSelection = selected.filter(item => item !== 'all');
              setImageTypeFilters(filteredSelection);
            }
          }}
          allowMultiple
        />
      ),
      shortcut: true,
    },
    {
      key: 'status',
      label: 'Status',
      filter: (
        <ChoiceList
          title="Status"
          titleHidden
          choices={[
            { label: 'Published/Active', value: 'active' },
            { label: 'Draft/Hidden', value: 'draft' },
            { label: 'Archived', value: 'archived' },
          ]}
          selected={statusFilters}
          onChange={(selected) => {
            console.log('🔍 Status filter changed:', selected);
            setStatusFilters(selected);
          }}
          allowMultiple
        />
      ),
      shortcut: true,
    },
  ], [imageTypeFilters, statusFilters]);

  // Applied filters for display
  const appliedFilters = useMemo(() => {
    const filters = [];
    
    if (imageTypeFilters.length > 0 && !imageTypeFilters.includes('all')) {
      filters.push({
        key: 'imageType',
        label: `Type: ${imageTypeFilters.join(', ')}`,
        onRemove: () => setImageTypeFilters([]),
      });
    }
    
    if (statusFilters.length > 0) {
      filters.push({
        key: 'status',
        label: `Status: ${statusFilters.join(', ')}`,
        onRemove: () => setStatusFilters([]),
      });
    }

    // ✅ ADD: Dashboard status filter
    if (dashboardStatusFilter !== 'all') {
      filters.push({
        key: 'dashboardStatus',
        label: `Dashboard Status: ${dashboardStatusFilter}`,
        onRemove: () => setDashboardStatusFilter('all'),
      });
    }

    return filters;
  }, [imageTypeFilters, statusFilters, dashboardStatusFilter]);

  // Filter handlers
  const handleFiltersQueryChange = useCallback((value) => {
    console.log('🔍 Query filter changed:', value);
    setQueryValue(value);
  }, []);
  
  const handleQueryValueRemove = useCallback(() => {
    console.log('🔍 Query filter cleared');
    setQueryValue('');
  }, []);
  
  const handleFiltersClearAll = useCallback(() => {
    console.log('🔍 All filters cleared');
    setQueryValue('');
    setImageTypeFilters([]);
    setStatusFilters([]);
    setDashboardStatusFilter('all');
  }, []);

  // ✅ ENHANCED: Fetch function with comprehensive logging
  const fetchImages = useCallback(async () => {
    console.log('🔍 fetchImages called with:', {
      imageType,
      statusFilters,
      timestamp: new Date().toISOString()
    });
    
    setLoading(true);
    try {
      const url = IMAGE_TYPE_ENDPOINTS[imageType];
      
      // Add status filters as query parameters
      const params = new URLSearchParams();
      if (statusFilters.length > 0) {
        params.append('status', statusFilters.join(','));
      }
      
      const finalUrl = statusFilters.length > 0 ? `${url}?${params}` : url;
      console.log('🔍 Fetching from:', finalUrl);
      
      const res = await fetch(finalUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch images: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('🔍 Raw API response:', {
        totalImages: data.images?.length || 0,
        sampleImages: data.images?.slice(0, 3) || [],
        fullResponse: data
      });
      
      // ✅ ENHANCED: Better data processing with detailed logging
      const newImages = (data.images || []).map((img, index) => {
        const processedImage = {
          ...img,
          sourceType: imageType === 'all' ? img.sourceType || img.type : imageType
        };
        
        // Detailed logging for each image
        const statusInfo = {
          id: img.id,
          type: img.type,
          status: img.status,
          published_status: img.published_status,
          published: img.published,
          publishedAt: img.publishedAt,
          visibility: img.visibility,
          state: img.state,
          calculatedStatus: getImageStatus(processedImage),
          allKeys: Object.keys(img)
        };
        
        if (index < 5) { // Log first 5 images in detail
          console.log(`🔍 Processing image ${index + 1}:`, statusInfo);
        }
        
        return processedImage;
      });
      
      console.log('🔍 Processing complete:', {
        totalProcessed: newImages.length,
        statusDistribution: newImages.reduce((acc, img) => {
          const status = getImageStatus(img);
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {})
      });
      
      setImages(newImages);
    } catch (error) {
      console.error('❌ Error fetching images:', error);
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, [imageType, statusFilters.join(','), getImageStatus]);

  // Effect to fetch images when dependencies change
  useEffect(() => {
    console.log('🔍 useEffect triggered - fetching images');
    fetchImages();
  }, [fetchImages]);

  // ✅ ENHANCED: Handler for dashboard status filter changes with logging
  const handleDashboardStatusFilterChange = useCallback((newStatusFilter) => {
    console.log('🔍 Dashboard status filter changed from', dashboardStatusFilter, 'to', newStatusFilter);
    setDashboardStatusFilter(newStatusFilter);
  }, [dashboardStatusFilter]);

  // Alt text change handlers
  const handleAltTextChange = useCallback((id, newText) => {
    console.log('🔍 Alt text changed for image', id);
    setImages((prev) =>
      prev.map((img) =>
        img.id === id ? { ...img, altText: newText } : img
      )
    );
  }, []);

  const handleAltTextGenerated = useCallback((id, generatedText) => {
    console.log('🔍 Alt text generated for image', id, ':', generatedText);
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
  }, []);

  // Get counts for tabs
  const getCounts = useCallback(() => {
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
    
    console.log('🔍 Alt text quality counts:', counts);
    return counts;
  }, [images, categorizeAltText]);

  const counts = getCounts();
  const statusCounts = getStatusCounts();
  const filteredImages = getFilteredImages();

  // ✅ UPDATED: Handle tab change with new array (without "All Images")
  const handleTabChange = useCallback((selectedTabIndex) => {
    console.log('🔍 Tab changed to index', selectedTabIndex);
    setSelected(selectedTabIndex);
    // ✅ Updated filter types array - removed "all"
    const filterTypes = ['empty', 'bad', 'good'];
    const newFilter = filterTypes[selectedTabIndex];
    console.log('🔍 Setting alt text filter to', newFilter);
    setAltTextFilter(newFilter);
  }, []);

  // ✅ UPDATED: Tabs array - removed "All Images" tab
  const tabs = useMemo(() => [
    {
      id: 'empty-alt-tab',
      content: 'Empty Alt Text',
   
      accessibilityLabel: 'Images with empty alt text',
      panelID: 'empty-alt-panel',
    },
    {
      id: 'bad-alt-tab',
      content: 'Bad Alt Text',
    
      accessibilityLabel: 'Images with bad alt text',
      panelID: 'bad-alt-panel',
    },
    {
      id: 'good-alt-tab',
      content: 'Good Alt Text',
   
      accessibilityLabel: 'Images with good alt text',
      panelID: 'good-alt-panel',
    },
  ], [counts]);

  // ✅ ADD: Console log summary on render
  console.log('🔍 Component render summary:', {
    totalImages: images.length,
    filteredImages: filteredImages.length,
    currentFilters: {
      imageType,
      altTextFilter,
      dashboardStatusFilter,
      statusFilters,
      imageTypeFilters,
      queryValue
    },
    statusCounts
  });

  return (
    <div style={{ padding: '24px', backgroundColor: '#f6f6f7', minHeight: '100vh' }}>
      <LegacyCard>
        <LegacyCard.Section>
          <div style={{ marginBottom: 16 }}>
            <Filters
              queryValue={queryValue}
              filters={filters}
              appliedFilters={appliedFilters}
              onQueryChange={handleFiltersQueryChange}
              onQueryClear={handleQueryValueRemove}
              onClearAll={handleFiltersClearAll}
              queryPlaceholder="Search by ID"
            />
          </div>
        </LegacyCard.Section>

        <Tabs tabs={tabs} selected={selected} onSelect={handleTabChange} fitted>
          <LegacyCard.Section>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Spinner size="large" />
                <p style={{ marginTop: 16 }}>Loading images...</p>
              </div>
            ) : (
              <AltTextDashboard
                initialImages={filteredImages}
                onAltTextChange={handleAltTextChange}
                onAltTextGenerated={handleAltTextGenerated}
                filterType={altTextFilter}
                onStatusFilterChange={handleDashboardStatusFilterChange}
                currentStatusFilter={dashboardStatusFilter}
                getImageStatus={getImageStatus} // ✅ Pass the function as a prop
              />
            )}
          </LegacyCard.Section>
        </Tabs>
      </LegacyCard>
    </div>
  );
}
