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

    console.log('Downloading image from URL:', imageUrl);

    // Download the image from the URL
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
    }

    const contentType = imageResponse.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error('URL does not point to an image');
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