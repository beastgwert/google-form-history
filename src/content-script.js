// Content script to detect "Edit your response" link on Google Form submission pages

// Function to extract form ID from a Google Forms URL
function extractFormId(url) {
  // Try to match the edit response URL format for URLs like:
  // https://docs.google.com/forms/d/e/FORM_ID/viewform
  let match = url.match(/forms\/d\/e\/([\w-]+)\//);
  
  // If that doesn't match, try the format for URLs with u/0 pattern:
  // https://docs.google.com/forms/u/0/d/e/FORM_ID/viewform
  if (!match || !match[1]) {
    match = url.match(/forms\/u\/\d+\/d\/e\/([\w-]+)\//);
  }
  
  // If that doesn't match, try the standard format:
  // https://docs.google.com/forms/d/FORM_ID/edit
  if (!match || !match[1]) {
    match = url.match(/forms\/d\/([\w-]+)/);
  }
  
  if (match && match[1]) {
    return match[1];
  }
  
  return null;
}

// Main function to detect the "Edit your response" link
function detectEditResponseLink() {
  console.log('Checking for "Edit your response" link...');
  
  // Try multiple approaches to find the edit link
  
  // Approach 1: Look for the div with class "c2gzEf" that contains the edit link
  const editContainer = document.querySelector('.c2gzEf');
  
  if (editContainer) {
    console.log('class c2gzEf found');
    // Find the "Edit your response" link inside this container
    const editLink = editContainer.querySelector('a');
    
    if (editLink && editLink.textContent.includes('Edit your response')) {
      processEditLink(editLink.href);
      return;
    } else {
      console.log('Edit link not found in the container with class c2gzEf');
    }
  } else {
    console.log('Edit container with class c2gzEf not found on this page');
  }
  
  // Approach 2: Look for any link that contains "Edit your response" text
  console.log('Trying alternative approach to find edit link...');
  const allLinks = document.querySelectorAll('a');
  for (const link of allLinks) {
    if (link.textContent.includes('Edit your response')) {
      console.log('Found "Edit your response" link via text search:', link.href);
      processEditLink(link.href);
      return;
    }
  }
  
  console.log('Could not find "Edit your response" link using any method');
}

// Process the edit link once found
function processEditLink(href) {
  console.log('Processing edit link:', href);
  
  // Send this information to the background script
  const editUrl = href;
  const formId = extractFormId(editUrl);
  
  // Get the form title from the document title
  // Usually Google Forms have titles in the format "Form Name - Google Forms"
  let formTitle = document.title;
  // Remove the "- Google Forms" suffix if present
  formTitle = formTitle.replace(/ - Google Forms$/, '');
  // If it's a submission page, it might have a different format
  formTitle = formTitle.replace(/Form submitted$/, '').trim();
  
  console.log('Form title:', formTitle);
  
  if (formId) {
    // Get the API endpoint from the manifest
    chrome.runtime.sendMessage({
      action: 'uploadSubmission',
      editUrl: editUrl,
      formId: formId,
      formTitle: formTitle
    }, response => {
      console.log('Response from background script:', response);
    });
  } else {
    console.error('Could not extract form ID from edit URL:', editUrl);
  }
}

// Execute immediately when script is injected
console.log('Content script loaded and executing immediately');

// Run immediately with a small delay to ensure DOM is accessible
setTimeout(detectEditResponseLink, 100);

