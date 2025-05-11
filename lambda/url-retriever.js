const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const s3Client = new S3Client({ region: 'us-east-1' }); // Replace with your region

exports.handler = async (event) => {
    // Check if this is a scheduled event from EventBridge Scheduler
    if (event.source === 'aws.events' || 
        (event['detail-type'] && event['detail-type'] === 'Scheduled Event')) {
        console.log('Received scheduled event, no action needed');
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Scheduled invocation received, no action taken' })
        };
    }
    
    try {
        const userId = event.queryStringParameters && event.queryStringParameters.userId;
        const userFolder = userId || 'anonymous';
        
        const listCommand = new ListObjectsV2Command({
            Bucket: 'google-form-history-extension',
            Prefix: `users/${userFolder}/urls/`
        });
        
        const listResponse = await s3Client.send(listCommand);
        
        // If no objects found, return an empty array
        if (!listResponse.Contents || listResponse.Contents.length === 0) {
            return corsResponse(200, { urls: [] });
        }
        
        // Process each object to get its content
        const urlPromises = listResponse.Contents.map(async (object) => {
            const getCommand = new GetObjectCommand({
                Bucket: 'google-form-history-extension', // Replace with your bucket name
                Key: object.Key
            });
            
            const response = await s3Client.send(getCommand);
            
            // Convert the stream to string
            const bodyContents = await streamToString(response.Body);
            
            try {
                return JSON.parse(bodyContents);
            } catch (e) {
                console.error(`Error parsing object content for key ${object.Key}:`, e);
                return null;
            }
        });
        
        // Wait for all promises to resolve
        const urlResults = await Promise.all(urlPromises);
        
        // Filter out any null results and sort by timestamp (newest first)
        const validUrls = urlResults
            .filter(url => url !== null)
            .sort((a, b) => b.timestamp - a.timestamp);
        
        return corsResponse(200, { urls: validUrls });
    } catch (error) {
        console.error('Error retrieving URLs:', error);
        return corsResponse(500, { error: 'Failed to retrieve URLs' });
    }
};

// Helper function to convert stream to string
async function streamToString(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
}

// Helper function to create a CORS-enabled response
function corsResponse(statusCode, body) {
    return {
        statusCode: statusCode,
        headers: {
            'Access-Control-Allow-Origin': '*', // Required for CORS
            'Access-Control-Allow-Methods': 'GET,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    };
}