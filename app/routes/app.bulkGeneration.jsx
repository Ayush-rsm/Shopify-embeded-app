// import { useState, useEffect, useCallback } from "react";
// import { 
//   LegacyCard, 
//   Tabs, 
//   Spinner, 
//   Filters, 
//   ChoiceList 
// } from '@shopify/polaris';
// import AltTextDashboard from "../componenets/AltTextDashboard";

// const IMAGE_TYPE_ENDPOINTS = {
//   product: "/api/productImages",
//   blog: "/api/blogImages", 
//   article: "/api/articleImages",
//   all: "/api/allImages",
// };

// export default function BulkGeneration() {
//   const [imageType, setImageType] = useState("all");
//   const [altTextFilter, setAltTextFilter] = useState("all");
//   const [selected, setSelected] = useState(0);
//   const [images, setImages] = useState([]);
//   const [loading, setLoading] = useState(true);

//   // Filter states for Polaris Filters component
//   const [queryValue, setQueryValue] = useState('');
//   const [imageTypeFilters, setImageTypeFilters] = useState([]);

//   // Function to categorize alt text quality
//   const categorizeAltText = (altText) => {
//     if (!altText || altText.trim() === '') {
//       return 'empty';
//     }
//     if (altText.trim().length < 10) {
//       return 'bad';
//     }
//     return 'good';
//   };

//   // Enhanced filtering function that includes search and type filters
//   const getFilteredImages = () => {
//     let filtered = images;

//     // Filter by alt text quality (from tabs)
//     if (altTextFilter !== 'all') {
//       filtered = filtered.filter(img => {
//         const category = categorizeAltText(img.altText);
//         return category === altTextFilter;
//       });
//     }

//     // Filter by search query
//     if (queryValue) {
//       filtered = filtered.filter(img => 
//         img.id.toLowerCase().includes(queryValue.toLowerCase()) ||
//         img.type.toLowerCase().includes(queryValue.toLowerCase()) ||
//         (img.altText && img.altText.toLowerCase().includes(queryValue.toLowerCase()))
//       );
//     }

//     // Filter by image type (from Filters component)
//     if (imageTypeFilters.length > 0) {
//       filtered = filtered.filter(img => imageTypeFilters.includes(img.type));
//     }

//     return filtered;
//   };

//   // Polaris Filters configuration
//   const filters = [
//     {
//       key: 'imageType',
//       label: 'Image Type',
//       filter: (
//         <ChoiceList
//           title="Image Type"
//           titleHidden
//           choices={[
//             { label: 'Product', value: 'product' },
//             { label: 'Blog', value: 'blog' },

//             { label: 'Page', value: 'page' },
//           ]}
//           selected={imageTypeFilters}
//           onChange={setImageTypeFilters}
//           allowMultiple
//         />
//       ),
//       shortcut: true,
//     },
//   ];

//   // Applied filters for display
//   const appliedFilters = [];

//   if (imageTypeFilters.length > 0) {
//     appliedFilters.push({
//       key: 'imageType',
//       label: `Type: ${imageTypeFilters.join(', ')}`,
//       onRemove: () => setImageTypeFilters([]),
//     });
//   }

//   // Filter handlers
//   const handleFiltersQueryChange = useCallback((value) => setQueryValue(value), []);
//   const handleQueryValueRemove = useCallback(() => setQueryValue(''), []);
//   const handleFiltersClearAll = useCallback(() => {
//     setQueryValue('');
//     setImageTypeFilters([]);
//   }, []);

//   // Simplified fetch function
//   const fetchImages = async () => {
//     setLoading(true);

//     try {
//       const url = IMAGE_TYPE_ENDPOINTS[imageType];
//       const res = await fetch(url);

//       if (!res.ok) {
//         throw new Error(`Failed to fetch images: ${res.status}`);
//       }

//       const data = await res.json();

//       const newImages = (data.images || []).map(img => ({
//         ...img,
//         sourceType: imageType === 'all' ? img.sourceType : imageType
//       }));

//       setImages(newImages);

//     } catch (error) {
//       console.error('Error fetching images:', error);
//       setImages([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Fetch images when imageType changes
//   useEffect(() => {
//     fetchImages();
//   }, [imageType]);

//   // Handler to update altText for an image
//   const handleAltTextChange = (id, newText) => {
//     setImages((prev) =>
//       prev.map((img) =>
//         img.id === id ? { ...img, altText: newText } : img
//       )
//     );
//   };

