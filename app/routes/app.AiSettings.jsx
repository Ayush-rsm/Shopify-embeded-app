import {
  Page,
  Card,
  BlockStack,
  Text,
  Checkbox,
  TextField,
  Select,
  InlineStack,
  Box,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useState, useCallback } from "react";
//
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, Form } from "@remix-run/react";

let SETTINGS = {
  autoGenerate: true,
  language: "English",
  useForTitle: false,
  useForCaption: false,
  useForDescription: false,
  prefixText: "",
  suffixText: "",
  useSeoKeywords: true,
  usePostTitleFallback: true,
};

export async function loader() {
  return json(SETTINGS);
}

export async function action({ request }) {
  const formData = await request.formData();
  const key = formData.get("key");
  let value = formData.get("value");

  if (value === "true") value = true;
  if (value === "false") value = false;

  SETTINGS[key] = value;

  return json({ success: true });
}



export default function AltSettingsPage() {
  const settings = useLoaderData();
  const submit = useSubmit();

  const [autoGenerate, setAutoGenerate] = useState(settings.autoGenerate);
  const [language, setLanguage] = useState(settings.language);

  const [useForTitle, setUseForTitle] = useState(settings.useForTitle);
  const [useForCaption, setUseForCaption] = useState(settings.useForCaption);
  const [useForDescription, setUseForDescription] = useState(settings.useForDescription);

  const [prefixText, setPrefixText] = useState(settings.prefixText);
  const [suffixText, setSuffixText] = useState(settings.suffixText);

  const [useSeoKeywords, setUseSeoKeywords] = useState(settings.useSeoKeywords);
  const [usePostTitleFallback, setUsePostTitleFallback] = useState(settings.usePostTitleFallback);

  const saveSettings = useCallback((key, value) => {
    const formData = new FormData();
    formData.append("key", key);
    formData.append("value", value);
    submit(formData, { method: "post" });
  }, [submit]);


//

// export default function AltSettingsPage() {
//   const [autoGenerate, setAutoGenerate] = useState(true);
//   const [language, setLanguage] = useState("English");

//   const [useForTitle, setUseForTitle] = useState(false);
//   const [useForCaption, setUseForCaption] = useState(false);
//   const [useForDescription, setUseForDescription] = useState(false);

//   const [prefixText, setPrefixText] = useState("");
//   const [suffixText, setSuffixText] = useState("");

//   const [useSeoKeywords, setUseSeoKeywords] = useState(true);
//   const [usePostTitleFallback, setUsePostTitleFallback] = useState(true);

// const saveSettings = useCallback(async (key, value) => {
//   try {
//     const response = await fetch("/api/settings", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ key, value }),
//     });

//     if (!response.ok) {
//       throw new Error("Failed to save setting");
//     }

//     console.log(`Saved ${key} =`, value);
//   } catch (err) {
//     console.error("Error saving setting:", err);
//   }
// }, []);



  return (
    <Page>
      <TitleBar title="Your AI Settings" />
      <Card>
        <BlockStack gap="400">


          <InlineStack align="space-between" blockAlign="start" gap="400">
            <Box minWidth="240px">
              <Text variant="bodyMd" as="p">Auto-generate Alt-Text</Text>
            </Box>
            <Box minWidth="500px">
              <Checkbox
                label="Automatically generate alt text when new images are added"
                checked={autoGenerate}
                onChange={(value) => {
                  setAutoGenerate(value);
                  saveSettings("autoGenerate", value);
                }}
                helpText="It will automatically generate alt text for all images added to your website."
              />
            </Box>
          </InlineStack>


          <InlineStack align="space-between" blockAlign="center" gap="400">
            <Box minWidth="240px">
              <Text variant="bodyMd" as="p">Alt Text Language</Text>
            </Box>
            <Box minWidth="500px">
              <Select
                options={["English", "Spanish", "French"]}
                value={language}
                onChange={(value) => {
                  setLanguage(value);
                  saveSettings("language", value);
                }}
                label=""
              />
            </Box>
          </InlineStack>


          <InlineStack align="space-between" blockAlign="start" gap="400">
            <Box minWidth="240px">
              <Text variant="bodyMd" as="p">
                Use generated alt text for other fields
              </Text>
            </Box>
            <Box minWidth="500px">
              <BlockStack gap="200">
                <Checkbox
                  label="Use same alt text value for image title"
                  checked={useForTitle}
                  onChange={(checked) => {
                    setUseForTitle(checked);
                    saveSettings("useForTitle", checked);
                  }}
                />
                <Checkbox
                  label="Use same alt text value for image caption"
                  checked={useForCaption}
                  onChange={(checked) => {
                    setUseForCaption(checked);
                    saveSettings("useForCaption", checked);
                  }}
                />
                <Checkbox
                  label="Use same alt text value for image description"
                  checked={useForDescription}
                  onChange={(checked) => {
                    setUseForDescription(checked);
                    saveSettings("useForDescription", checked);
                  }}
                />
              </BlockStack>
            </Box>
          </InlineStack>



          <InlineStack align="space-between" blockAlign="center" gap="400">
            <Box minWidth="240px">
              <Text variant="bodyMd" as="p">
                Add hardcoded string to beginning of alt text
              </Text>
            </Box>
            <Box minWidth="500px">
              <TextField
                label=""
                value={prefixText}
                onChange={setPrefixText}
                onBlur={() => saveSettings("prefixText", prefixText)}
                autoComplete="off"
              />
            </Box>
          </InlineStack>


          <InlineStack align="space-between" blockAlign="center" gap="200">
            <Box minWidth="240px">
              <Text variant="bodyMd" as="p">
                Add hardcoded string to end of alt text
              </Text>
            </Box>
            <Box minWidth="500px">
              <TextField
                label=""
                value={suffixText}
                onChange={setSuffixText}
                onBlur={() => saveSettings("suffixText", suffixText)}
                autoComplete="off"
              />
            </Box>
          </InlineStack>


          <InlineStack align="space-between" blockAlign="start" gap="400">
            <Box minWidth="240px">
              <Text variant="bodyMd" as="p">SEO Keywords Settings</Text>
            </Box>
            <Box minWidth="300px">
              <BlockStack gap="200">
                <Checkbox
                  label="Use SEO focus keyphrases & keywords for generating alt text"
                  checked={useSeoKeywords}
                  onChange={(value) => {
                    setUseSeoKeywords(value);
                    saveSettings("useSeoKeywords", value);
                  }}
                  helpText="Supported plugins: Yoast SEO, AIOSEO, Squirrly SEO, SEOPress & Rank Math"
                />
                <Checkbox
                  label="Use post title as keywords if SEO keywords not found"
                  checked={usePostTitleFallback}
                  onChange={(value) => {
                    setUsePostTitleFallback(value);
                    saveSettings("usePostTitleFallback", value);
                  }}
                  helpText="Image should be linked to a post for using post title as context."
                />
              </BlockStack>
            </Box>
          </InlineStack>

        </BlockStack>
      </Card>
    </Page>
  );
}
