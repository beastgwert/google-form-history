const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const s3Client = new S3Client({ region: 'us-east-1' }); // Replace with your region

exports.handler = async (event) => {
    try {
        // Parse the incoming request body, handling both string and object formats
        let body;
        if (typeof event.body === 'string') {
            try {
                body = JSON.parse(event.body);
            } catch (e) {
                console.error('Error parsing event.body as JSON:', e);
                return {
                    statusCode: 400,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ error: 'Invalid JSON in request body' })
                };
            }
        } else {
            body = event.body; // Already an object
        }
        
        const url = body.url;
        const userId = body.userId;
        
        if (!url || !userId) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'URL and userId are required' })
            };
        }
        
        // Extract the form ID from the URL
        let formId = url;
        
        // Check if it's a Google Forms URL and extract the form ID
        if (url.includes('docs.google.com/forms/')) {
            // Extract the form ID from URLs like:
            // https://docs.google.com/forms/d/e/FORM_ID/viewform
            // or https://docs.google.com/forms/d/FORM_ID/edit
            // or https://docs.google.com/forms/u/0/d/e/FORM_ID/formResponse
            
            // First try to match the submission URL format
            let match = url.match(/forms\/u\/\d+\/d\/e\/([\w-]+)\/formResponse/);
            
            // If that doesn't match, try the standard format
            if (!match || !match[1]) {
                match = url.match(/forms\/d(?:\/e)?\/(([\w-]+))/);
            }
            
            if (match && match[1]) {
                formId = match[1];
            }
        }
        
        const key = `users/${userId}/urls/${formId}`;
        
        // Delete from S3
        const deleteCommand = new DeleteObjectCommand({
            Bucket: 'google-form-history-extension', // Replace with your bucket name
            Key: key
        });
        
        await s3Client.send(deleteCommand);
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                message: 'URL deleted successfully',
                key: key
            })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Failed to delete URL' })
        };
    }
};