//   // Handler to update processedOn after generation
//   const handleAltTextGenerated = (id, generatedText) => {
//     setImages((prev) =>
//       prev.map((img) =>
//         img.id === id
//           ? {
//               ...img,
//               altText: generatedText,
//               processedOn: new Date().toLocaleString(),
//             }
//           : img
//       )
//     );
//   };

//   // Get counts for each filter category
//   const getCounts = () => {
//     const counts = {
//       all: images.length,
//       empty: 0,
//       bad: 0,
//       good: 0
//     };

//     images.forEach(img => {
//       const category = categorizeAltText(img.altText);
//       counts[category]++;
//     });

//     return counts;
//   };

//   const counts = getCounts();
//   const filteredImages = getFilteredImages();

//   // Handle tab change
//   const handleTabChange = useCallback((selectedTabIndex) => {
//     setSelected(selectedTabIndex);
//     const filterTypes = ['all', 'empty', 'bad', 'good'];
//     setAltTextFilter(filterTypes[selectedTabIndex]);
//   }, []);

//   // Tab configuration with badges
//   const tabs = [
//     {
//       id: 'all-images-tab',
//       content: 'All Images',
//       badge: counts.all > 99 ? '99+' : counts.all.toString(),
//       accessibilityLabel: 'All images',
//       panelID: 'all-images-panel',
//     },
//     {
//       id: 'empty-alt-tab',
//       content: 'Empty Alt Text',
//       badge: counts.empty > 99 ? '99+' : counts.empty.toString(),
//       accessibilityLabel: 'Images with empty alt text',
//       panelID: 'empty-alt-panel',
//     },
//     {
//       id: 'bad-alt-tab',
//       content: 'Bad Alt Text',
//       badge: counts.bad > 99 ? '99+' : counts.bad.toString(),
//       accessibilityLabel: 'Images with bad alt text',
//       panelID: 'bad-alt-panel',
//     },
//     {
//       id: 'good-alt-tab',
//       content: 'Good Alt Text',
//       badge: counts.good > 99 ? '99+' : counts.good.toString(),
//       accessibilityLabel: 'Images with good alt text',
//       panelID: 'good-alt-panel',
//     },
//   ];

//   return (
//     <div style={{ padding: '24px', backgroundColor: '#f6f6f7', minHeight: '100vh' }}>


//       {/* Main Content with Tabs */}
//       <LegacyCard>
//         <Tabs tabs={tabs} selected={selected} onSelect={handleTabChange} fitted>
//           <LegacyCard.Section>
//             {/* Add Polaris Filters Component */}
//             <div style={{ marginBottom: 16 }}>
//               <Filters
//                 queryValue={queryValue}
//                 filters={filters}
//                 appliedFilters={appliedFilters}
//                 onQueryChange={handleFiltersQueryChange}
//                 onQueryClear={handleQueryValueRemove}
//                 onClearAll={handleFiltersClearAll}
//                 queryPlaceholder="Search by ID, type, or alt text..."
//               />
//             </div>

