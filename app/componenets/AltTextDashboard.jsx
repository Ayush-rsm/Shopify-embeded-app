import { useEffect, useState } from 'react';
import {
  Page,
  Card,
  Button,
  Thumbnail,
  TextField,
  IndexTable,
  useIndexResourceState,
  Badge,
  Filters,
  ChoiceList,
} from '@shopify/polaris';
import '@shopify/polaris/build/esm/styles.css';

export default function AltTextDashboard({ initialImages }) {
  
  const [images, setImages] = useState(initialImages);
  const [typeFilter, setTypeFilter] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredImages = images.filter((img) => {
    const matchesType = typeFilter.length === 0 || typeFilter.includes(img.type);
    const matchesSearch = img.id.includes(searchQuery.trim());
    return matchesType && matchesSearch;
  });

  

  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
  } = useIndexResourceState(filteredImages);

  const handleAltTextChange = (value, id) => {
    const updated = images.map((img) =>
      img.id === id ? { ...img, altText: value } : img
    );
    setImages(updated);
  };

  const handleGenerateSelected = () => {
    const updated = images.map((img) =>
      selectedResources.includes(img.id)
        ? {
            ...img,
            altText: `Generated alt for ${img.type} ID ${img.id}`,
            processedOn: new Date().toLocaleString(),
          }
        : img
    );
    setImages(updated);
  };

  const handleGenerateSingle = (id) => {
    const updated = images.map((img) =>
      img.id === id
        ? {
            ...img,
            altText: `Generated alt for ${img.type} ID ${img.id}`,
            processedOn: new Date().toLocaleString(),
          }
        : img
    );
    setImages(updated);
  };

  return (
    <Page title="Alt Text Dashboard">
      <Card>
        <Filters
          queryValue={searchQuery}
          onQueryChange={setSearchQuery}
          onQueryClear={() => setSearchQuery('')}
          queryPlaceholder="Search image by ID"
          filters={[
            {
              key: 'type',
              label: 'Type',
              filter: (
                <ChoiceList
                  title="Type"
                  titleHidden
                  choices={[
                    { label: 'Product', value: 'product' },
                    { label: 'Blog', value: 'blog' },
                    { label: 'Article', value: 'article' },
                  ]}
                  selected={typeFilter}
                  onChange={setTypeFilter}
                  allowMultiple
                />
              ),
              shortcut: true,
            },
          ]}
          appliedFilters={[
            ...(typeFilter.length > 0
              ? [
                  {
                    key: 'type',
                    label: `Type: ${typeFilter.join(', ')}`,
                    onRemove: () => setTypeFilter([]),
                  },
                ]
              : []),
            ...(searchQuery
              ? [
                  {
                    key: 'search',
                    label: `Search: ${searchQuery}`,
                    onRemove: () => setSearchQuery(''),
                  },
                ]
              : []),
          ]}
          onClearAll={() => setTypeFilter([])}
        />

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
            { title: 'Alt Text' },
            { title: 'Processed On' },
            { title: 'Action' },
          ]}
        >
          {filteredImages.map(({ id, image, type, altText, processedOn }, index) => (
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
                    value={altText}
                    autoComplete="off"
                    onChange={(value) => handleAltTextChange(value, id)}
                  />
                </div>
              </IndexTable.Cell>

              <IndexTable.Cell>
                <div onClick={(e) => e.stopPropagation()}>{processedOn}</div>
              </IndexTable.Cell>

              <IndexTable.Cell>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGenerateSingle(id);
                  }}
                  variant="primary"
                >
                  Regenerate
                </Button>
              </IndexTable.Cell>
            </IndexTable.Row>
          ))}
        </IndexTable>

        <div style={{ marginTop: 20, textAlign: 'right' }}>
          <Button
            onClick={handleGenerateSelected}
            disabled={selectedResources.length === 0}
            variant="primary"
          >
            Generate for Selected
          </Button>
        </div>
      </Card>
    </Page>
  );
}
