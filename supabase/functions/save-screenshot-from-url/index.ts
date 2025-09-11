import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the authenticated user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { imageUrl, interessentId } = await req.json();

    if (!imageUrl || !interessentId) {
      throw new Error('Missing imageUrl or interessentId');
    }

    console.log('Downloading from URL:', imageUrl);

    // First, try to fetch the URL to see what we get
    const initialResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
      }
    });

    if (!initialResponse.ok) {
      throw new Error(`Failed to fetch URL: ${initialResponse.status} ${initialResponse.statusText}`);
    }

    const contentType = initialResponse.headers.get('content-type');
    let finalImageUrl = imageUrl;
    let imageResponse = initialResponse;

    // If we got HTML instead of an image, try to extract the image URL
    if (contentType && contentType.includes('text/html')) {
      console.log('Got HTML response, parsing for image URL...');
      const htmlText = await initialResponse.text();
      
      // Try to extract image URL from HTML
      let extractedImageUrl = null;
      
      // Look for meta tags first (og:image, twitter:image)
      const ogImageMatch = htmlText.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
      const twitterImageMatch = htmlText.match(/<meta[^>]*name="twitter:image"[^>]*content="([^"]+)"/i);
      
      if (ogImageMatch) {
        extractedImageUrl = ogImageMatch[1];
        console.log('Found og:image:', extractedImageUrl);
      } else if (twitterImageMatch) {
        extractedImageUrl = twitterImageMatch[1];
        console.log('Found twitter:image:', extractedImageUrl);
      } else {
        // Look for prominent img tags
        const imgMatches = htmlText.match(/<img[^>]*src="([^"]+)"[^>]*>/gi);
        if (imgMatches) {
          // Look for specific IDs or classes that suggest it's the main image
          for (const imgTag of imgMatches) {
            const srcMatch = imgTag.match(/src="([^"]+)"/i);
            if (srcMatch) {
              const src = srcMatch[1];
              // Check for common screenshot/image IDs
              if (imgTag.includes('id="screenshot-image"') || 
                  imgTag.includes('class="screenshot"') ||
                  imgTag.includes('lightshot') ||
                  src.includes('prntscr.com') ||
                  src.includes('lightshot')) {
                extractedImageUrl = src;
                console.log('Found prominent image:', extractedImageUrl);
                break;
              }
            }
          }
          
          // If no specific image found, try the first img with a reasonable src
          if (!extractedImageUrl && imgMatches.length > 0) {
            const firstImgMatch = imgMatches[0].match(/src="([^"]+)"/i);
            if (firstImgMatch) {
              const src = firstImgMatch[1];
              // Skip very small images, base64, or obvious UI elements
              if (!src.startsWith('data:') && 
                  !src.includes('icon') && 
                  !src.includes('logo') &&
                  !src.includes('button')) {
                extractedImageUrl = src;
                console.log('Using first reasonable image:', extractedImageUrl);
              }
            }
          }
        }
      }

      if (!extractedImageUrl) {
        throw new Error('No image found in the HTML page');
      }

      // Convert relative URLs to absolute
      if (extractedImageUrl.startsWith('//')) {
        extractedImageUrl = 'https:' + extractedImageUrl;
      } else if (extractedImageUrl.startsWith('/')) {
        const urlObj = new URL(imageUrl);
        extractedImageUrl = urlObj.origin + extractedImageUrl;
      } else if (!extractedImageUrl.startsWith('http')) {
        const urlObj = new URL(imageUrl);
        extractedImageUrl = urlObj.origin + '/' + extractedImageUrl;
      }

      console.log('Final extracted image URL:', extractedImageUrl);
      finalImageUrl = extractedImageUrl;

      // Now fetch the actual image
      imageResponse = await fetch(extractedImageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': imageUrl,
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
        }
      });

      if (!imageResponse.ok) {
        throw new Error(`Failed to download extracted image: ${imageResponse.status} ${imageResponse.statusText}`);
      }

      const imageContentType = imageResponse.headers.get('content-type');
      if (!imageContentType || !imageContentType.startsWith('image/')) {
        throw new Error('Extracted URL does not point to an image');
      }
    } else if (!contentType || !contentType.startsWith('image/')) {
      throw new Error('URL does not point to an image or HTML page');
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageSize = imageBuffer.byteLength;

    // Check file size (max 10MB)
    if (imageSize > 10 * 1024 * 1024) {
      throw new Error('Image is too large (max 10MB)');
    }

    // Determine file extension from content type
    const fileExtMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp'
    };

    const fileExt = fileExtMap[contentType.toLowerCase()] || 'jpg';
    const fileName = `${user.id}/${interessentId}/${Date.now()}.${fileExt}`;

    console.log('Uploading image to storage:', fileName);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('email-screenshots')
      .upload(fileName, new Uint8Array(imageBuffer), {
        contentType: contentType,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    console.log('Creating database entry');

    // Create database entry
    const { error: dbError } = await supabase
      .from('interessenten_email_verlauf')
      .insert({
        interessent_id: interessentId,
        user_id: user.id,
        screenshot_path: fileName,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      // Try to clean up the uploaded file
      await supabase.storage
        .from('email-screenshots')
        .remove([fileName]);
      
      throw new Error(`Failed to save to database: ${dbError.message}`);
    }

    console.log('Screenshot saved successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      fileName,
      message: 'Screenshot saved successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in save-screenshot-from-url function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});