//             {/* Dashboard Component */}
//             <AltTextDashboard
//               initialImages={filteredImages}
//               onAltTextChange={handleAltTextChange}
//               onAltTextGenerated={handleAltTextGenerated}
//               filterType={altTextFilter}
//             />
//           </LegacyCard.Section>
//         </Tabs>
//       </LegacyCard>
//     </div>
//   );
// }



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
  const [altTextFilter, setAltTextFilter] = useState("all");
  const [selected, setSelected] = useState(0);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false); // Changed from true to false

  // Filter states for Polaris Filters component
  const [queryValue, setQueryValue] = useState('');
  const [imageTypeFilters, setImageTypeFilters] = useState([]);
  const [statusFilters, setStatusFilters] = useState([]);

  // Memoize filters to prevent infinite loops
  const memoizedStatusFilters = useMemo(() => statusFilters, [statusFilters.join(',')]);
  const memoizedImageTypeFilters = useMemo(() => imageTypeFilters, [imageTypeFilters.join(',')]);

  // Function to categorize alt text quality
  const categorizeAltText = useCallback((altText) => {
    if (!altText || altText.trim() === '') {
      return 'empty';
    }
    if (altText.trim().length < 10) {
      return 'bad';
    }
    return 'good';
  }, []);

  // Enhanced filtering function
  const getFilteredImages = useCallback(() => {
    let filtered = images;

    // Filter by alt text quality (from tabs)
    if (altTextFilter !== 'all') {
      filtered = filtered.filter(img => {
        const category = categorizeAltText(img.altText);
        return category === altTextFilter;
      });
    }

    // Filter by search query
    if (queryValue) {
      filtered = filtered.filter(img =>
        img.id.toLowerCase().includes(queryValue.toLowerCase()) ||
        img.type.toLowerCase().includes(queryValue.toLowerCase()) ||
        (img.altText && img.altText.toLowerCase().includes(queryValue.toLowerCase()))
      );
    }

    // Filter by image type
    if (memoizedImageTypeFilters.length > 0 && !memoizedImageTypeFilters.includes('all')) {
      filtered = filtered.filter(img => memoizedImageTypeFilters.includes(img.type));
    }

    // Filter by status
    if (memoizedStatusFilters.length > 0) {
      filtered = filtered.filter(img => {
        let imageStatus = img.status || img.published_status;
        
        if (!imageStatus && typeof img.published === 'boolean') {
          imageStatus = img.published ? 'active' : 'draft';
        }
        
        if (!imageStatus) {
          imageStatus = 'active';
        }
        
        return memoizedStatusFilters.includes(imageStatus);
      });
    }

    return filtered;
  }, [images, altTextFilter, queryValue, memoizedImageTypeFilters, memoizedStatusFilters, categorizeAltText]);

  // Polaris Filters configuration
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
            { label: 'Active', value: 'active' },
            { label: 'Draft', value: 'draft' },
            { label: 'Archived', value: 'archived' },
          ]}
          selected={statusFilters}
          onChange={setStatusFilters}
          allowMultiple
        />
      ),
      shortcut: true,
    },
  ], [imageTypeFilters, statusFilters]);

  // Applied filters for display
  const appliedFilters = useMemo(() => {
    const filters = [];

    if (imageTypeFilters.length > 0) {
      const filterLabel = imageTypeFilters.includes('all') 
        ? 'All Images' 
        : `Type: ${imageTypeFilters.join(', ')}`;
      
      filters.push({
        key: 'imageType',
        label: filterLabel,
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

    return filters;
  }, [imageTypeFilters, statusFilters]);

  // Filter handlers
  const handleFiltersQueryChange = useCallback((value) => setQueryValue(value), []);
  const handleQueryValueRemove = useCallback(() => setQueryValue(''), []);
  const handleFiltersClearAll = useCallback(() => {
    setQueryValue('');
    setImageTypeFilters([]);
    setStatusFilters([]);
  }, []);

  // FIXED: Fetch function without loading guard
  const fetchImages = useCallback(async () => {
    setLoading(true);

    try {
      const url = IMAGE_TYPE_ENDPOINTS[imageType];
      
      // Add status filters as query parameters
      const params = new URLSearchParams();
      if (statusFilters.length > 0) {
        params.append('status', statusFilters.join(','));
      }
      
      const finalUrl = statusFilters.length > 0 ? `${url}?${params}` : url;
      console.log('Fetching from:', finalUrl); // Debug log
      
      const res = await fetch(finalUrl);

      if (!res.ok) {
        throw new Error(`Failed to fetch images: ${res.status}`);
      }

      const data = await res.json();
      console.log('Fetched data:', data); // Debug log

      const newImages = (data.images || []).map(img => ({
        ...img,
        sourceType: imageType === 'all' ? img.sourceType : imageType
      }));

      console.log('Processed images:', newImages); // Debug log
      setImages(newImages);

    } catch (error) {
      console.error('Error fetching images:', error);
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, [imageType, statusFilters.join(',')]);

  // FIXED: Simple useEffect that always runs
  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Rest of your handlers...
  const handleAltTextChange = useCallback((id, newText) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === id ? { ...img, altText: newText } : img
      )
    );
  }, []);

  const handleAltTextGenerated = useCallback((id, generatedText) => {
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

    return counts;
  }, [images, categorizeAltText]);

  const counts = getCounts();
  const filteredImages = getFilteredImages();

  const handleTabChange = useCallback((selectedTabIndex) => {
    setSelected(selectedTabIndex);
    const filterTypes = ['all', 'empty', 'bad', 'good'];
    setAltTextFilter(filterTypes[selectedTabIndex]);
  }, []);

  const tabs = useMemo(() => [
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
  ], [counts]);

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
              queryPlaceholder="Search by ID, type, or alt text..."
            />
          </div>
        </LegacyCard.Section>

        <Tabs tabs={tabs} selected={selected} onSelect={handleTabChange} fitted>
          <LegacyCard.Section>
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
