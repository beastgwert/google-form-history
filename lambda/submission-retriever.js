const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const s3Client = new S3Client({ region: 'us-east-1' }); // Replace with your region

exports.handler = async (event) => {
    try {
        // Get userId from query parameters
        const queryParams = event.queryStringParameters || {};
        const userId = queryParams.userId;
        
        if (!userId) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'userId is required' })
            };
        }
        
        // List all submissions for this user
        const prefix = `users/${userId}/submissions/`;
        const listCommand = new ListObjectsV2Command({
            Bucket: 'google-form-history-extension', // Replace with your bucket name
            Prefix: prefix
        });
        
        const listResponse = await s3Client.send(listCommand);
        const submissions = [];
        
        // If there are submissions, get their details
        if (listResponse.Contents && listResponse.Contents.length > 0) {
            // Process each submission
            for (const item of listResponse.Contents) {
                const getCommand = new GetObjectCommand({
                    Bucket: 'google-form-history-extension', // Replace with your bucket name
                    Key: item.Key
                });
                
                const response = await s3Client.send(getCommand);
                const bodyContents = await streamToString(response.Body);
                
                try {
                    const submissionData = JSON.parse(bodyContents);
                    submissions.push({
                        formTitle: submissionData.formTitle,
                        editUrl: submissionData.editUrl,
                        timestamp: submissionData.timestamp
                    });
                } catch (e) {
                    console.error('Error parsing submission data:', e);
                }
            }
        }
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                submissions: submissions
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
            body: JSON.stringify({ error: 'Failed to retrieve submissions' })
        };
    }
};

// Helper function to convert stream to string
async function streamToString(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
}