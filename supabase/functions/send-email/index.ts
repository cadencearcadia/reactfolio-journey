import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EmailRequest {
  name: string;
  email: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Received request:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405
      }
    );
  }

  try {
    const { name, email, message } = await req.json() as EmailRequest;
    
    console.log('Creating SMTP client with credentials:', {
      username: Deno.env.get("GMAIL_USER"),
      hasPassword: !!Deno.env.get("GMAIL_APP_PASSWORD")
    });

    const client = new SmtpClient();

    await client.connectTLS({
      hostname: "smtp.gmail.com",
      port: 465,
      username: Deno.env.get("GMAIL_USER"),
      password: Deno.env.get("GMAIL_APP_PASSWORD"),
    });

    console.log('Connected to SMTP server, sending email...');
    
    const emailBody = `
      New Contact Form Submission
      
      Name: ${name}
      Email: ${email}
      Message: ${message}
    `;

    await client.send({
      from: Deno.env.get("GMAIL_USER")!,
      to: Deno.env.get("GMAIL_USER")!,
      subject: `New Contact Form Message from ${name}`,
      content: emailBody,
    });

    console.log('Email sent successfully');
    await client.close();

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in send-email function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Failed to send email", 
        details: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};

serve(handler);