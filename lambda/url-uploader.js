const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
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
        
        if (!url) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*', // Required for CORS
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'URL is required' })
            };
        }
        
        // Use a default folder if no user ID is provided (for backward compatibility)
        const userFolder = userId || 'anonymous';
        
        // Create a unique key for the URL using the user ID as a folder
        const timestamp = new Date().getTime();
        
        // Extract the form ID from the URL
        let formId = url;
        
        // Check if it's a Google Forms URL and extract the form ID
        if (url.includes('docs.google.com/forms/')) {
            // Extract the form ID from URLs like:
            // https://docs.google.com/forms/d/e/FORM_ID/viewform
            // or https://docs.google.com/forms/d/FORM_ID/edit
            const match = url.match(/forms\/d(?:\/e)?\/([\w-]+)/);
            if (match && match[1]) {
                formId = match[1];
            }
        }
        
        const key = `users/${userFolder}/urls/${formId}`;
        
        // Prepare the URL content for upload
        const urlData = {
            url: url,
            timestamp: timestamp,
            userId: userId,
            metadata: {
                addedAt: new Date().toISOString(),
                userId: userId
            }
        };
        
        // Upload to S3
        const putCommand = new PutObjectCommand({
            Bucket: 'google-form-history-extension', // Replace with your bucket name
            Key: key,
            Body: JSON.stringify(urlData),
            ContentType: 'application/json'
        });
        
        await s3Client.send(putCommand);
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*', // Required for CORS
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                message: 'URL uploaded successfully',
                key: key
            })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*', // Required for CORS
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Failed to upload URL' })
        };
    }
};
