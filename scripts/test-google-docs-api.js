#!/usr/bin/env node

/**
 * Test script for Google Docs API integration
 * Run with: node scripts/test-google-docs-api.js
 */

const { google } = require('googleapis');
require('dotenv').config();

const DOCUMENT_ID = '1U6rqzofesQdFfU3G1Lj6i1mHF0QDePFHy48iXuwoAWQ';

async function testGoogleDocsAPI() {
  console.log('🔍 Testing Google Docs API integration...\n');

  // Check if API key is set
  if (!process.env.GOOGLE_API_KEY) {
    console.error('❌ GOOGLE_API_KEY not found in environment variables');
    console.log('📝 Please add GOOGLE_API_KEY to your .env file');
    console.log('📖 See GOOGLE_DOCS_API_SETUP.md for instructions');
    return;
  }

  console.log('✅ GOOGLE_API_KEY found in environment variables');

  try {
    // Initialize Google Docs API
    const docs = google.docs({
      version: 'v1',
      key: process.env.GOOGLE_API_KEY
    });

    console.log('✅ Google Docs API initialized');

    // Test API call
    console.log('📄 Fetching document...');
    const response = await docs.documents.get({
      documentId: DOCUMENT_ID,
    });

    const document = response.data;
    console.log('✅ Document fetched successfully!');
    console.log(`📋 Document title: ${document.title}`);
    console.log(`📊 Document has ${document.body?.content?.length || 0} content elements`);

    // Test content processing
    if (document.body && document.body.content) {
      let textContent = '';
      let headingCount = 0;
      let paragraphCount = 0;

      for (const element of document.body.content) {
        if (element.paragraph) {
          const paragraph = element.paragraph;
          if (paragraph.elements && paragraph.elements.length > 0) {
            let paragraphText = '';
            let isHeading = false;

            for (const elem of paragraph.elements) {
              if (elem.textRun) {
                const text = elem.textRun.content;
                paragraphText += text;

                if (elem.textRun.textStyle && elem.textRun.textStyle.bold) {
                  isHeading = true;
                }
              }
            }

            if (paragraphText.trim()) {
              if (isHeading) {
                headingCount++;
                textContent += `\n## ${paragraphText.trim()}\n`;
              } else {
                paragraphCount++;
                textContent += `${paragraphText.trim()}\n`;
              }
            }
          }
        }
      }

      console.log(`📈 Content processed: ${headingCount} headings, ${paragraphCount} paragraphs`);
      console.log(`📝 First 200 characters of content:`);
      console.log(`"${textContent.substring(0, 200)}..."`);
    }

    console.log('\n🎉 Google Docs API integration test completed successfully!');
    console.log('✅ The API is working correctly and can fetch document content');

  } catch (error) {
    console.error('❌ Error testing Google Docs API:', error.message);
    
    if (error.code === 403) {
      console.log('\n🔧 Possible solutions:');
      console.log('1. Check if Google Docs API is enabled in your Google Cloud project');
      console.log('2. Verify your API key is correct');
      console.log('3. Check if the document is public or your API key has access to it');
    } else if (error.code === 404) {
      console.log('\n🔧 Possible solutions:');
      console.log('1. Check if the document ID is correct');
      console.log('2. Verify the document exists and is accessible');
    } else if (error.code === 400) {
      console.log('\n🔧 Possible solutions:');
      console.log('1. Check if your API key is valid');
      console.log('2. Verify the API key has the correct permissions');
    }

    console.log('\n📖 See GOOGLE_DOCS_API_SETUP.md for detailed setup instructions');
  }
}

// Run the test
testGoogleDocsAPI().catch(console.error);
