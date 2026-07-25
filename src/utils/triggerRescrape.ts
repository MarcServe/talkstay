import { supabase } from "@/integrations/supabase/client";

export async function triggerRescrapeForBizBoosters() {
  console.log("Triggering fresh scrape for Biz Boosters with enhanced contact detection...");

  try {
    // Use the latest assistant ID for Biz Boosters
    const { data: crawlResult, error: crawlError } = await supabase.functions.invoke("firecrawl-crawl", {
      body: {
        assistantId: "c9dc3194-fa6e-49f5-9b49-8884c500d7f3",
        url: "https://bizboosters.co.uk",
      },
    });

    if (crawlError) {
      console.error("Error triggering rescrape:", crawlError);
      return { success: false, error: crawlError.message };
    }

    console.log("Fresh scrape completed successfully:", crawlResult);
    return { success: true, data: crawlResult };
  } catch (error: any) {
    console.error("Error in triggerRescrapeForBizBoosters:", error);
    return { success: false, error: error.message };
  }
}

export async function triggerRescrapeForRoute() {
  console.log("Triggering fresh scrape for ROUTE with enhanced contact detection...");

  try {
    const { data: crawlResult, error: crawlError } = await supabase.functions.invoke("firecrawl-crawl", {
      body: {
        assistantId: "43ca0739-c2c8-47a7-b348-4df45b6ac498",
        url: "https://gbproute.com",
      },
    });

    if (crawlError) {
      console.error("Error triggering rescrape:", crawlError);
      return { success: false, error: crawlError.message };
    }

    console.log("Fresh scrape completed successfully:", crawlResult);
    return { success: true, data: crawlResult };
  } catch (error: any) {
    console.error("Error in triggerRescrapeForRoute:", error);
    return { success: false, error: error.message };
  }
}

export async function testEnhancedContactSearch() {
  console.log("Testing enhanced contact search...");

  try {
    const { data: searchResult, error: searchError } = await supabase.functions.invoke("knowledge-search", {
      body: {
        assistantId: "c9dc3194-fa6e-49f5-9b49-8884c500d7f3",
        query: "Biz Boosters contact information",
        topK: 5,
        domain: "bizboosters.co.uk"
      },
    });

    if (searchError) {
      console.error("Error testing contact search:", searchError);
      return { success: false, error: searchError.message };
    }

    console.log("Contact search test result:", searchResult);
    return { success: true, data: searchResult };
  } catch (error: any) {
    console.error("Error in testEnhancedContactSearch:", error);
    return { success: false, error: error.message };
  }
}

export async function updateRouteSystemPrompt() {
  console.log("Updating Route assistant system prompt for honesty...");

  try {
    const { data: updateResult, error: updateError } = await supabase
      .from('assistants')
      .update({
        system_prompt: `You are a professional voice assistant for ROUTE.
Website: https://gbproute.com
Language: Communicate primarily in english
Page title: ROUTE - Turn Your Commute into Income
Description: ROUTE is an AI-powered delivery platform that transforms your everyday travel into earnings—no detours, just smart logistics.

CRITICAL HONESTY RULE:
- If you don't have specific information about ROUTE's services, pricing, features, or operations, say "I don't have that specific information about ROUTE right now"
- NEVER make up or assume details about services, pricing, processes, or business operations
- Be honest about knowledge limitations rather than giving generic responses
- Only answer based on the actual scraped content from the website

CONVERSATION RULES:
- NEVER use the same greeting twice - vary your responses naturally
- Remember context from previous messages in the conversation
- Be contextually aware of what the user just said
- Respond naturally without repeating standard phrases
- Keep responses conversational and engaging
- Communicate primarily in english, but be helpful if users speak other languages

Your role:
- Help users navigate the website and find information
- Answer questions about ROUTE services ONLY if you have specific information
- Assist with booking appointments if booking options are available
- Provide a welcoming, professional experience with a male voice
- Be transparent when you lack specific details

When users mention navigation (like "go to pricing" or "show me contact"), respond with JSON: {"navigate": "/page-url"}
For booking requests, guide them to the appropriate booking method if available, otherwise acknowledge you don't have booking information.`
      })
      .eq('id', '43ca0739-c2c8-47a7-b348-4df45b6ac498');

    if (updateError) {
      console.error("Error updating system prompt:", updateError);
      return { success: false, error: updateError.message };
    }

    console.log("System prompt updated successfully:", updateResult);
    return { success: true, data: updateResult };
  } catch (error: any) {
    console.error("Error in updateRouteSystemPrompt:", error);
    return { success: false, error: error.message };
  }
}

export async function updateAllAssistantsWithHonestyRules() {
  console.log("Adding honesty rules to all existing assistants...");

  try {
    // First, get all assistants that don't already have honesty rules
    const { data: assistants, error: fetchError } = await supabase
      .from('assistants')
      .select('id, business_name, system_prompt')
      .not('system_prompt', 'ilike', '%CRITICAL HONESTY RULE%');

    if (fetchError) {
      console.error("Error fetching assistants:", fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!assistants || assistants.length === 0) {
      console.log("No assistants need updating - all already have honesty rules");
      return { success: true, message: "All assistants already have honesty rules" };
    }

    console.log(`Found ${assistants.length} assistants to update`);

    // Update each assistant
    const updatePromises = assistants.map(async (assistant) => {
      const currentPrompt = assistant.system_prompt || '';
      const businessName = assistant.business_name || 'this business';
      
      // Add honesty rules after any existing content but before conversation rules
      const honestySection = `

CRITICAL HONESTY RULE:
- If you don't have specific information about ${businessName}'s services, pricing, features, or operations, say "I don't have that specific information about ${businessName} right now"
- NEVER make up or assume details about services, pricing, processes, or business operations
- Be honest about knowledge limitations rather than giving generic responses
- Only answer based on the actual scraped content from the website`;

      // Insert honesty rules before conversation rules if they exist, otherwise at the end
      let updatedPrompt;
      if (currentPrompt.includes('CONVERSATION RULES:')) {
        updatedPrompt = currentPrompt.replace('CONVERSATION RULES:', honestySection + '\n\nCONVERSATION RULES:');
      } else {
        updatedPrompt = currentPrompt + honestySection;
      }

      const { error: updateError } = await supabase
        .from('assistants')
        .update({ system_prompt: updatedPrompt })
        .eq('id', assistant.id);

      if (updateError) {
        console.error(`Error updating assistant ${assistant.id}:`, updateError);
        return { id: assistant.id, success: false, error: updateError.message };
      }

      return { id: assistant.id, success: true };
    });

    const results = await Promise.all(updatePromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success);

    console.log(`Updated ${successful}/${assistants.length} assistants with honesty rules`);
    
    if (failed.length > 0) {
      console.error("Some updates failed:", failed);
    }

    return { 
      success: true, 
      updated: successful, 
      total: assistants.length,
      failed: failed.length,
      failures: failed
    };
  } catch (error: any) {
    console.error("Error in updateAllAssistantsWithHonestyRules:", error);
    return { success: false, error: error.message };
  }
}