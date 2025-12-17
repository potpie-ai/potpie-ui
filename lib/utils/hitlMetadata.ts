/**
 * Utility functions for parsing HITL metadata from chat messages
 */

export interface HITLMetadata {
  hitl_request_id: string;
  hitl_execution_id: string;
  hitl_node_id: string;
  hitl_node_type: "approval" | "input";
  hitl_iteration: number;
  hitl_timeout_at: string;
  hitl_fields?: Array<{
    name: string;
    type: string;
    required?: boolean;
    options?: string[];
  }>;
  hitl_approvers?: string[];
  hitl_assignee?: string;
  hitl_timeout_action?: string;
  hitl_loop_back_node_id?: string;
  hitl_loop_back_condition?: string;
}

/**
 * Parses HITL metadata from message text
 * Looks for HTML comment: <!-- HITL_METADATA: {...} -->
 */
export function parseHITLMetadata(messageText: string): HITLMetadata | null {
  if (!messageText) return null;

  // Look for HITL_METADATA in HTML comment
  // Try multiple regex patterns to handle different formatting
  const patterns = [
    // Most specific: match the exact format with balanced braces (non-greedy, dotall)
    /<!--\s*HITL_METADATA:\s*(\{(?:[^{}]|(?:\{[^{}]*\}))*\})\s*-->/gs,
    // Standard format with any whitespace (non-greedy, dotall)
    /<!--\s*HITL_METADATA:\s*({[\s\S]*?})\s*-->/gs,
    // Greedy match for multi-line (dotall)
    /<!--\s*HITL_METADATA:\s*({[\s\S]*})-->/gs,
    // No spaces around comment (dotall)
    /<!--HITL_METADATA:\s*({[\s\S]*?})-->/gs,
    // More flexible - match before --> (dotall)
    /HITL_METADATA:\s*({[\s\S]*?})(?=\s*-->)/gs,
  ];

  for (const regex of patterns) {
    // Reset regex lastIndex for global patterns
    if (regex.global) {
      regex.lastIndex = 0;
    }
    const match = messageText.match(regex);
    if (match && match[1]) {
      try {
        // Clean up the JSON string (remove any trailing whitespace or characters)
        let jsonStr = match[1].trim();
        // Ensure it's valid JSON by finding the matching closing brace
        const openBraces = (jsonStr.match(/{/g) || []).length;
        const closeBraces = (jsonStr.match(/}/g) || []).length;
        if (openBraces > closeBraces) {
          // Find the last closing brace
          const lastBraceIndex = jsonStr.lastIndexOf('}');
          if (lastBraceIndex > 0) {
            jsonStr = jsonStr.substring(0, lastBraceIndex + 1);
          }
        }
        const metadata = JSON.parse(jsonStr);
        console.log("✅ [HITL] Parsed metadata successfully:", metadata);
        return metadata as HITLMetadata;
      } catch (error) {
        console.warn("⚠️ [HITL] Error parsing JSON from match:", error, "Match preview:", match[1]?.substring(0, 150));
        // Continue to next pattern
      }
    }
  }

  // Debug: log if we're looking at a message that might contain HITL metadata
  if (messageText.includes("HITL_METADATA") || messageText.includes("hitl_request_id")) {
    const hitlIndex = messageText.indexOf("HITL_METADATA");
    // Get a larger snippet to ensure we capture the full JSON
    const preview = messageText.substring(
      Math.max(0, hitlIndex - 20), 
      Math.min(messageText.length, hitlIndex + 3000)
    );
    console.warn("⚠️ [HITL] HITL metadata found in text but regex didn't match. Preview length:", preview.length);
    
    // Try to manually extract JSON with better brace matching
    const jsonStart = preview.indexOf('{');
    if (jsonStart > 0) {
      // Find the matching closing brace by counting braces
      let braceCount = 0;
      let jsonEnd = -1;
      for (let i = jsonStart; i < preview.length; i++) {
        if (preview[i] === '{') braceCount++;
        if (preview[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            jsonEnd = i;
            break;
          }
        }
      }
      
      if (jsonEnd > jsonStart) {
        try {
          const manualJson = preview.substring(jsonStart, jsonEnd + 1);
          const metadata = JSON.parse(manualJson);
          if (metadata.hitl_request_id && metadata.hitl_execution_id) {
            console.log("✅ [HITL] Manually extracted and parsed metadata:", metadata);
            return metadata as HITLMetadata;
          }
        } catch (e) {
          console.warn("⚠️ [HITL] Manual extraction also failed:", e);
          console.warn("⚠️ [HITL] JSON preview:", preview.substring(jsonStart, Math.min(jsonStart + 200, jsonEnd + 1)));
        }
      }
    }
  }

  return null;
}

/**
 * Removes HITL metadata from message text for display
 */
export function removeHITLMetadata(messageText: string): string {
  if (!messageText) return messageText;

  // Remove the HTML comment containing HITL metadata
  const regex = /<!--\s*HITL_METADATA:\s*{[\s\S]*?}\s*-->/g;
  return messageText.replace(regex, "").trim();
}

