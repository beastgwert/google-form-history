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
        
        const editUrl = body.editUrl;
        const userId = body.userId;
        const formId = body.formId;
        
        if (!editUrl || !userId || !formId) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'Edit URL, userId, and formId are required' })
            };
        }
        
        // Store in S3 under the key "users/${userId}/submissions/${formId}"
        const key = `users/${userId}/submissions/${formId}`;
        
        // Create the object to store in S3
        const submissionData = {
            editUrl: editUrl,
            timestamp: new Date().toISOString()
        };
        
        // Upload to S3
        const putCommand = new PutObjectCommand({
            Bucket: 'google-form-history-extension', // Replace with your bucket name
            Key: key,
            Body: JSON.stringify(submissionData),
            ContentType: 'application/json'
        });
        
        await s3Client.send(putCommand);
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                message: 'Submission URL stored successfully',
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
            body: JSON.stringify({ error: 'Failed to store submission URL' })
        };
    }
};