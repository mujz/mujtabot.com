export async function onRequestGet(context) {
  try {
    const { request, env, params } = context;
    const { filename } = params;

    if (!filename) {
      return new Response('Filename required', { status: 400 });
    }

    // Get the object from R2
    const object = await env.R2_BUCKET.get(filename);

    if (!object) {
      return new Response('Image not found', { status: 404 });
    }

    // Return the image with appropriate headers
    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Error serving image:', error);
    return new Response('Internal server error', { status: 500 });
  }
} 